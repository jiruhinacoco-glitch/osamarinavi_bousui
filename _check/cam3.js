/* ④カメラの3入口（2026-08-18a）：3カードが画面内・納まりで従来フロー・2リンク先の起動 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));
  await p.goto('http://localhost:8899/camera.html',{waitUntil:'load'}); await p.waitForTimeout(2000);
  const r=await p.evaluate(()=>{
    const cards=[...document.querySelectorAll('.nnEnCard')];
    const nav=document.querySelector('nav').getBoundingClientRect();
    return {n:cards.length, allIn:cards.every(c=>c.getBoundingClientRect().bottom<=nav.top+1)};
  });
  console.log((r.n===3&&r.allIn?'○':'★NG'),'入口3枚が画面内', JSON.stringify(r));
  await p.tap('.nnEnCard'); await p.waitForTimeout(300);
  console.log((await p.evaluate(()=>!!document.querySelector('.shoot .big'))?'○':'★NG'),'納まり→従来フロー');
  await p.goto('http://localhost:8899/zumen_sekisan.html?photo=1',{waitUntil:'load'}); await p.waitForTimeout(2800); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const z=await p.evaluate(()=>[...document.querySelectorAll('div')].some(d=>/写真から起こす/.test(d.textContent||'')&&d.getBoundingClientRect().height>5));
  console.log((z?'○':'★NG'),'zumen?photo=1で写真モード');
  await p.goto('http://localhost:8899/kirokucho_demo.html?view=list',{waitUntil:'load'}); await p.waitForTimeout(2800);
  const k=await p.evaluate(()=>getComputedStyle(document.getElementById('mainview')).display!=='none'&&document.querySelectorAll('#list .pcard').length>0);
  console.log((k?'○':'★NG'),'kirokucho?view=listで一覧', 'JSエラー', errs.length?errs:'なし');
  await b.close();
})();
