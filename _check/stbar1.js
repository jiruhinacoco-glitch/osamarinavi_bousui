const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/_land.html',{waitUntil:'load'});
  await p.waitForTimeout(1700);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const sb=document.querySelector('.stbar');
    const r=sb.getBoundingClientRect();
    const kids=[...sb.children].map(c=>{const b2=c.getBoundingClientRect();
      return {cls:c.className.split(' ')[0], w:Math.round(b2.width), l:Math.round(b2.left), t:Math.round(b2.top),
        txt:(c.textContent||'').trim().slice(0,12)};});
    const rng=sb.querySelector('.rng');
    const rk=rng?[...rng.children].map(c=>{const b2=c.getBoundingClientRect();
      return {tag:c.tagName, w:Math.round(b2.width), txt:(c.textContent||'').trim().slice(0,8)};}):null;
    const cs=getComputedStyle(sb);
    return {barW:Math.round(r.width), barH:Math.round(r.height), pad:cs.paddingLeft+'/'+cs.paddingRight,
      gap:cs.gap, wrap:cs.flexWrap, kids, rng:rk, rngML:rng?getComputedStyle(rng).marginLeft:null,
      sum:kids.reduce((a,k)=>a+k.w,0)};
  }),null,1));
  await p.screenshot({path:'stbar_before.png'});
  await b.close();
})();
