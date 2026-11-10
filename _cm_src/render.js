// 使い方：node render.js            → frames/ に全コマ（30コマ/秒）
//        node render.js 1.5 4.8 … → その秒だけ prev_◯.png に撮る（確認用）
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+path.resolve(__dirname,'cm.html')); await p.evaluate(()=>window.ready);
  const ts=process.argv.slice(2).map(Number);
  if(ts.length){ for(const t of ts){ await p.evaluate(t=>seek(t),t); await p.screenshot({path:'prev_'+t+'.png'}); } }
  else{ fs.mkdirSync('frames',{recursive:true}); const FPS=30,N=30*FPS;
    for(let i=0;i<N;i++){ await p.evaluate(t=>seek(t),i/FPS); await p.screenshot({path:'frames/f'+String(i).padStart(4,'0')+'.jpg',type:'jpeg',quality:95}); if(i%150==0) console.log(i); } }
  await b.close(); console.log('done');
})();
