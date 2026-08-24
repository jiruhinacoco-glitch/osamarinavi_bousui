// iPhone よこ向き（ノッチ59px）を再現して、見積済 と 見出し の文字の大きさを実測する
try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const SRC='/home/user/osamarinavi_bousui/kirokucho_demo.html';
const TMP='/home/user/osamarinavi_bousui/__land.html';
let h=fs.readFileSync(SRC,'utf8')
  .replace(/env\(safe-area-inset-(left|right)\)/g,'59px')
  .replace(/env\(safe-area-inset-(top|bottom)\)/g,'0px');
fs.writeFileSync(TMP,h);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [W,H,name] of [[852,393,'よこ'],[393,852,'たて']]){
    const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/__land.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
    const d=await p.evaluate(()=>{
      const kg=document.querySelector('.kgh'), ht=document.querySelector('.httl');
      const im=ht.querySelector('img.hpic');
      const cs=e=>getComputedStyle(e);
      return {phone:document.documentElement.getAttribute('data-nnphone'),
        kghFS:cs(kg).fontSize, httlFS:cs(ht).fontSize,
        img:im?Math.round(im.getBoundingClientRect().width)+'x'+Math.round(im.getBoundingClientRect().height):'—',
        lines1:[...document.querySelectorAll('.httl')].every(x=>{const c=cs(x);
          return x.getBoundingClientRect().height<=parseFloat(c.fontSize)+parseFloat(c.paddingTop)+parseFloat(c.paddingBottom)+2;}),
        allIn:[...document.querySelectorAll('.httl')].every(x=>{const b=x.getBoundingClientRect(),
          pa=x.closest('.dpanel').getBoundingClientRect(); return b.left>=pa.left-1&&b.right<=pa.right+1;}),
        ov:document.documentElement.scrollWidth-innerWidth};
    });
    console.log(name, JSON.stringify(d), 'JSエラー', errs.length?errs:'なし');
    if(name==='よこ'){
      await (await p.$('.kgh')).screenshot({path:'L_kgh.png'});
      const c=await p.$('.httl'); await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
      await c.screenshot({path:'L_httl.png'});
      const r=await c.boundingBox();
      await p.screenshot({path:'L_wide.png',clip:{x:Math.max(0,r.x-10),y:Math.max(0,r.y-14),width:430,height:r.height+28}});
    }
    await p.close();
  }
  await b.close(); fs.unlinkSync(TMP);
})();
