/* 現場記録帳ダッシュボード「施工中の現場」：どの並び順でも、物件名の列が押しつぶされて2文字ずつ縦に崩れないか（防水仕様が複数の行）。§579
   使い方: node _check/sekoucol.js [ファイル]（直す前の版では 物件で並べ替えると★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'kirokucho_demo.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [w,h,ph,n] of [[393,852,1,'たて'],[852,393,1,'よこ'],[1440,900,0,'PC']]){
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph});
 const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss());
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1800);
 for(const key of ['(最初)','bukken','spec','area']){
  if(key!=='(最初)'){ await p.evaluate(k=>{try{dashSortSet('sekou',k)}catch(e){}},key); await p.waitForTimeout(700); }
  const r=await p.evaluate(()=>{
   const tb=document.querySelector('#dashboard .sekou-tbl'); if(!tb||!tb.offsetParent) return {none:1};
   const hd=tb.rows[0]; const bi=[...hd.cells].findIndex(c=>/^物件/.test(c.textContent.trim())), si=[...hd.cells].findIndex(c=>/^防水仕様/.test(c.textContent.trim()));
   const bw=Math.round(hd.cells[bi].getBoundingClientRect().width), sw=si>=0?Math.round(hd.cells[si].getBoundingClientRect().width):0;
   /* 物件名（太字）の1行に入っている文字数のいちばん少ない行 */
   let minPer=99; [...tb.querySelectorAll('td.bk b')].forEach(e=>{const rg=document.createRange(); rg.selectNodeContents(e); const rs=[...rg.getClientRects()]; if(rs.length<2) return; const fs=parseFloat(getComputedStyle(e).fontSize); minPer=Math.min(minPer, Math.max(...rs.map(q=>q.width))/fs);});
   /* 札が自分のマスの外へ出ていないか */
   let out=0; tb.querySelectorAll('td .badge').forEach(bg=>{const td=bg.closest('td').getBoundingClientRect(), q=bg.getBoundingClientRect(); if(q.right>td.right+1) out++;});
   return {bw,sw,minPer:+minPer.toFixed(1),out};
  });
  if(r.none){console.log('－ '+n+' '+key+' 表なし');continue;}
  const ok=r.minPer>=4 && r.out===0; if(!ok)NG++;
  console.log((ok?'○ ':'★NG ')+n+' 並び'+key+' 物件列'+r.bw+'px 防水仕様列'+r.sw+'px 物件名の1行≈'+r.minPer+'字 はみ出た札'+r.out);
 }
 await ctx.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
