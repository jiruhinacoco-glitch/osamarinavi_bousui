const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2600);
  /* ①歩掛の見出し */
  const h=await p.evaluate(()=>{
    const el=[...document.querySelectorAll('.httl')].find(x=>x.textContent.includes('歩掛'));
    if(!el) return null; el.scrollIntoView({block:'center'});
    const im=el.querySelector('img.hpic');
    return {txt:el.textContent.trim(), img:!!im, ok:im?im.naturalWidth>0:false};
  });
  console.log('歩掛の見出し:', JSON.stringify(h));
  await p.waitForTimeout(400);
  const el=await p.$('.httl:has(img[src*="bugakari"])');
  if(el) await el.screenshot({path:'ico_bugakari.png'});
  /* ②不具合タグ（詳細を開く） */
  await p.evaluate(()=>{ showView('list'); });
  await p.waitForTimeout(900);
  const d=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll('img[src*="def_"]')];
    return {n:imgs.length, ok:imgs.filter(i=>i.naturalWidth>0).map(i=>i.getAttribute('src').split('/').pop())};
  });
  console.log('不具合アイコン:', JSON.stringify(d));
  console.log('errs:', errs.join('|')||'none');
  await b.close();
})();
