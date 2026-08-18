const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/_land_kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  /* 実際の指の操作：一覧タブ → カードの日付を2回タップ */
  await p.evaluate(()=>showView('list'));
  await p.waitForTimeout(800);
  const pt=await p.evaluate(()=>{const d=document.querySelector('#list .pcard .pdate');
    const r=d.getBoundingClientRect(); return {x:r.left+10, y:r.top+8};});
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(400);
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(900);
  const st=await p.evaluate(()=>({cls:document.getElementById('mainview').className,
    detLen:document.getElementById('detail').innerHTML.length}));
  console.log(JSON.stringify(st));
  await p.screenshot({path:'det_real.png'});
  await b.close();
})();
