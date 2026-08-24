const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>{
    const c={}; props.forEach(x=>{ const k=x.maker||'—'; c[k]=(c[k]||0)+1; });
    const s={}; props.forEach(x=>{ const k=x.sozai||'—'; s[k]=(s[k]||0)+1; });
    return {makers:c, sozai:s};
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})();
