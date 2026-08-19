/* 標準納まり詳細図（2026-08-19d）：役物の形・寸法の作法・ハッチ・拡大詳細 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500);

ok(await p.evaluate(()=>!!document.getElementById('nnDetBtn')),'積算・設定に「標準納まり詳細図」のボタンがある');
ok(await p.evaluate(()=>!!(window.nnSheetKit&&nnSheetKit.mk&&nnSheetKit.openSheet)),'図面の部品（用紙・図枠）が共有されている');

for(const [kind,name] of [['osae','押え金物'],['kasagi','アルミ笠木'],['sheet','シート端末']]){
  const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(k=>nnDetailPDF(k,{}),kind)]);
  await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(600);
  const r=await pop.evaluate(()=>{
    const svg=document.querySelector('svg');
    const t=[...svg.querySelectorAll('text')].map(e=>e.textContent);
    const pat=[...svg.querySelectorAll('pattern')].map(e=>e.id);
    const fills=[...svg.querySelectorAll('[fill^="url(#h"]')].map(e=>e.getAttribute('fill'));
    return {txt:t, pat:pat, fills:[...new Set(fills)],
      dots:svg.querySelectorAll('circle[r="0.5"]').length,
      paths:svg.querySelectorAll('path').length,
      w:svg.getAttribute('width'), h:svg.getAttribute('height')};
  });
  const T=r.txt.join('|');
  ok(r.w==='420mm'&&r.h==='297mm', name+'：A3よこの実寸で出る',{w:r.w,h:r.h});
  ok(r.pat.length>=5, name+'：材料ごとのハッチングが5種以上ある', r.pat);
  ok(r.fills.length>=4, name+'：実際に4種以上使い分けている', r.fills);
  ok(r.dots>=16, name+'：寸法の端が●（16個以上）', r.dots);
  ok(/\(\d+\)/.test(T), name+'：括弧付きの参考寸法がある', (T.match(/\(\d+\)/g)||[]).slice(0,6));
  ok(/H/.test(T)&&/水上300以上/.test(T), name+'：記号寸法 H（水上300以上）がある');
  ok(/端末部/.test(T)&&/S=1\/2/.test(T), name+'：端末部の拡大詳細（S=1/2）が入る');
  ok(/注1/.test(T)&&/注4/.test(T), name+'：注記が入る');
  ok(r.paths>=20, name+'：図形が描かれている（path 20以上）', r.paths);
  await pop.close();
}
/* 寸法の数値が「実物のmm」であること（紙のmmになっていないか） */
const [pop2]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>nnDetailPDF('osae',{H:500,tw:200,cant:70,ins:50}))]);
await pop2.waitForLoadState('domcontentloaded'); await pop2.waitForTimeout(600);
const T2=await pop2.evaluate(()=>[...document.querySelectorAll('svg text')].map(e=>e.textContent).join('|'));
ok(/(^|\|)500(\||$)/.test(T2),'H=500 が実物の mm で出る（1/5 の 100 になっていない）');
ok(/\(200\)/.test(T2),'躯体の厚み 200 が参考寸法で出る');
ok(/\(70\)/.test(T2)&&/\(50\)/.test(T2),'キャント70・断熱50 が出る');
await pop2.close();
ok(errs.length===0,'JSエラーなし',errs);
await b.close(); process.exit(ng?1:0);
})();
