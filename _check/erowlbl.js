/* 図面・積算「積算・設定」パネルの項目名（.erow label）が、1文字だけ次の行に落ちたり、枠からはみ出したりしていないか（スマホたて・よこ・PC）。§578
   使い方: node _check/erowlbl.js [ファイル]（直す前の版では スマホで「初期値 立上り高さ」が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [w,h,ph,n] of [[393,852,1,'たて'],[852,393,1,'よこ'],[1440,900,0,'PC']]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph});
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
 await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(500);
 await p.evaluate(()=>{const b=document.getElementById('nnSideBtn'); if(b&&b.offsetParent) b.click();}); await p.waitForTimeout(900);
 const r=await p.evaluate(()=>{
  const bad=[];
  document.querySelectorAll('.erow label').forEach(l=>{
   if(!l.offsetParent) return; const t=l.textContent.trim(); if(!t) return;
   const rg=document.createRange(); rg.selectNodeContents(l); const rs=[...rg.getClientRects()].filter(q=>q.width>1);
   const lines=[]; rs.forEach(q=>{const L=lines.find(x=>Math.abs(x.top-q.top)<q.height*0.5); if(L)L.w+=q.width; else lines.push({top:q.top,w:q.width,h:q.height});});
   const fs=parseFloat(getComputedStyle(l).fontSize);
   const orphan=lines.length>=2 && lines.some(x=>x.w<fs*1.5);              /* 1文字だけの行 */
   const over=l.scrollWidth>l.clientWidth+1;                                /* 枠からはみ出し */
   if(orphan||over) bad.push(t+(orphan?'（1文字落ち）':'')+(over?'（はみ出し）':''));
  });
  return {n:document.querySelectorAll('.erow label').length, bad};
 });
 if(r.bad.length)NG++;
 console.log((r.bad.length?'★NG ':'○ ')+n+' 項目名'+r.n+'個 '+(r.bad.join('・')||'崩れなし'));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
