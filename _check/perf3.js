const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGES=[['library.html','#grid, .lib-list, #list'],['yougo.html','#content'],
             ['shiyo_toroku.html','#list, .list'],['zairyo_toroku.html','#list, .list'],
             ['kokkosho.html','#list, main'],['hacchu.html','#list, main'],['index.html','body']];
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const [f,sel] of PAGES){
    const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
    const cdp=await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const t0=Date.now();
    await p.goto('http://localhost:8899/'+f,{waitUntil:'load'});
    await p.waitForTimeout(1800);
    const r=await p.evaluate(s=>{
      const el=document.querySelector(s.split(',')[0].trim())||document.body;
      const n=document.querySelectorAll('*').length;
      const a=performance.now(); document.body.getBoundingClientRect(); void document.body.offsetHeight;
      return {nodes:n, rows:el.children.length, layout:Math.round(performance.now()-a)};
    }, sel).catch(e=>({err:String(e).slice(0,60)}));
    console.log(f.padEnd(22), '読み込み'+(Date.now()-t0)+'ms', JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
