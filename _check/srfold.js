/* B7：詳細の商流の図。概要タブでは開き、写真などのタブではたたまれてタブの中身が上に来る。押せば開閉でき、
   「商流を設定」で直すときはたたまない。使い方: node _check/srfold.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
const st=()=>p.evaluate(()=>{const v=document.querySelector('#detail .dhead > .nnSr .srv'); const bx=document.querySelector('#detail .dhead > .nnSr');
  /* ★2026-11-14zx 「タブがどれだけ上に来たか」は、タブの帯（上に貼り付く）ではなく、タブの中身の先頭（#tabbody）で測る。前は「人工」という字の部品を探していたが、タブの字は「人工情報」になり見つからなくなっていた */
  const tb=document.getElementById('tabbody');
  return {fig:!!(v&&v.offsetParent&&v.getBoundingClientRect().height>40), tabsY:tb?Math.round(tb.getBoundingClientRect().top):null, btn:!!(bx&&bx.querySelector('[data-srfold]'))};});
await p.evaluate(()=>{showView('list'); selectedId=props[0].id; openDetailFull(); setTab('概要');}); await p.waitForTimeout(500);
const a=await st(); ok('概要タブでは商流の図が見える', a.fig, a);
await p.evaluate(()=>setTab('写真')); await p.waitForTimeout(500);
const c=await st(); ok('写真タブでは図がたたまれ、タブの中身が80px以上上に来る', !c.fig&&a.tabsY-c.tabsY>=80, {a,c});
await p.evaluate(()=>document.querySelector('#detail [data-srfold]').click()); await p.waitForTimeout(300);
ok('「図を見る」を押すと開く', (await st()).fig);
await p.evaluate(()=>document.querySelector('#detail [data-srfold]').click()); await p.waitForTimeout(300);
ok('「たたむ」を押すとたたむ', !(await st()).fig);
await p.evaluate(()=>document.querySelector('#detail .dhead > .nnSr [data-sr="ed"]').click()); await p.waitForTimeout(400);
/* 直しているときは元の図の代わりに、直す窓の中の図（#nnSrDet .pv）が出る作り（たたんでいても見えること） */
const e=await p.evaluate(()=>{const v=document.querySelector('#nnSrDet .pv'); return !!(v&&v.offsetParent&&v.getBoundingClientRect().height>40);});
ok('たたんだまま商流を直しても、直す窓の図が見える', e);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
