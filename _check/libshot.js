const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const src=fs.readFileSync('/home/user/osamarinavi_bousui/library.html','utf8');
  fs.writeFileSync('/home/user/osamarinavi_bousui/_notch_lib.html', src.replace(/env\(safe-area-inset-(left|right)\s*,\s*0px\)/g,'59px'));
  for(const vp of [{w:393,h:852,n:'tate',f:'library.html'},{w:852,h:393,n:'yoko',f:'_notch_lib.html'}]){
    const p = await (await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/'+vp.f,{waitUntil:'load'}); await p.waitForTimeout(1000);
    const m = await p.evaluate(()=>{
      const bar=document.getElementById('nnLibBar').getBoundingClientRect();
      const els=[...document.querySelectorAll('#nnLibBar .box, #lchips .lfil>button, #nnLibCount')];
      const mids=els.map(el=>{const b=el.getBoundingClientRect();return Math.round((b.top+b.bottom)/2);});
      const cnt=document.getElementById('nnLibCount').getBoundingClientRect();
      const list=document.querySelector('.llist').getBoundingClientRect();
      return { barH:+bar.height.toFixed(0), rows:(Math.max(...mids)-Math.min(...mids))<=3?1:2,
               cntRight:+cnt.right.toFixed(0), W:innerWidth, listTop:+list.top.toFixed(0),
               over:document.documentElement.scrollWidth>innerWidth+1 };
    });
    console.log(vp.n,'帯'+m.barH+'px '+m.rows+'段 件数右端'+m.cntRight+'/'+m.W+' 一覧開始'+m.listTop+'px', (!m.over&&m.rows===1)?'○':'★NG');
    await p.screenshot({path:'lib_'+vp.n+'.png'});
    await p.close();
  }
  fs.unlinkSync('/home/user/osamarinavi_bousui/_notch_lib.html');
  await browser.close();
})();
