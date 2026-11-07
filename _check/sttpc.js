/* §1063 現場記録帳ダッシュボード「ステータス分布」（PC・目次→中身の選択表示）：円グラフが大きく、表は中身の幅か（2026-11-07f）
   本人「円グラフをもっと大きく視認性を上げて、その分 表の件数・見積金額などの無駄な余白は詰めて」。
   ①PC1400：円グラフの幅≧300px（直す前は180px）／表の幅≦700px（直す前は枠いっぱい845px）／円グラフは表の右（重ならない）
   ②PC1200：表の右の列が隠れない（表の右端≦置き場の右端）・円グラフは表の右・ページの横はみ出しなし
   ③PC2000：横はみ出しなし・円グラフは表の右
   使い方: node _check/sttpc.js [kirokucho_demo.html]   ※直す前の版（_before.html）は ① が★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{const b=await chromium.launch();
 for(const W of [1400,1200,2000]){
  const ctx=await b.newContext({viewport:{width:W,height:900},serviceWorkers:'block'}); await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','dash');});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2500);
  await p.evaluate(()=>document.querySelector('#dashboard .nn-dnav button[data-k="stt"]').click());
  await p.waitForFunction(()=>{const s=document.querySelector('#dashboard .nn-dsel');return s&&s.dataset.panelId==='stt'&&s.querySelector('svg');},null,{timeout:5000});
  const m=await p.evaluate(()=>{const sel=document.querySelector('#dashboard .nn-dsel');const tbl=sel.querySelector('table.st-tbl'),svg=sel.querySelector('svg'),side=tbl.parentElement;
    const r=e=>{const q=e.getBoundingClientRect();return {l:q.left,r:q.right,w:q.width};};
    return {tbl:r(tbl),side:r(side),svg:r(svg),ovf:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
  const nm='PC'+W;
  if(W===1400){ ok(nm+'：円グラフの幅≧300px', m.svg.w>=300, Math.round(m.svg.w)+'px'); ok(nm+'：表は中身の幅（≦700px）', m.tbl.w<=700, Math.round(m.tbl.w)+'px'); }
  ok(nm+'：表の右の列が隠れない（表の右端≦置き場の右端）', m.tbl.r<=m.side.r+1, Math.round(m.tbl.r)+' / '+Math.round(m.side.r));
  ok(nm+'：円グラフは表の右で重ならない・横はみ出しなし', m.svg.l>=m.tbl.r-1 && m.ovf<=0, JSON.stringify({svgL:Math.round(m.svg.l),tblR:Math.round(m.tbl.r),ovf:m.ovf}));
  ok(nm+'：JSエラーなし', !errs.length, errs.join(' '));
  await ctx.close(); }
 await b.close(); R.forEach(x=>console.log(x)); const ng=R.filter(x=>x.startsWith('★NG')).length; console.log(ng?'★NG '+ng+'件':'全部○');})();
