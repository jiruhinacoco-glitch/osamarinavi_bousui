const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  p.on('console',m=>console.log('[browser]',m.text()));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(2000);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const l=document.getElementById('list');
    let sc=null; for(let n=l.parentElement;n&&n!==document.body;n=n.parentElement){
      const ov=getComputedStyle(n).overflowY; if(ov==='auto'||ov==='scroll'){sc=n;break;}}
    const cs=[...document.querySelectorAll('#list .pcard')];
    return {root: sc?(sc.tagName+'#'+sc.id+'.'+sc.className):'なし(ページ全体)',
      listOverflow:getComputedStyle(l).overflowY,
      innerH:innerHeight, docEl:document.documentElement.clientHeight,
      off:cs.filter(c=>c.classList.contains('nnoff')).length, all:cs.length,
      tops:cs.slice(8,16).map(c=>Math.round(c.getBoundingClientRect().top)),
      scH: sc? sc.clientHeight : null};
  }),null,1));
  await b.close();
})();
