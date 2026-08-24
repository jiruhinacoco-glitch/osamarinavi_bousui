const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(1200);
await p.evaluate(()=>{ loadSample(); nnSplitToggle(); }); await p.waitForTimeout(3200);
// 描きかけ3点を置いてプレビューが3Dに出た状態で撮る
await p.evaluate(()=>{ tool='draw'; drawPts=[{x:26,y:14},{x:34,y:14},{x:34,y:19}]; draw(); });
await p.waitForTimeout(1200);
await p.screenshot({path:'fx10shot.png'});
await b.close();})();
