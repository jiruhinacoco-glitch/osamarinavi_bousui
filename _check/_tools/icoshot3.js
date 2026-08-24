const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1400,height:950},deviceScaleFactor:3});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2600);
  await p.evaluate(()=>{ showView('list'); }); await p.waitForTimeout(1000);
  const info=await p.evaluate(()=>{
    const im=[...document.querySelectorAll('img[src*="def_"]')].find(i=>i.naturalWidth>0);
    if(!im) return 'なし';
    let el=im, up=0;
    while(el && el.getBoundingClientRect().height<120 && up<8){ el=el.parentElement; up++; }
    el.scrollIntoView({block:'center'});
    el.setAttribute('data-shot','1');
    return el.className+' / 高さ'+Math.round(el.getBoundingClientRect().height);
  });
  console.log(info);
  await p.waitForTimeout(500);
  const t=await p.$('[data-shot="1"]');
  if(t) await t.screenshot({path:'ico_card.png'});
  /* 見出し（歩掛）も撮る */
  await p.evaluate(()=>{ showView('dash'); }); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ const e=[...document.querySelectorAll('.httl')].find(x=>x.textContent.includes('歩掛'));
    if(e){ e.scrollIntoView({block:'center'}); e.closest('h4').setAttribute('data-shot2','1'); } });
  await p.waitForTimeout(400);
  const h=await p.$('[data-shot2="1"]');
  if(h) await h.screenshot({path:'ico_bugakari.png'});
  await b.close();
})();
