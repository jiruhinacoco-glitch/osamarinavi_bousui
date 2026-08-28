/* ★2026-08-28f 3Dの「寸法の札の絵」がGPUに溜まり続けないか（巡回で見つけた漏れ）。
   立体を作り直すたびに新しい絵を作っていたので、面をドラッグして奥行きを変えると
   毎コマ1枚ずつ溜まり、2秒のドラッグで約8MB。§183の「黒くなる・落ちる」と同じ仕組み。
   使い方: node _check/texleak.js  ／  node _check/texleak.js before */
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
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.renderer;}catch(_){return false;}},null,{timeout:25000});
  await p.waitForTimeout(1200);

  /* ① 立体を作り直し続ける（実際に描きながら）＝面のドラッグと同じ */
  const drag=await p.evaluate(async()=>{
    state.scaleM=1;
    state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
      edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))}];
    state.active=0;
    state.d3sol=[{p:[4,0.02,4],n:[0,1,0],u:[1,0,0],v:[0,0,1],a:[0,0],b:[3,3],d:0.5,mode:'out',shape:'box'}];
    saveState(); dirty3d=true; build3D();
    await new Promise(r=>setTimeout(r,500));
    const t0=T.renderer.info.memory.textures;
    for(let i=0;i<80;i++){
      state.d3sol[0].d=0.3+i*0.005; nnSolRender();
      T.renderer.render(T.scene, T.camera);      /* 実際に描く＝GPUに載る */
    }
    const t1=T.renderer.info.memory.textures;
    /* もう80コマ続けても増えないこと＝頭打ちになっているか、が肝 */
    for(let i=0;i<80;i++){
      state.d3sol[0].d=0.3+i*0.005; nnSolRender();
      T.renderer.render(T.scene, T.camera);
    }
    const t2=T.renderer.info.memory.textures;
    return {a:t0, b:t1, c:t2, grew:t1-t0, grew2:t2-t1};
  });
  ok('面のドラッグで、絵が頭打ちになる（増え続けない）', drag.grew2<=2,
     '前'+drag.a+' → 80コマ'+drag.b+' → 160コマ'+drag.c);
  ok('溜まる絵の枚数が多すぎない（30枚まで）', drag.grew<=30, '+'+drag.grew+'枚');

  /* ② 自由な形を5つ置いて、作り直しを6周（全部消す→作るのくり返し） */
  const loop=await p.evaluate(async()=>{
    const seq=[];
    for(let k=0;k<6;k++){
      state.d3sol=[0,1,2,3,4].map(i=>({p:[2+i*3,0.02,3],n:[0,1,0],u:[1,0,0],v:[0,0,1],
        a:[0,0],b:[2,3],d:0.4+i*0.1,mode:i%2?'in':'out',shape:'poly',
        pts:[[0,0],[2,0],[2,3],[1,3],[1,1.5],[0,1.5]]}));
      nnSolRender(); T.renderer.render(T.scene, T.camera);
      await new Promise(r=>setTimeout(r,60));
      state.d3sol=[]; nnSolRender(); T.renderer.render(T.scene, T.camera);
      await new Promise(r=>setTimeout(r,60));
      seq.push(T.renderer.info.memory.textures);
    }
    return seq;
  });
  ok('立体を作っては消すのを6周しても、絵が増え続けない',
     loop[loop.length-1]-loop[0]<=4, loop.join('→'));

  /* ③ 見た目は変わっていない（札が出ている） */
  const look=await p.evaluate(async()=>{
    state.d3sol=[{p:[4,0.02,4],n:[0,1,0],u:[1,0,0],v:[0,0,1],a:[0,0],b:[3,3],d:0.5,mode:'out',shape:'box'}];
    nnSolRender(); await new Promise(r=>setTimeout(r,200));
    let lab=0; const g=T.scene.getObjectByName('nnSolG');
    if(g) g.traverse(o=>{ if(o.name==='nnSolLab' && o.material && o.material.map) lab++; });
    return lab;
  });
  ok('寸法の札はちゃんと出ている', look>=1, look+'枚');

  await p.evaluate(()=>{ state.polys=[]; state.d3sol=[]; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((BEFORE?'【直す前 _before.html】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
