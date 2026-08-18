const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1700);
  await p.evaluate(()=>openModal()); await p.waitForTimeout(500);
  const el=await p.$('.modal'); await el.screenshot({path:'form_new.png'});
  await b.close(); console.log('saved');
})();
