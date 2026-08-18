const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  const cdp=await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(2500);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1500);
  const base=await p.evaluate(()=>{const a=performance.now(); render(); return Math.round(performance.now()-a);});
  console.log('いまの render()', base+'ms');
  /* 内訳 */
  const parts=await p.evaluate(()=>{
    const list=document.getElementById('list');
    const html=list.innerHTML;
    const a=performance.now(); list.innerHTML=html; const b1=performance.now();
    list.getBoundingClientRect().height; const c=performance.now();
    return {html:Math.round(b1-a), layout:Math.round(c-b1), len:html.length};
  });
  console.log('内訳', JSON.stringify(parts));
  /* content-visibility を入れて測る */
  const cv=await p.evaluate(()=>{
    const st=document.createElement('style'); st.id='__cv';
    st.textContent='#list .pcard{content-visibility:auto; contain-intrinsic-size:auto 330px;}';
    document.head.appendChild(st);
    const a=performance.now(); render(); return Math.round(performance.now()-a);
  });
  await p.waitForTimeout(800);
  const cv2=await p.evaluate(()=>{const a=performance.now(); render(); return Math.round(performance.now()-a);});
  console.log('content-visibility あり render()', cv+'ms / 2回目 '+cv2+'ms');
  /* 見た目が壊れていないか */
  console.log('カード数', await p.evaluate(()=>document.querySelectorAll('#list .pcard').length));
  await p.screenshot({path:'perf_cv.png'});
  await b.close();
})();
