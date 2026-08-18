const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1700);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard'), Z=window.nnPZ||1;
    const H=e=>e?Math.round(e.getBoundingClientRect().height/Z):null;
    const pb=c.querySelector('.pbd'), cs=getComputedStyle(pb);
    const cl=c.querySelector('.pcol'), cls=getComputedStyle(cl);
    return {card:H(c), pbd:H(pb), pbdPad:cs.padding, pbdGap:cs.gap,
      rhead:H(c.querySelector('.rhead')), r1:H(c.querySelector('.r1')), r2:H(c.querySelector('.r2')),
      r3:H(c.querySelector('.r3')), rtag:H(c.querySelector('.rtag')), shots:H(c.querySelector('.pshots')),
      col:H(cl), colGap:cls.gap, colMargin:cls.margin, ph:H(c.querySelector('.pph')),
      pexist:H(c.querySelector('.pexist')), ebox:H(c.querySelector('.pexist .ebox')),
      pmain:H(c.querySelector('.pmain')), pleftGap:getComputedStyle(c.querySelector('.pleft')).gap};
  }),null,1));
  await b.close();
})();
