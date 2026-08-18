const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const mode of ['そのまま','全部後回し(比較用)']){
    const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
    const cdp=await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2500);
    if(mode!=='そのまま') await p.addStyleTag({content:'#list .pcard{content-visibility:auto; contain-intrinsic-size:auto 200px;}'});
    const t=await p.evaluate(()=>{const t0=performance.now(); showView('list'); document.body.offsetHeight; return performance.now()-t0;});
    await p.waitForTimeout(3500);
    const st=await p.evaluate(()=>({off:document.querySelectorAll('#list .pcard.nnoff').length,
      all:document.querySelectorAll('#list .pcard').length}));
    console.log(mode+'： 開く '+t.toFixed(0)+'ms  後回し '+st.off+'/'+st.all+'件');
    await p.close();
  }
  await b.close();
})();
