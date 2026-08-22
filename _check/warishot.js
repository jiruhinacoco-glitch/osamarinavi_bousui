const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1400,height:950}});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ window.__svg=null;
    window.open=function(){ return {document:{write(h){window.__svg=(window.__svg||'')+h;},close(){}},
      addEventListener(){},focus(){},print(){} }; }; });
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(600);
  await p.evaluate(()=>nnWariPDF()); await p.waitForTimeout(400);
  const svg=await p.evaluate(()=>(window.__svg.match(/<svg[\s\S]*<\/svg>/)||[''])[0]);
  const q=await b.newPage({viewport:{width:1680,height:1188},deviceScaleFactor:2});
  await q.setContent('<body style="margin:0">'+svg.replace('width="420mm" height="297mm"','width="1680" height="1188"')+'</body>');
  await q.waitForTimeout(400);
  await q.screenshot({path:'wari_pdf.png'});
  console.log('ok');
  await b.close();
})();
