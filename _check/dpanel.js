const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  // 不具合タグが複数ある物件を開く
  const opened=await p.evaluate(()=>{
    const t=props.find(x=>(x.defects||[]).includes('fukure')) || props.find(x=>(x.defects||[]).length);
    goProperty(t.id);
    return {name:t.name, defects:t.defects};
  });
  await p.waitForTimeout(1000);
  const d=await p.evaluate(()=>{
    const a=document.querySelector('.nndefpanel');
    return {panel:!!a, cards:document.querySelectorAll('.nndefpanel .dpc').length,
      imgs:[...document.querySelectorAll('.nndefpanel img')].map(x=>({f:x.getAttribute('src').split('/').pop(),ok:x.naturalWidth>0})),
      back:document.querySelectorAll('.back-list').length,
      ov:document.documentElement.scrollWidth-innerWidth};
  });
  console.log('開いた物件:',JSON.stringify(opened));
  console.log(JSON.stringify(d),'JSエラー',errs.length?errs:'なし');
  const el=await p.$('.dhead'); if(el) await el.screenshot({path:'dhead.png'});
  await b.close();
})();
