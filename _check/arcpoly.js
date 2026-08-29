/* ★2026-08-28d 包括的な依頼「3Dで生まれた面を、全部 出したり引っ込めたりしたい。
   その面の一部の区画も。弧もかきたい。階段も作りたい」への対応（§232）。
   A 2D図面の弧／B 面の上に自由な形＋弧をかいて押出し・引込み／
   C 作った立体の面をドラッグで出し入れ／D 階段（Blenderモデルの受け皿）
   使い方: node _check/arcpoly.js  ／  node _check/arcpoly.js before */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BEFORE=process.argv[2]==='before';
const FILE=BEFORE? '_before.html' : 'zumen_sekisan.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  if(BEFORE) require('./mkbefore')();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:820}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1300);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

  /* ── A 2D図面の弧 ───────────────────────────── */
  ok('A ツールバーに「弧」のボタンがある', await p.evaluate(()=>!!document.getElementById('tl_arc')));
  const A=await p.evaluate(()=>{ try{
    state.scaleM=1;
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; sel={p:0,r:-1,e:0}; saveState(); recalc();
    const a0=quantities(state.polys[0],1).hira;
    nnEdgeArc(2000);                               /* 外へ2m ふくらませる */
    const P=state.polys[0].pts;
    const a1=quantities(state.polys[0],1).hira;
    const arcs=(state.polys[0].edges||[]).filter(e=>e&&e.arc!=null).length;
    return {n0:4, n1:P.length, a0:+a0.toFixed(2), a1:+a1.toFixed(2), arcs,
            miny:Math.min(...P.map(q=>q.y))};
  }catch(e){ return {n0:4,n1:0,a0:0,a1:0,arcs:0,miny:0,err:String(e.message||e)}; } });
  ok('A 弧にすると点が増える（1本の辺→16の折れ線）', A.n1===4+15, A.n0+'点 → '+A.n1+'点');
  ok('A 外へふくらむ（面積が増える）', A.a1>A.a0+20, A.a0+'㎡ → '+A.a1+'㎡');
  /* 弦20m・矢2m の弓形の面積＝26.87㎡。折れ線なので少しだけ内側に入る */
  ok('A ふくらみの面積が計算どおり（弦20m・矢2m＝26.9㎡）',
     Math.abs((A.a1-A.a0)-26.87)<0.6, '+'+(A.a1-A.a0).toFixed(2)+'㎡');
  ok('A 弧の辺に印が付く（保存・寸法の札に使う）', A.arcs===16, A.arcs+'本');
  ok('A ふくらんだ向きが外（y がマイナス側へ出る）', A.miny<-1.5, 'いちばん外 y='+A.miny.toFixed(2));
  const A2=await p.evaluate(()=>{ try{
    saveState();
    const raw=JSON.parse(localStorage.getItem('nn_zumen_v1')||'{}');
    loadState();
    return {arcs:(state.polys[0].edges||[]).filter(e=>e&&e.arc!=null).length,
            pts:state.polys[0].pts.length};
  }catch(e){ return {arcs:0, pts:0}; } });
  ok('A 保存して開き直しても弧のままで残る', A2.arcs===16&&A2.pts===19, A2.pts+'点・印'+A2.arcs+'本');
  const A3=await p.evaluate(()=>{
    /* 弧の寸法の札は「1本の弧につき1枚」だけ出す（16枚出すと図面が読めない）。
       実際に画面へ書かれた文字を数える */
    const P=CanvasRenderingContext2D.prototype, orig=P.fillText; const got=[];
    P.fillText=function(t){ got.push(String(t)); return orig.apply(this,arguments); };
    try{ draw(); } finally { P.fillText=orig; }
    return {arc:got.filter(t=>/^弧 /.test(t)).length, sample:got.filter(t=>/^弧 /.test(t))[0]||''};
  });
  ok('A 弧の寸法の札は1本につき1枚だけ', A3.arc===1, A3.arc+'枚  '+A3.sample);

  /* ── B 面の上に自由な形をかいて押出し ────────────── */
  await p.evaluate(()=>{
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; sel=null; state.d3sol=[]; saveState(); recalc(); draw();
    setTab('d3');
  });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.renderer; }catch(_){return false;} },null,{timeout:20000});
  await p.waitForTimeout(700);
  const B=await p.evaluate(async()=>{
    /* 屋根の面の上に、L字の自由な形を作って押し出す（画面のタップと同じ道を通す） */
    setTool('draw');
    const n=new THREE.Vector3(0,1,0);
    const p0=new THREE.Vector3(4,0,4);
    /* 1点目＝面が決まる → 自由な形に切り替え → 点を足す → 閉じる → 押出し */
    window.__pick=null;
    /* commitDrawAt を通すため、キャンバスの座標に落とし込むのは手間なので
       公開されている口（nnD3PolyStart など）を使って同じ状態を作る */
    nnD3DrawCancel();
    return true;
  });
  /* 実際にキャンバスをクリックして面をつかむ（本物のマウスで） */
  const Bhit=await p.evaluate(()=>{
    const el=T.renderer.domElement, r=el.getBoundingClientRect();
    const w=new THREE.Vector3(4,0.02,4).project(T.camera);
    return {x:Math.round(r.left+(w.x+1)/2*r.width), y:Math.round(r.top+(-w.y+1)/2*r.height)};
  });
  await p.mouse.click(Bhit.x, Bhit.y); await p.waitForTimeout(200);
  ok('B 屋根の面をタップすると、その面に作図できる状態になる',
     await p.evaluate(()=>!!(window.nnD3DrawOn&&nnD3DrawOn())));
  const B2=await p.evaluate(async()=>{
    nnD3PolyStart();
    const pts=[[0,0],[3,0],[3,2],[1.5,2],[1.5,4],[0,4]];   /* L字 */
    /* 面の座標系に直接点を足す（タップで足すのと同じ中身） */
    const DSp=nnD3PolyPtsForTest? nnD3PolyPtsForTest() : null;
    return DSp?DSp.length:-1;
  }).catch(()=>-1);
  /* 口が無ければ「タップで足す」でやる：画面座標に投影してクリック */
  const B3=await p.evaluate(()=>{
    const el=T.renderer.domElement, r=el.getBoundingClientRect();
    const P=[[6,4],[6,7],[8,7],[8,4]];
    return P.map(q=>{ const w=new THREE.Vector3(q[0],0.02,q[1]).project(T.camera);
      return {x:Math.round(r.left+(w.x+1)/2*r.width), y:Math.round(r.top+(-w.y+1)/2*r.height)}; });
  });
  for(const q of B3){ await p.mouse.click(q.x,q.y); await p.waitForTimeout(120); }
  const B4=await p.evaluate(()=>{
    const c=document.getElementById('nnD3Card');
    return {html:c?c.innerHTML:'', on:c?c.classList.contains('on'):false};
  });
  ok('B 点をタップで足していける（自由な形のカードが出る）',
     /自由な形/.test(B4.html)&&B4.on, B4.html.slice(0,60));
  ok('B カードに「弧にする」がある', /弧/.test(B4.html));
  /* ★2026-08-29n 平場にかいた自由な形は、閉じたら**そのまま部位（屋根の区画）**になる
     （本人の指示・添付1〜4。カードは出ない・平面図と積算にも入る）。
     立体（d3sol）としての自由な形は C の積み重ねで確かめる。 */
  const B5=await p.evaluate(async()=>{ try{
    window.nnNumAsk=function(t,d0,cb){ cb(String(window.__ans!=null?window.__ans:d0)); };
    const n0=state.polys.length;
    nnD3PolyClose();
    await new Promise(r=>setTimeout(r,400));
    const pp=state.polys[state.polys.length-1]||{};
    return {made:state.polys.length===n0+1, lv:pp.lv, pts:(pp.pts||[]).length,
            free:(pp.edges||[]).every(e=>(e.k||'para')==='free'),
            sol:(state.d3sol||[]).length,
            card:document.getElementById('nnD3Card').classList.contains('on')};
  }catch(e){ return {made:false, err:String(e).slice(0,60)}; } });
  ok('B 平場で閉じると、そのまま部位（屋根の区画）になる', B5.made===true, JSON.stringify(B5));
  ok('B 高さ＋300mm・辺は立上りなし', Math.abs((B5.lv||0)-0.3)<0.01 && B5.free, B5.lv);
  ok('B カードは出ない・立体（d3sol）にはならない', !B5.card && B5.sol===0);
  const B6=await p.evaluate(()=>{
    /* 平面図にも入っている（＝部位として draw と積算の対象） */
    setTab('zu'); draw();
    const pp=state.polys[state.polys.length-1];
    return {n:state.polys.length, hira:+polyAreaM(pp.pts,state.scaleM).toFixed(1)};
  });
  ok('B 平面図にも入る（部位が増えている）', B6.n===2, B6.n);
  ok('B 面積が積算に入る', B6.hira>1, B6.hira+'㎡');
  const B7=await p.evaluate(()=>{ saveState(); loadState();
    const pp=state.polys[state.polys.length-1]||{};
    return {n:state.polys.length, pts:(pp.pts||[]).length}; });
  ok('B 保存して開き直しても残る', B7.n===2&&B7.pts>=4, JSON.stringify(B7));
  await p.evaluate(()=>{ state.polys.pop(); state.active=0; saveState(); setTab('d3'); });
  await p.waitForTimeout(700);

  /* ── C 作った立体の面をドラッグで出し入れ ─────────── */
  const C0=await p.evaluate(()=>{
    /* いちど分かりやすい四角の立体にしておく */
    state.d3sol=[{p:[6,0,4], n:[0,1,0], u:[1,0,0], v:[0,0,1],
      a:[0,0], b:[2,3], d:0.6, mode:'out', shape:'box'}];
    selSolForTest=null; saveState(); nnSolSelect(0); nnSolRender();
    return (state.d3sol||[]).length;
  });
  ok('C 立体が1つある（ドラッグの試験用）', C0===1);
  /* ★カメラをそろえてから狙う（Aの弧で図形が変わりカメラが遠い位置に残ることがある。
     遠い・低いカメラだと立体の上の面が手前の物にふさがれ、ドラッグが空振りする） */
  await p.evaluate(()=>d3ViewIso()); await p.waitForTimeout(700);
  const Cpt=await p.evaluate(()=>{
    const el=T.renderer.domElement, r=el.getBoundingClientRect();
    const w=new THREE.Vector3(7,0.62,5.5).project(T.camera);   /* 立体の上の面 */
    return {x:Math.round(r.left+(w.x+1)/2*r.width), y:Math.round(r.top+(-w.y+1)/2*r.height)};
  });
  const camBefore=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz]);
  await p.evaluate(()=>{ setTool('sel'); });
  await p.mouse.move(Cpt.x,Cpt.y); await p.mouse.down();
  await p.mouse.move(Cpt.x,Cpt.y-60,{steps:6}); await p.waitForTimeout(120);
  const Cd=await p.evaluate(()=>(state.d3sol[0]||{}).d);
  await p.mouse.up(); await p.waitForTimeout(150);
  ok('C 上の面をドラッグすると奥行きが変わる', Cd>0.62, '600mm → '+Math.round(Cd*1000)+'mm');
  const camAfter=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz]);
  ok('C ドラッグしてもカメラは動かない', camBefore.join()===camAfter.join(),
     camAfter.map(x=>+x.toFixed(2)).join(','));
  const Csave=await p.evaluate(()=>{ const d=state.d3sol[0].d; loadState();
    return {saved:(state.d3sol[0]||{}).d, d}; });
  ok('C 変えた奥行きが保存される', Math.abs(Csave.saved-Csave.d)<1e-9, JSON.stringify(Csave));
  /* できた面の上に、さらに押し出せる（積み重ね） */
  const C2=await p.evaluate(async()=>{ try{
    /* 背が高いままだと、上の面が画面の上のツールバーの下に隠れてタップできない
       （実際のアプリでも同じ。使う人は視点を回して狙う）ので、ここでは戻しておく */
    state.d3sol[0].d=0.8; nnSolRender();
    setTool('draw'); nnD3DrawCancel();
    return true;
  }catch(e){ return false; } });
  const C3=await p.evaluate(()=>{
    const el=T.renderer.domElement, r=el.getBoundingClientRect();
    const top=(state.d3sol[0].d)+0.01;
    /* ★2026-08-29n 1点目から自由な形なので、4点かいてから閉じる */
    return [[6.5,5.0],[7.5,5.0],[7.5,6.0],[6.5,6.0]].map(q=>{
      const w=new THREE.Vector3(q[0],top,q[1]).project(T.camera);
      return {x:Math.round(r.left+(w.x+1)/2*r.width), y:Math.round(r.top+(-w.y+1)/2*r.height)}; });
  });
  for(const q of C3){ await p.mouse.click(q.x,q.y); await p.waitForTimeout(150); }
  const C4=await p.evaluate(async()=>{
    window.__ans=400;
    nnD3PolyClose();                       /* 立体の面＝カードが出る側。そのまま押し出す */
    nnSolAsk('out');
    await new Promise(r=>setTimeout(r,300));
    const a=state.d3sol||[];
    return {n:a.length, y:(a[1]? a[1].p[1] : null)};
  });
  ok('C 作った立体の面の上に、さらに押し出せる（積み重ね）',
     C4.n===2 && C4.y>0.5, JSON.stringify(C4));

  /* ── D 階段（Blenderモデルの受け皿） ─────────────── */
  ok('D ツールバーに「階段」のボタンがある', await p.evaluate(()=>!!document.getElementById('tl_p_kaidan')));
  const D=await p.evaluate(async()=>{ try{
    state.d3sol=[]; state.parts=[]; saveState();
    nnStamp('kaidan');
    const lib=(window.nnPartsLib?nnPartsLib():[]).find(x=>x.kind==='kaidan');
    if(!lib)return {lib:false};
    nnPlaceAtGrid(10,6);
    try{ dirty3d=true; build3D(); }catch(_){}
    await new Promise(r=>setTimeout(r,500));
    let steps=0, box=null;
    T.group.traverse(o=>{ if(!o.isMesh)return;
      const g=o.geometry; if(!g||!g.parameters)return;
      if(g.type==='BoxGeometry'&&g.parameters.height<0.05&&g.parameters.width>0.5) steps++; });
    const objs=[]; T.group.traverse(o=>{ if(o.isMesh&&o.userData&&o.userData.partIdx!=null&&o.visible)objs.push(o); });
    if(objs.length){ const bb=new THREE.Box3(); objs.forEach(o=>bb.expandByObject(o));
      box={h:+(bb.max.y-bb.min.y).toFixed(2), w:+(bb.max.x-bb.min.x).toFixed(2)}; }
    return {lib:true, w:lib.w, d:lib.d, h:lib.h, parts:(state.parts||[]).length, steps, box};
  }catch(e){ return {lib:false, parts:0, steps:0, box:null}; } });
  ok('D 階段が部材の見本にある', D.lib===true, JSON.stringify({w:D.w,d:D.d,h:D.h}));
  ok('D 図面に置ける', D.parts===1, D.parts+'個');
  ok('D 3Dで段板が並ぶ（蹴上げ190mm＝1500mmで8段前後）', D.steps>=6&&D.steps<=10, D.steps+'段');
  ok('D 手すりまで入れた高さになる', D.box && D.box.h>1.9, JSON.stringify(D.box));
  const D2=await p.evaluate(()=>window.NN_GLB_BASE);
  ok('D Blenderのモデルの置き場が用意されている（models/kaidan.glb）', D2==='models/', D2);

  await p.evaluate(()=>{ state.polys=[]; state.d3sol=[]; state.parts=[]; state.active=-1; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.slice(0,3).join(' / '));
  console.log((BEFORE?'【直す前 _before.html】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
