const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  // スマホ（たて）で引き出しを開いた状態
  const p = await (await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1300);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('サンプル形状')); if(b)b.click(); });
  await p.waitForTimeout(600);
  await p.evaluate(()=>{ setTab('wf'); setPolyDir(2,'short'); });
  await p.waitForTimeout(500);
  // 引き出し（積算・設定）を開く
  await p.evaluate(()=>{ const b=document.getElementById('nnSideBtn')||[...document.querySelectorAll('button')].find(x=>x.textContent.includes('積算・設定')); if(b)b.click(); });
  await p.waitForTimeout(600);
  // 割付設定までスクロール
  await p.evaluate(()=>{ const el=document.getElementById('dirRows'); if(el)el.scrollIntoView({block:'center'}); });
  await p.waitForTimeout(400);
  await p.screenshot({path:'zdir_panel.png'});
  // 割付図（作図面）も撮る
  await p.evaluate(()=>{ const c=document.getElementById('nnSideClose')||document.querySelector('#side .closebar,#side .cls'); if(c)c.click(); });
  await p.waitForTimeout(500);
  await p.screenshot({path:'zdir_map.png'});
  await browser.close();
})();
