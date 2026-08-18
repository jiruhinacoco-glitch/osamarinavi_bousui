const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const list=document.getElementById('list');
    const cs=getComputedStyle(list);
    const cards=[...document.querySelectorAll('#list .pcard')];
    const h=i=>Math.round(cards[i].getBoundingClientRect().height);
    return {display:cs.display, dir:cs.flexDirection, overflow:cs.overflowY,
      listH:Math.round(list.getBoundingClientRect().height), scrollH:list.scrollHeight,
      card0:h(0), card1:h(1), card5:h(5), card50:h(50), card99:h(99),
      bodyScroll:document.scrollingElement.scrollHeight};
  }),null,1));
  await b.close();
})();
