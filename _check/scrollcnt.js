const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1500);
  const n=await p.evaluate(()=>[...document.querySelectorAll('#list *')].filter(e=>{
    const s=getComputedStyle(e); return /auto|scroll/.test(s.overflowX+s.overflowY);}).length);
  console.log((n===0?'○':'★NG')+' 一覧の中にスクロールする箱は '+n+' 個（iPhoneが落ちないよう0であること）');
  await b.close();
})();
