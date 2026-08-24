const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const D=__dirname+'/';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://127.0.0.1:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>showView('dash')); await p.waitForTimeout(1500);
  const a=await p.$('.apw');
  if(a){const par=await p.evaluateHandle(e=>e.closest('.alert-row')||e.parentElement,a);
    await par.asElement().scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    await par.asElement().screenshot({path:D+'s_apw.png'});}
  else console.log('apw なし');
  await p.evaluate(()=>showView('jisha')); await p.waitForTimeout(1600);
  const w=await p.$('.pw2');
  if(w){const par=await p.evaluateHandle(e=>e.closest('tr')||e.parentElement,w);
    await par.asElement().scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    await par.asElement().screenshot({path:D+'s_pw2.png'});}
  else console.log('pw2 なし');
  await b.close(); console.log('done');
})();
