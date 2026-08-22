const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
await p.goto('file:///home/user/osamarinavi_bousui/zumen_sekisan.html'); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ loadSample(); }); await p.waitForTimeout(500);
await p.evaluate(()=>nnSplitToggle()); await p.waitForTimeout(3500);
await p.screenshot({path:'splitshot.png'});
await b.close();})();
