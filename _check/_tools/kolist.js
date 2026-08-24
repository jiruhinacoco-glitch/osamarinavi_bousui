const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const c={}; props.forEach(x=>{ const k=x.kouhou||'—'; c[k]=(c[k]||0)+1; });
    return {inUse:c, master:Object.keys(KO_MASTER||{})};
  }),null,1));
  await b.close();
})();
