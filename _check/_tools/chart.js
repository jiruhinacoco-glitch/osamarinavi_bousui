const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2600);
  // 月別グラフのパネルを撮る
  const idx=await p.evaluate(()=>{const ps=[...document.querySelectorAll('#dashboard .dpanel')];
    return ps.findIndex(e=>/月別/.test(e.textContent));});
  const el=(await p.$$('#dashboard .dpanel'))[idx]; await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await el.screenshot({path:'chart.png'});
  // 完成工事高の予実（余白確認）
  const e2=(await p.$$('#dashboard .dpanel'))[0]; await e2.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await e2.screenshot({path:'panel0.png'});
  // 工法別のイラスト
  const d=await p.evaluate(()=>{
    const im=[...document.querySelectorAll('#dashboard .httl img.hpic')].map(x=>({f:x.getAttribute('src').split('/').pop(),ok:x.naturalWidth>0}));
    return {n:im.length, im, ov:document.documentElement.scrollWidth-innerWidth};});
  console.log(JSON.stringify(d), 'JSエラー', errs.length?errs:'なし');
  await b.close();
})();
