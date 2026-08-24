/* 図面・積算を長く使い続けても、覚えている量（メモリ）や部品が増え続けないか。
   増え続けると、しばらく使ったあとに「落ちる」「固まる」原因になる。
   使い方： node _check/soak3d.js  [ファイル名]                               */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let NG=0; const ok=(c,t,v)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(v!==undefined?'  '+JSON.stringify(v):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1400,height:900}});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));
await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(500);
await p.evaluate(()=>{try{loadSample();}catch(_){}}); await p.waitForTimeout(600);
const cdp=await ctx.newCDPSession(p); await cdp.send('HeapProfiler.enable');
const mem=async()=>{ await cdp.send('HeapProfiler.collectGarbage');
  const {result}=await cdp.send('Runtime.evaluate',{expression:'performance.memory?performance.memory.usedJSHeapSize:0'});
  return Math.round(result.value/1048576*10)/10; };
const cnt=async()=>p.evaluate(()=>{ let m=0;
  try{ T.scene.traverse(o=>{ if(o.isMesh)m++; }); }catch(_){}
  return {部品:m, 形:(T&&T.renderer)?T.renderer.info.memory.geometries:0,
          絵:(T&&T.renderer)?T.renderer.info.memory.textures:0}; });
const cyc=async(n)=>{ for(let i=0;i<n;i++) await p.evaluate(async()=>{
    try{ setTab('d3'); }catch(_){}
    const pp=state.polys[0]; if(pp){ nnSetDeckLv(pp,(i=>i)((Math.random()*3)|0)); dirty3d=true; build3D(); }
    try{ setTab('zu'); draw(); }catch(_){}
    try{ setTab('wari'); }catch(_){}
    try{ setTab('sec'); }catch(_){}
    try{ setTab('d3'); }catch(_){}
    await new Promise(r=>setTimeout(r,30));
  }); };
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4200);
await cyc(3); await p.waitForTimeout(800);
const m0=await mem(), c0=await cnt();
await cyc(15); await p.waitForTimeout(1000);
const m1=await mem(), c1=await cnt();
await cyc(15); await p.waitForTimeout(1000);
const m2=await mem(), c2=await cnt();
console.log('   はじめ '+m0+'MB '+JSON.stringify(c0)+' / 15回後 '+m1+'MB '+JSON.stringify(c1)+' / 30回後 '+m2+'MB '+JSON.stringify(c2));
ok((m2-m1)<2.0,'あとから使ったぶんでメモリが増え続けない（2MB未満）',(Math.round((m2-m1)*10)/10)+'MB');
ok(c2.部品<=c0.部品*1.1,'3Dの部品が増え続けない',c0.部品+'→'+c2.部品);
ok(c2.形<=c0.形*1.2,'GPUに置く形が増え続けない',c0.形+'→'+c2.形);
ok(c2.絵<=c0.絵+2,'GPUに置く絵（質感）が増え続けない',c0.絵+'→'+c2.絵);
ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
await b.close(); console.log('★NG'+NG);
})();
