const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:2});
 await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2600);
 const i=await p.evaluate(()=>[...document.querySelectorAll('#dashboard .dpanel')].findIndex(e=>/工法別/.test(e.textContent)));
 const el=(await p.$$('#dashboard .dpanel'))[i]; await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
 const r=await el.boundingBox();
 await p.screenshot({path:'hou.png',clip:{x:r.x,y:r.y,width:Math.min(700,r.width),height:Math.min(120,r.height)}});
 console.log('ok'); await b.close();})();
