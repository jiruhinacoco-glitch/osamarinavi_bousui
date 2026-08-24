const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:1920,height:1080}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
 (await p.$('.kgh')).screenshot({path:'x_kgh.png'});
 const c=await p.$('.httl'); await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
 await c.screenshot({path:'x_httl.png'});
 // 見出しまわりを広めに（イラストのはみ出しも見る）
 const r=await c.boundingBox();
 await p.screenshot({path:'x_wide.png',clip:{x:Math.max(0,r.x-24),y:Math.max(0,r.y-22),width:520,height:r.height+44}});
 const d=await p.evaluate(()=>{const Z=window.nnPZ||1;
   const im=document.querySelector('.httl img.hpic').getBoundingClientRect();
   return {imgW:Math.round(im.width/Z), imgH:Math.round(im.height/Z),
     pad:getComputedStyle(document.querySelector('.httl')).paddingLeft,
     fs:getComputedStyle(document.querySelector('.httl')).fontSize,
     allIn:[...document.querySelectorAll('.httl')].every(x=>{const b=x.getBoundingClientRect(),
       par=x.closest('.dpanel').getBoundingClientRect(); return b.left>=par.left-1&&b.right<=par.right+1;}),
     ov:document.documentElement.scrollWidth-innerWidth};});
 console.log(JSON.stringify(d),'JSエラー',errs);
 await b.close();})();
