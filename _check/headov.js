try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/_land.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard'), h=c.querySelector('.rhead');
    const g=e=>{const b=e.getBoundingClientRect();return[Math.round(b.left),Math.round(b.right)];};
    const kids=[...h.children].map(e=>({c:e.className,x:g(e)}));
    const inner=[...h.querySelectorAll('*')].filter(e=>e.offsetWidth).map(e=>({c:e.className,x:g(e)}));
    return {kids, prog:g(h.querySelector('.prog')), pv:g(h.querySelector('.pv')), plbl:g(h.querySelector('.plbl'))};
  }),null,1));
  await b.close();
})();
