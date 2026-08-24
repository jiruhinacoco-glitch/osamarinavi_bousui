const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:1600,height:900}});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const i=document.getElementById('q'); i.value='三井アウトレット'; i.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(700);
  await p.locator('#list .pcard').first().screenshot({path:'fc_closed.png'});
  await p.click('#list .pcard .fcbtn'); await p.waitForTimeout(400);
  await p.locator('#list .pcard').first().screenshot({path:'fc_open3.png'});
  await p.click('#list .pcard .fcmore'); await p.waitForTimeout(400);
  await p.locator('#list .pcard').first().screenshot({path:'fc_all.png'});
  await b.close();
})();
