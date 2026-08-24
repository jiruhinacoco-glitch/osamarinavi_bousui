try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/_land.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);
  await p.evaluate(()=>{ listFil['kizon'].add('不明'); buildChips(); render(); });
  await p.waitForTimeout(900);
  await p.screenshot({path:'shot17c.png', clip:{x:0,y:100,width:852,height:293}});
  console.log('ok');
  await b.close();
})();
