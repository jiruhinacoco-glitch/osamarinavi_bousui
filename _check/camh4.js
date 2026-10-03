/* カメラ：見本の写真で「③ 防水材を選んでエッジに当てる」などの見出し（斜めの枠＋補足文）が、カードの右からはみ出していないか。§581
   使い方: node _check/camh4.js [ファイル]（直す前の版では スマホたてで★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [w,h,ph,n] of [[393,852,1,'たて'],[360,780,1,'たて360'],[852,393,1,'よこ'],[1440,900,0,'PC']]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph}); p.on('dialog',d=>d.dismiss());
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1300);
 await p.click('text=納まり資料作成').catch(()=>{}); await p.waitForTimeout(700);
 await p.click('text=見本の写真で試す').catch(()=>{}); await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{
  const out=[]; let seen=0;
  document.querySelectorAll('.panel > h4').forEach(h=>{ if(!h.offsetParent) return; seen++;
   const pr=h.closest('.panel').getBoundingClientRect();
   const parts=[...h.querySelectorAll('.httl,.s')].filter(e=>e.offsetParent);
   const over=parts.map(e=>{const q=e.getBoundingClientRect(); /* 斜めの枠（::before は skew で約 高さ×0.34 右へ出る）も含める */ const sk=e.classList.contains('httl')?q.height*0.35:0; return Math.round(q.right+sk-pr.right);}).filter(d=>d>1);
   if(over.length) out.push(h.textContent.trim().slice(0,14)+' 右へ'+Math.max(...over)+'px');
  });
  return {seen,out};
 });
 const ok=r.seen>0&&!r.out.length; if(!ok)NG++;
 console.log((ok?'○ ':'★NG ')+n+' 見出し'+r.seen+'個 '+(r.out.join('・')||'はみ出しなし'));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
