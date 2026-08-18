const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const pick=(f)=>props.filter(f).slice(0,4).map(x=>({n:x.name,ad:x.addr,st:x.status,ko:x.kouhou,spec:x.spec,m:x.m,moto:x.moto}));
    return {kouX1:pick(x=>x.stRaw==='kou'&&x.spec==='X-1'),
            keiyakuEnbi:pick(x=>x.stRaw==='keiyaku'&&/S-M/.test(x.spec)),
            keiyakuAll:pick(x=>x.stRaw==='keiyaku'),
            mitEnbi:pick(x=>(x.stRaw==='mit'||x.stRaw==='chosa')&&/S-M/.test(x.spec))};
  }),null,1));
  await b.close();
})();
