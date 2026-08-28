const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:900}});
  const reqs=[]; p.on('request',r=>{ if(/frame_panel/.test(r.url())) reqs.push(r.url().split('/').pop()); });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  const d=await p.evaluate(()=>({
    cls:document.documentElement.classList.contains('nnhasframe'),
    v:getComputedStyle(document.documentElement).getPropertyValue('--nnframe').trim(),
    bi:getComputedStyle(document.querySelector('#dashboard .dpanel')).borderImageSource.slice(0,90),
    ver:typeof NN_VER!=='undefined'?NN_VER:'?'}));
  console.log('読みに行ったURL:',reqs);
  console.log('NN_VER=',d.ver,' クラス付与=',d.cls);
  console.log('--nnframe=',d.v);
  console.log('実際に使われている絵=',d.bi);
  console.log('JSエラー',errs.length?errs:'なし');
  console.log(reqs.length===1 && reqs[0].includes('?v=2026-08-11q') && d.cls && /2026-08-11q/.test(d.bi) ? '○ 版名つきで読めている' : '★NG');
  await b.close();
})();
