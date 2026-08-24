const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:3});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2600);
  await p.evaluate(()=>{ showView('list'); }); await p.waitForTimeout(900);
  /* 新しい絵が付いたカードを探して撮る */
  const box=await p.evaluate(()=>{
    const im=[...document.querySelectorAll('img[src*="def_shokubutsu"]')].find(i=>i.naturalWidth>0);
    const card=im&&im.closest('.card, .row, li, .item, div[onclick]');
    if(!card) return null; card.scrollIntoView({block:'center'});
    return true;
  });
  await p.waitForTimeout(500);
  const im=await p.$('img[src*="def_shokubutsu"]');
  if(im){ const card=await im.evaluateHandle(e=>e.closest('.card')||e.closest('div[onclick]')||e.parentElement.parentElement);
    await card.asElement().screenshot({path:'ico_card.png'}); }
  console.log('ok', box);
  await b.close();
})();
