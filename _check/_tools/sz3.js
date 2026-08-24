const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:1920,height:1080}});
 await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
 const a=await p.$('.kgh'); await a.screenshot({path:'mine_kgh.png'});
 const c=await p.$('.httl'); await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
 await c.screenshot({path:'mine_httl.png'});
 console.log('ok');
 await b.close();})();
