const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 let p=await b.newPage({viewport:{width:1600,height:900}});
 await p.goto('file:///home/user/osamarinavi_bousui/index.html'); await p.waitForTimeout(800);
 await p.evaluate(()=>{document.querySelector('.quick').style.zoom=5;}); await p.waitForTimeout(250);
 await (await p.$('.quick')).screenshot({path:'ic4_menu.png'});
 await p.close();
 p=await b.newPage({viewport:{width:1600,height:900}});
 await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2200);
 // 見出しだけを並べて撮る
 const shot=await p.evaluate(()=>{
   const box=document.createElement('div');
   box.id='__hb'; box.style.cssText='position:fixed;left:0;top:0;z-index:99999;background:#eef2ec;padding:14px;display:flex;flex-direction:column;gap:8px;';
   document.querySelectorAll('#dashboard .dpanel h4 .httl').forEach(t=>box.appendChild(t.cloneNode(true)));
   document.body.appendChild(box); return true;
 });
 await p.waitForTimeout(300);
 await (await p.$('#__hb')).screenshot({path:'ic4_heads.png'});
 await b.close();
})();
