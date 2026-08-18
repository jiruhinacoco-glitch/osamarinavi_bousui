const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const c={}, h={}, f={};
    props.forEach(x=>{ c[x.spec||'—']=(c[x.spec||'—']||0)+1; h[x.hou||'—']=(h[x.hou||'—']||0)+1;
      f[x.files.filter(z=>z.cat==='photo').length]=(f[x.files.filter(z=>z.cat==='photo').length]||0)+1; });
    return {spec:c, hou:h, photoCounts:f};
  }),null,1));
  await b.close();
})();
