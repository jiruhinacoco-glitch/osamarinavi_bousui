/* 見積書の数字を独立に検算する（表示の数量×単価が金額と一致するか） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500);
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();}); await p.waitForTimeout(900);
await p.evaluate(()=>{ nnStamp('dakki'); nnPlaceAtGrid(6,8); });
await p.evaluate(()=>nnMitsuOpen()); await p.waitForTimeout(300);
const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>document.getElementById('nm_go').click())]);
await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(700);
const r=await pop.evaluate(()=>{
  const num=s=>+String(s).replace(/[^\d.]/g,'');
  const rows=[...document.querySelectorAll('.paper')[0].querySelectorAll('table tr')]
    .map(tr=>[...tr.cells].map(c=>c.textContent.trim()));
  let ok=true, det=[], sub=0, subShown=0, keihiShown=0, zeiShown=0, taxShown=0, totShown=0;
  rows.forEach(cells=>{
    if(cells.length===6 && /^\d+$/.test(cells[0])){
      const q=num(cells[2]), price=num(cells[4]), amt=num(cells[5]);
      const calc=Math.round(q*price);
      if(calc!==amt){ ok=false; det.push(cells[1]+': '+q+'×'+price+'='+calc+' ≠ '+amt); }
      sub+=amt;
    }
    const label=cells.length>=2?cells[cells.length-2]:'';
    const v=cells.length>=2?num(cells[cells.length-1]):0;
    if(/小　計/.test(label)) subShown=v;
    if(/諸経費/.test(label)) keihiShown=v;
    if(/税抜合計/.test(label)) zeiShown=v;
    if(/消費税/.test(label)) taxShown=v;
    if(/御見積合計/.test(label)) totShown=v;
  });
  if(sub!==subShown){ ok=false; det.push('小計 '+sub+'≠'+subShown); }
  if(Math.round(subShown*0.05)!==keihiShown){ ok=false; det.push('諸経費'); }
  if(subShown+keihiShown!==zeiShown){ ok=false; det.push('税抜'); }
  if(Math.round(zeiShown*0.10)!==taxShown){ ok=false; det.push('消費税'); }
  if(zeiShown+taxShown!==totShown){ ok=false; det.push('合計'); }
  /* 根拠書：立上りの内訳の合計が明細の立上り数量（±0.1＝丸め差）と合うか */
  const t2=document.querySelectorAll('.paper')[1].textContent;
  let tSum=0; (t2.match(/＝ [\d.]+㎡/g)||[]).forEach(m=>{}); 
  const hs=[...t2.matchAll(/H\d+：([\d.]+)m × ([\d.]+)m ＝ ([\d.]+)㎡/g)];
  hs.forEach(m=>{ tSum+=+m[3];
    if(Math.abs((+m[1])*(+m[2])-(+m[3]))>0.06){ ok=false; det.push('根拠の掛け算 '+m[0]); } });
  const tachiRow=rows.find(c=>c[1]==='立上り防水');
  if(tachiRow && Math.abs(tSum-num(tachiRow[2]))>0.25){ ok=false; det.push('根拠の合計 '+tSum.toFixed(1)+' ≠ 明細 '+tachiRow[2]); }
  return {ok, det, sub, totShown};
});
console.log((r.ok?'○':'★NG')+' 見積書の検算（数量×単価・小計・諸経費・税・合計・根拠の掛け算）', JSON.stringify(r.det), '合計', r.totShown);
await b.close(); process.exit(r.ok?0:1);
})();
