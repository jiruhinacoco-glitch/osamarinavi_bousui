try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/_land.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1500);
  const el=await p.$('#list .pcard .pshots');
  await el.screenshot({path:'strip.png'});
  console.log(JSON.stringify(await p.evaluate(()=>{
    const s=document.querySelector('#list .pcard .pshots');
    return {html:s.outerHTML.slice(0,900), txt:JSON.stringify(s.innerText)};
  }),null,1));
  await b.close();
})();
