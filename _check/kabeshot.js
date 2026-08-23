/* 壁当りの立上り防水の見え方（前後くらべ用）。 node _check/kabeshot.js [html] [out] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const file=process.argv[2]||'zumen_sekisan.html', out=process.argv[3]||'/tmp/kabeshot.png';
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1400,height:820},deviceScaleFactor:2})).newPage();
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/'+file,{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);
await p.evaluate(()=>{
  state.polys=[]; state.parts=[]; state.d3sol=[]; state.scaleM=0.5; state.specCode='AS-T1';
  const eg=()=>({h:300,w:250,k:'para'});
  state.polys.push({name:'屋根①', lv:0, spec:'AS-T1', pts:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],
    edges:[{h:600,w:0,k:'kabe'},eg(),eg(),eg()], holes:[]});
  dirty3d=true; build3D();
});
await p.waitForTimeout(700);
/* 壁の前に寄る（実機のスクショと同じような見え方） */
await p.evaluate(()=>{ T.tx=2.5; T.tz=1.6; T.r=3.4; T.theta=1.35; T.phi=1.32; T.rev++; });
await p.waitForTimeout(1200);
await p.screenshot({path:out});
await b.close(); console.log('→ '+out);
})();
