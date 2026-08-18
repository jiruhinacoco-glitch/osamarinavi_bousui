/* スクロールしても「灰色の空白」が残らないか（たて画面） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  const cdp=await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2500);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(2500);
  let bad=0, log=[];
  for(const y of [0,2000,5000,9000,14000,19000]){
    await p.evaluate(v=>{document.getElementById('list').scrollTop=v;},y);
    await p.waitForTimeout(900);
    const n=await p.evaluate(()=>{const L=document.getElementById('list'), lb=L.getBoundingClientRect();
      return [...document.querySelectorAll('#list .pcard.nnoff')].filter(c=>{
        const r=c.getBoundingClientRect(); return r.bottom>lb.top && r.top<lb.bottom;}).length;});
    log.push(y+'→'+n+'件'); if(n)bad++;
  }
  console.log((bad?'★NG':'○')+' スクロールしても画面内に灰色の空白なし  '+log.join(' / '));
  await b.close();
})();
