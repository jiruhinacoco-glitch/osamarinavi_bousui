const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'pc';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage(M==='pc'?{viewport:{width:2000,height:1010}}
    :{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  if(M!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/'+(M==='pc'?'kirokucho_demo.html':'_land.html')); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
  console.log(M, JSON.stringify(await p.evaluate(()=>{
    const Z=window.nnPZ||1, c=document.querySelector('#list .pcard'), o={};
    const h=e=>e?Math.round(e.getBoundingClientRect().height/Z):null;
    ['.rhead','.rsub','.r1','.r2','.r3','.rtag','.pmain','.pcol','.pbd','.pshots','.pdocs'].forEach(s=>o[s]=h(c.querySelector(s)));
    o.card=h(c); o.progDir=getComputedStyle(c.querySelector('.rsub .pprog')).flexDirection;
    o.progH=h(c.querySelector('.rsub .pprog'));
    return o;})));
  await b.close();
})();
