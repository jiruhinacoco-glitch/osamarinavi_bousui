const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:1000}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{
    openModal();
    document.getElementById('f_name').value='テスト倉庫 屋上防水改修';
    nnFFAdd({n:'A棟 屋上', ko:'塩ビシート 機械固定(S-M2)', q:800});
    nnFFAdd({n:'渡り廊下', ko:'ウレタン塗膜 通気緩衝工法(X-1)', q:200});
    nnFFAdd({n:'目地シール', ko:'ウレタン塗膜 密着工法(X-2)', q:120, un:'m'});
    document.querySelectorAll('#f_faceRows .ffu')[2].value='m';
    nnFFSync();
  });
  await p.waitForTimeout(400);
  const over=await p.evaluate(()=>{
    const m=document.querySelector('.modal');
    return {mw:m.scrollWidth-m.clientWidth, rows:document.querySelectorAll('#f_faceRows .ffrow').length};
  });
  console.log((PH?'ph':'pc'), JSON.stringify(over));
  await p.locator('.modal').screenshot({path:PH?'ff_ph.png':'ff_pc.png'});
  await b.close();
})();
