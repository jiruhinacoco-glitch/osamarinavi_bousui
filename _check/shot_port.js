const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1500);
  await p.screenshot({path:'port_full.png'});
  /* 3枚目までのカードを個別に */
  const cs=await p.$$('#list .pcard');
  for(let i=0;i<3;i++) await cs[i].screenshot({path:'port_card'+(i+1)+'.png'});
  console.log(JSON.stringify(await p.evaluate(()=>{
    const out=[];
    [...document.querySelectorAll('#list .pcard')].slice(0,4).forEach(c=>{
      const g=e=>{const b=e.getBoundingClientRect();return[Math.round(b.left),Math.round(b.right),Math.round(b.top)];};
      const kids=[...c.querySelector('.pmain').children].map(e=>({c:e.className.split(' ')[0],x:g(e)}));
      out.push({name:c.querySelector('.ebox.ttl').textContent.slice(0,10), kids,
        pphW:Math.round(c.querySelector('.pph').getBoundingClientRect().width),
        pphH:Math.round(c.querySelector('.pph').getBoundingClientRect().height),
        pshW:Math.round(c.querySelector('.psh').getBoundingClientRect().width),
        pshH:Math.round(c.querySelector('.psh').getBoundingClientRect().height)});
    });
    return out;
  }),null,1));
  await b.close();
})();
