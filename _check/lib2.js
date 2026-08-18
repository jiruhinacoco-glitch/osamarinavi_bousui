/* ⑦ライブラリ新レイアウト（2026-08-18a）：行8件・模式図サムネ・タップで詳細・はみ出し0 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [w,h] of [[852,393],[393,852]]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));
    await p.goto('http://localhost:8899/library.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
    const r=await p.evaluate(()=>{
      const rows=[...document.querySelectorAll('.lr2')];
      return {rows:rows.length, img:rows.filter(e=>{const i=e.querySelector('.l2th img'); return i&&i.naturalWidth>0;}).length,
        sp:document.querySelectorAll('.l2sp').length, ov:document.documentElement.scrollWidth-innerWidth};
    });
    console.log((r.rows===8&&r.img===8&&r.sp>=6&&r.ov<=0?'○':'★NG'), w+'x'+h, JSON.stringify(r), errs.length?errs:'');
    await p.tap('.lr2'); await p.waitForTimeout(400);
    console.log((await p.evaluate(()=>document.querySelectorAll('.lr2').length===0)?'○':'★NG'),'タップで詳細へ');
    await p.close();
  }
  await b.close();
})();
