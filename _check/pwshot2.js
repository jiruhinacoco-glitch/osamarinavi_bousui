const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [mode,vp] of [['pc',{width:1600,height:900}],['phone',{width:393,height:852}]]){
  const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
  const p=await ctx.newPage();
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1400);
  // いろんな状態が見えるよう、施工中〜引合いが並ぶ位置へスクロール
  await p.evaluate(()=>{const l=document.getElementById('list'); const el=[...l.querySelectorAll('.pcard')].find(c=>c.classList.contains('st-kou')); if(el) l.scrollTop=el.offsetTop-60;});
  await p.waitForTimeout(400);
  await p.screenshot({path:'pwshot_'+mode+'.png'});
  await ctx.close();
}
await b.close();})();
