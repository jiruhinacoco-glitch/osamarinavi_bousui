/* ③用語集レイアウト圧縮（2026-08-18a）：よこ向きで最初の用語が画面の上半分に見えること */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
let h=fs.readFileSync('/home/user/osamarinavi_bousui/yougo.html','utf8')
  .replace(/env\(safe-area-inset-(left|right)\)/g,'59px').replace(/env\(safe-area-inset-(top|bottom)\)/g,'0px');
fs.writeFileSync('/home/user/osamarinavi_bousui/__L_yougo.html',h);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [w,hh,name,file] of [[852,393,'よこ','__L_yougo.html'],[393,852,'たて','yougo.html']]){
    const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));
    await p.goto('http://localhost:8899/'+file,{waitUntil:'load'}); await p.waitForTimeout(2200);
    const r=await p.evaluate(()=>{
      const t=[...document.querySelectorAll('.trow')].find(e=>e.getBoundingClientRect().height>10);
      return {top:Math.round(t.getBoundingClientRect().top), pct:Math.round(t.getBoundingClientRect().top/innerHeight*100),
        ov:document.documentElement.scrollWidth-innerWidth};
    });
    console.log((r.pct<=60&&r.ov<=0?'○':'★NG'), name, JSON.stringify(r), errs.length?errs:'');
    await p.close();
  }
  fs.unlinkSync('/home/user/osamarinavi_bousui/__L_yougo.html');
  await b.close();
})();
