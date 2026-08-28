/* ★2026-08-28g 3Dを組み直したとき「シェーダー（絵の描き方）を作り直していないか」。
   材質を捨てるとシェーダーも作り直しになり、1コマで何回も走ると画面が固まる（§178）。
   §232で足した「3Dでかいた立体」がこの決まりを破っていて、
   面をドラッグする40コマで240回も作り直していた（§233・2026-08-28g で修正）。
   ★新しい3Dの飾りを足したら、この検査を流すこと。
   ★シェーダーの作り直しの回数は、GPUの無い環境でも当てになる数字（§63）。
   使い方: node _check/shader3d.js  ／  node _check/shader3d.js before */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BEFORE=process.argv[2]==='before';
const FILE=BEFORE? '_before.html' : 'zumen_sekisan.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  if(BEFORE) require('./mkbefore')();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:700}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ window.__compiles=0;
    for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){
      const o=C.prototype.compileShader;
      C.prototype.compileShader=function(){ window.__compiles++; return o.apply(this,arguments); }; } });
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.renderer;}catch(_){return false;}},null,{timeout:25000});
  await p.waitForTimeout(1500);

  /* ① 屋根の組み直し（飾りの組み合わせを変えながら） */
  const r=await p.evaluate(async()=>{
    const out={};
    const run=async(name,setup)=>{
      setup();
      state.active=0; saveState(); recalc(); dirty3d=true; build3D();
      await new Promise(r=>setTimeout(r,700)); T.renderer.render(T.scene,T.camera);
      await new Promise(r=>setTimeout(r,200));
      const c0=window.__compiles, t0=T.renderer.info.memory.textures;
      for(let i=0;i<20;i++){ state.polys[0].lv=0.1+i*0.01; dirty3d=true; build3D(); T.renderer.render(T.scene,T.camera); }
      out[name]={c:window.__compiles-c0, tex:T.renderer.info.memory.textures-t0};
    };
    const basic=()=>{ state.scaleM=1; state.parts=[]; state.d3sol=[]; state.kouzou='rc';
      state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
        edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))}]; };
    await run('ふつう', basic);
    await run('アルミ笠木', ()=>{ basic(); nnKasagiSet(0,true); });
    await run('取り合い', ()=>{ basic(); state.polys[0].spec='AS-T1';
      state.polys.push({name:'屋根②',lv:0,spec:'X-2',pts:[{x:20,y:0},{x:32,y:0},{x:32,y:12},{x:20,y:12}],
        edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))});
      try{ nnSyncSharedEdges(); }catch(_){} });
    await run('現況＝既存防水', ()=>{ basic(); state.polys[0].genkyo='exist'; });
    await run('下地＝木造', ()=>{ basic(); state.kouzou='w'; });
    await run('役物あり', ()=>{ basic(); nnStamp('dakki'); nnPlaceAtGrid(5,5);
      try{ nnPlaceStop(); }catch(_){} });
    return out;
  });
  Object.keys(r).forEach(k=>{
    ok('屋根の組み直し20回でシェーダーを作り直さない（'+k+'）', r[k].c===0, r[k].c+'回');
  });
  const texBad=Object.keys(r).filter(k=>r[k].tex>2);
  ok('屋根の組み直しで絵が増え続けない', texBad.length===0,
     texBad.map(k=>k+'+'+r[k].tex).join(' / '));

  /* ② 3Dでかいた立体（押出し・自由な形）を描き直し続ける＝面のドラッグと同じ */
  const sol=await p.evaluate(async()=>{
    const out={};
    const run=async(name,it)=>{
      state.d3sol=[it]; nnSolRender(); T.renderer.render(T.scene,T.camera);
      await new Promise(r=>setTimeout(r,200));
      const c0=window.__compiles;
      for(let i=0;i<40;i++){ state.d3sol[0].d=0.3+i*0.01; nnSolRender(); T.renderer.render(T.scene,T.camera); }
      out[name]=window.__compiles-c0;
    };
    state.scaleM=1; state.parts=[];
    state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
      edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))}];
    state.active=0; saveState(); dirty3d=true; build3D();
    await new Promise(r=>setTimeout(r,600));
    const B={p:[4,0.02,4],n:[0,1,0],u:[1,0,0],v:[0,0,1],a:[0,0],b:[3,3],d:0.5};
    await run('押出し', Object.assign({},B,{mode:'out',shape:'box'}));
    await run('引込み', Object.assign({},B,{mode:'in',shape:'box'}));
    await run('円柱',   Object.assign({},B,{mode:'out',shape:'cyl'}));
    await run('自由な形',Object.assign({},B,{mode:'out',shape:'poly',
      pts:[[0,0],[3,0],[3,4],[1.5,4],[1.5,2],[0,2]]}));
    return out;
  });
  Object.keys(sol).forEach(k=>{
    ok('立体の描き直し40回でシェーダーを作り直さない（'+k+'）', sol[k]===0, sol[k]+'回');
  });

  await p.evaluate(()=>{ state.polys=[]; state.d3sol=[]; state.parts=[]; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((BEFORE?'【直す前 _before.html】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
