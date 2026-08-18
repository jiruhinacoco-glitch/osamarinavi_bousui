const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1600);
  await p.evaluate(()=>{ showView('list'); });
  await p.waitForTimeout(700);
  const el=await p.$('#list .pcard');
  await el.screenshot({path:'kai1_card.png'});
  await p.screenshot({path:'kai1_full.png'});
  await b.close(); console.log('saved');
})();
