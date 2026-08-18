const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:920,height:420},deviceScaleFactor:3});
 await p.goto('file://'+process.cwd()+'/cand.html'); await p.waitForTimeout(400);
 await p.screenshot({path:'cand.png',fullPage:true}); await b.close(); console.log('ok');})();
