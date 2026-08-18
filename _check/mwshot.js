const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1366,height:720}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{
    localStorage.removeItem('nn_kirokucho_draft_v1');
    openModal();
    document.getElementById('f_name').value='テスト倉庫 屋上防水改修';
    nnFFAdd({n:'A棟 屋上', ko:'塩ビシート 機械固定(S-M2)', q:800});
    nnFFAdd({n:'目地シール', ko:'ウレタン塗膜 密着工法(X-2)', q:120, un:'m'});
    nnFFSync();
  });
  await p.waitForTimeout(400);
  await p.screenshot({path:PH?'mw_ph.png':'mw_pc.png'});
  await b.close();
})();
