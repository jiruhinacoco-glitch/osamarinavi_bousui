const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/_land.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const boxes=[...document.querySelectorAll('#toolbar *')].filter(e=>{const s=getComputedStyle(e);
      return /auto|scroll/.test(s.overflowX+s.overflowY);});
    return boxes.slice(0,4).map(e=>({tag:e.tagName,cls:String(e.className).slice(0,40),
      ovx:getComputedStyle(e).overflowX,ovy:getComputedStyle(e).overflowY}));
  }),null,1));
  await b.close();
})();
