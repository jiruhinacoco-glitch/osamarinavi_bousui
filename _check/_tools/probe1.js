const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:2000,height:1010}});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const e=document.querySelector('#list .pcard .psh');
    const cs=getComputedStyle(e), r=e.getBoundingClientRect();
    const g=document.querySelector('#list .pcard .pshgrid'), gr=g.getBoundingClientRect();
    return {w:r.width,h:r.height,minH:cs.minHeight,ar:cs.aspectRatio,align:getComputedStyle(g).alignItems,
      gridH:gr.height, more:document.querySelector('#list .pcard .pshmore').getBoundingClientRect().height};
  })));
  await b.close();
})();
