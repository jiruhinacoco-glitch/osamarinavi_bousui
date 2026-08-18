const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:2000,height:1010}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1700);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);
  const t=await p.$('#viewtabs'); await t.screenshot({path:'tabs_now.png'});
  console.log(JSON.stringify(await p.evaluate(()=>{
    const Z=window.nnPZ||1, btn=document.querySelector('#viewtabs button');
    const r=btn.getBoundingClientRect(); const cs=getComputedStyle(btn);
    const rng=document.createRange(); rng.selectNodeContents(btn);
    const tr=rng.getBoundingClientRect();
    return {btn:Math.round(r.width/Z)+'x'+Math.round(r.height/Z), font:cs.fontSize, pad:cs.padding,
      textW:Math.round(tr.width/Z), sideGap:Math.round((r.width-tr.width)/2/Z),
      tabsRight:Math.round([...document.querySelectorAll('#viewtabs button')].pop().getBoundingClientRect().right/Z),
      vw:Math.round(innerWidth/Z)};
  })));
  await b.close();
})();
