const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:950}});
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
console.log(await p.evaluate(()=>{
  const c=document.querySelector('#list .pcard');
  const tag=c.querySelector('.rtag');
  return {rtagHTML: tag? tag.innerHTML.slice(0,320):'なし',
    dtagCount: document.querySelectorAll('#list .dtag').length,
    classes:[...new Set([...c.querySelectorAll('.rtag *')].map(x=>x.className))].slice(0,10)};
}));
await b.close();})();
