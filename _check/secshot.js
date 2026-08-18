const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1300);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('サンプル形状')); if(b)b.click(); });
  await p.waitForTimeout(700);
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(700);
  await p.screenshot({path:'sec_phone.png'});
  await p.evaluate(()=>{nnSetTheme('dark'); nnSecDraw();}); await p.waitForTimeout(500);
  await p.screenshot({path:'sec_phone_dark.png'});
  // たて画面でタブがはみ出さないか
  const p2 = await (await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
  await p2.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p2.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p2.waitForTimeout(1300);
  const hd = await p2.evaluate(()=>{
    const t=document.getElementById('hdTabs').getBoundingClientRect();
    const h=document.querySelector('header').getBoundingClientRect();
    const help=document.getElementById('hdHelp').getBoundingClientRect();
    return {tabsRight:+t.right.toFixed(1), helpRight:+help.right.toFixed(1), headerW:+h.width.toFixed(1),
            rows:new Set([...document.querySelectorAll('#hdTabs button')].map(b=>Math.round(b.getBoundingClientRect().top))).size};
  });
  console.log('たて画面ヘッダー：タブ右端'+hd.tabsRight+' ／ ？右端'+hd.helpRight+' ／ 幅'+hd.headerW+' ／ タブ段数'+hd.rows);
  console.log(hd.helpRight<=hd.headerW ? '○ はみ出しなし' : '★NG はみ出し');
  await p2.screenshot({path:'sec_tate_hd.png'});
  await browser.close();
})();
