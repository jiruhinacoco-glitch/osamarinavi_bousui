const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  // ①スマホ（たて）②スマホ（よこ）③PC で、工法名の行の実寸を測る
  for(const vp of [{w:393,h:852,n:'スマホたて',ph:true},{w:852,h:393,n:'スマホよこ',ph:true},{w:1920,h:1080,n:'PC',ph:false}]){
    const ctx = await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:vp.ph?3:2,isMobile:vp.ph,hasTouch:vp.ph});
    const p = await ctx.newPage();
    if(vp.ph) await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(1400);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);
    const m = await p.evaluate(()=>{
      const card=document.querySelector('#list .pcard');
      const line=card.querySelector('.roofline');
      const badge=card.querySelector('.badge');
      const chip=card.querySelector('.defchip');
      const title=card.querySelector('h3');
      const cs=el=>el?getComputedStyle(el):null;
      const r=el=>el?el.getBoundingClientRect():null;
      // 画面上の実寸（pt）＝ CSSpx × (画面幅pt / レイアウト幅px)
      const k=window.innerWidth/document.documentElement.clientWidth;
      const scale=window.visualViewport?(window.visualViewport.width/document.documentElement.clientWidth):1;
      return {
        layoutW:document.documentElement.clientWidth,
        winW:window.innerWidth, dpr:window.devicePixelRatio,
        lineFs:cs(line)?cs(line).fontSize:'-',
        lineH:r(line)?+r(line).height.toFixed(1):0,
        badgeH:r(badge)?+r(badge).height.toFixed(1):0,
        badgeFs:cs(badge)?cs(badge).fontSize:'-',
        chipH:r(chip)?+r(chip).height.toFixed(1):0,
        titleFs:cs(title)?cs(title).fontSize:'-',
      };
    });
    // 画面上の実寸(pt)＝CSSpx × (画面の見た目の幅 / レイアウト幅)
    const ratio = vp.w / m.layoutW;
    console.log(`--- ${vp.n}（画面${vp.w}pt / レイアウト幅${m.layoutW}px / 縮小率${ratio.toFixed(3)} / DPR${m.dpr}）`);
    console.log(`   工法名の文字 ${m.lineFs}  行の高さ ${m.lineH}px → 画面上 ${(m.lineH*ratio).toFixed(1)}pt`);
    console.log(`   工法バッジ 高さ${m.badgeH}px(${m.badgeFs}) → 画面上 ${(m.badgeH*ratio).toFixed(1)}pt`);
    console.log(`   不具合チップ 高さ${m.chipH}px → 画面上 ${(m.chipH*ratio).toFixed(1)}pt`);
    console.log(`   ★16pxのアイコンを置いた場合の物理画素 = 16 × ${ratio.toFixed(3)} × ${m.dpr} = ${(16*ratio*m.dpr).toFixed(0)}px`);
    console.log(`   ★22pxのアイコンを置いた場合の物理画素 = ${(22*ratio*m.dpr).toFixed(0)}px`);
    await p.close(); await ctx.close();
  }
  await browser.close();
})();
