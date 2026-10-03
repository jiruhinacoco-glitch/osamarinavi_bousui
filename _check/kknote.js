/* 国交省仕様：表の「備考」の札（換算計算・立上り読替・概要収録など）が、札の中で折れて縦に崩れていないか
   ＋表が枠より広くなって備考が見えなくなっていないか（2026-09-23aj の再発防止）。スマホたて・よこ・PC。§577
   使い方: node _check/kknote.js [ファイル]（直す前の版では スマホで★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'kokkosho.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [w,h,ph,n] of [[393,852,1,'たて'],[852,393,1,'よこ'],[1440,900,0,'PC']]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph});
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{
   const pills=[...document.querySelectorAll('.sp-tbl td.c-note .pill')].filter(e=>e.offsetParent);
   /* 札の中で折れた＝札の行数が2以上（行の矩形が2つ以上） */
   const broken=pills.filter(e=>{const rs=[...e.getClientRects()]; const one=e.getBoundingClientRect(); return rs.length>1 || one.height>parseFloat(getComputedStyle(e).fontSize)*2.2;}).map(e=>e.textContent.trim());
   /* 表が入れ物より広くて備考が枠の外に出ていないか */
   const out=[...document.querySelectorAll('.sp-tbl')].filter(t=>t.offsetParent).filter(t=>{const c=t.parentElement; return t.getBoundingClientRect().right>c.getBoundingClientRect().right+2 && !/auto|scroll/.test(getComputedStyle(c).overflowX);}).length;
   return {n:pills.length, broken:[...new Set(broken)], out};
 });
 const ok=r.n>0&&!r.broken.length&&!r.out; if(!ok)NG++;
 console.log((ok?'○ ':'★NG ')+n+' 札'+r.n+'個 折れ:'+(r.broken.join('・')||'なし')+' 枠からはみ出した表:'+r.out);
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
