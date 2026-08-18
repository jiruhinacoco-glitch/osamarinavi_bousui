const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/_land.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const g=e=>{const b=e.getBoundingClientRect();return e?[Math.round(b.left),Math.round(b.right),Math.round(b.top),Math.round(b.width)]:null;};
    const q=s=>c.querySelector(s);
    const o={};
    ['.pmain','.pleft','.pshots','.pdocs','.pshgrid','.pshmore'].forEach(s=>{const e=q(s); o[s]=e?g(e):null;});
    o.pshotsScroll=q('.pshots')?q('.pshots').scrollWidth:0;
    o.pshgridScroll=q('.pshgrid')?q('.pshgrid').scrollWidth:0;
    o.pshFlex=getComputedStyle(q('.psh')).flex;
    o.pshotsFlex=getComputedStyle(q('.pshots')).flex;
    o.pdocsFlex=getComputedStyle(q('.pdocs')).flex;
    return o;
  }),null,0));
  await b.close();
})();
