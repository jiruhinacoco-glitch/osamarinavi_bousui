const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  await p.evaluate(()=>{const t=props.find(x=>(x.defects||[]).length>=3); goProperty(t.id);});
  await p.waitForTimeout(1000);
  const d=await p.evaluate(()=>({cards:document.querySelectorAll('.nndefpanel .dpc').length,
    w:Math.round(document.querySelector('.nndefpanel').getBoundingClientRect().width),
    back:document.querySelectorAll('.back-list').length,
    ov:document.documentElement.scrollWidth-innerWidth}));
  console.log('スマホ:',JSON.stringify(d),'JSエラー',errs.length?errs:'なし');
  const el=await p.$('.dhead'); if(el) await el.screenshot({path:'dhead_mo.png'});
  await b.close();
})();
