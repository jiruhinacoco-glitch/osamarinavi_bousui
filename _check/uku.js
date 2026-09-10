/* ★2026-09-10 本人の添付1〜3「増張りが宙に浮いている／関係ないところに板が出る」。
   添付4のとおり本人の設定は **アゴあり**。アゴありのパラペットは
   「天端・アゴの上面＝躯体のまま（防水を張らない）」が実物どおりの納まり（§255・§4951行）。
   ところが天端をタップして増張りをかくと、**貼れる面が無いのに古い巻き方に落ちて、
   かいた平面そのものが板になり、建物の外の空中に板が浮いていた**。

   ★測り方は現実と同じ：板1枚ごとに **裏側へ光線を撃って下地があるか** を見る。
     下地が無い＝空中に浮いている板。実物の施工ではありえない。
   使い方: node _check/uku.js  ／ node _check/uku.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:600},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1200);
  const build=async(ago)=>{
    await p.evaluate(ago=>{ state.scaleM=1;
      const P=[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}];
      state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250,ch:30,ago:ago?1:0,agoD:100})),lv:0,name:'屋根①'}];
      state.d3sheet=[]; saveState(); setTab('d3'); dirty3d=true; try{build3D();}catch(_){} },ago);
    await p.waitForTimeout(2000);
    await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
    await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.25, phi:1.05, tx:4.6, tz:3.6, r:2.2}); T.rev=(T.rev|0)+1; });
    /* カメラは時間ではなく条件で待つ（デカールはそのときのカメラで切り取るため） */
    await p.waitForFunction(()=>{ try{ const q=T.camera.getWorldPosition(new THREE.Vector3()).toArray().map(v=>v.toFixed(4)).join(',');
      if(window.__q===q){ window.__n=(window.__n|0)+1; } else { window.__q=q; window.__n=0; }
      return (window.__n|0)>=8; }catch(_){ return false; } },{timeout:20000,polling:60});
  };
  /* 板1枚ごとに「裏に下地があるか」を測る（product の関数は使わない） */
  const draw=(pp)=>p.evaluate((pp)=>{
    state.d3sheet=[];
    window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
    const W=pp.map(q=>new THREE.Vector3(q[0],q[1],q[2]));
    const p0=W[0].clone(), u0=new THREE.Vector3(1,0,0), v0=new THREE.Vector3(0,0,1);
    const pts=W.map(w=>{ const d=w.clone().sub(p0); return [d.dot(u0), d.dot(v0)]; });
    const made=nnSheetCommit({p:p0.toArray(), n:[0,1,0], u:u0.toArray(), v:v0.toArray(), pts, w:W, off:0.012});
    T.scene.updateMatrixWorld(true);
    const objs=[]; T.group.traverse(o=>{ if(o.isMesh&&o.visible&&!(o.userData&&o.userData.pick)) objs.push(o); });
    const rc=new THREE.Raycaster();
    const V=a=>new THREE.Vector3(a[0],a[1],a[2]);
    const s0=state.d3sheet[0], out=[];
    (s0&&s0.faces||[]).forEach(f=>{
      const q0=V(f.p),qu=V(f.u),qv=V(f.v),n=V(f.n);
      const wv=f.pts.map(q=>q0.clone().addScaledVector(qu,q[0]).addScaledVector(qv,q[1]));
      const c=new THREE.Vector3(); wv.forEach(w=>c.add(w)); c.multiplyScalar(1/wv.length);
      /* まん中と、まん中から各頂点へ7割の点＝板の内がわを見る */
      const sam=[c].concat(wv.map(w=>c.clone().lerp(w,0.7)));
      let base=0;
      sam.forEach(q=>{ rc.set(q.clone().addScaledVector(n,0.05), n.clone().multiplyScalar(-1));
        const hs=rc.intersectObjects(objs,false).filter(h=>h.object.name!=='nnSheet'&&h.object.name!=='nnSheetLab');
        if(hs.length && hs[0].distance-0.05 < 0.03) base++; });
      out.push({k:f.id?f.id.k:'(面IDなし)', base, n:sam.length,
        c:[+c.x.toFixed(3),+c.y.toFixed(3),+c.z.toFixed(3)]});
    });
    return {made:!!made, how:window.__nnWrapUsed&&window.__nnWrapUsed.how,
      nSheet:(state.d3sheet||[]).length, faces:out};
  },pp);

  /* ① アゴあり：天端（アゴの上）は防水を張らない面 → 宙に浮いた板を作らない */
  await build(true);
  /* アゴの天端（y=0.495）を、出隅をまたいで ななめに かこむ。
     この帯の**まん中は建物の外（空中）**を通る＝古い巻き方だと空中に板ができる。 */
  const A=await draw([[5.60,0.495,3.85],[5.60,0.495,3.95],[4.86,0.495,4.60],[4.76,0.495,4.60]]);
  console.log('  ① アゴあり・天端を角ごしにかいた '+JSON.stringify(A));
  const float1=(A.faces||[]).filter(f=>f.base<f.n);
  ok(float1.length===0,'① アゴありの天端をかいても、宙に浮いた板ができない',
     {浮いた板:float1.length, faces:A.faces});
  ok(A.nSheet===0 || (A.faces||[]).every(f=>f.base===f.n),
     '① 貼れない面をかいたら、貼らない（または下地のある面だけに貼る）',{nSheet:A.nSheet, how:A.how});

  /* ② アゴなし：天端はふつうに張れる（①の直しで張れなくなっていないこと） */
  await build(false);
  const B=await draw([[5.60,0.312,3.90],[5.60,0.312,3.95],[4.90,0.312,3.95],[4.90,0.312,4.60],[4.85,0.312,4.60],[4.85,0.312,3.90]]);
  console.log('  ② アゴなし・天端をかいた '+JSON.stringify(B));
  ok(B.nSheet===1 && (B.faces||[]).length>=2,'② アゴなしなら天端まで巻ける（①で壊れていない）',
     {nSheet:B.nSheet, n:(B.faces||[]).length});
  const float2=(B.faces||[]).filter(f=>f.base<f.n);
  ok(float2.length===0,'② こちらも宙に浮いた板が無い',{浮いた板:float2.length, faces:B.faces});

  /* ③ アゴあり・立上り（アゴ裏まで）はふつうに張れる */
  await build(true);
  const C=await draw([[5.60,0.15,3.744],[5.60,0.15,3.90],[4.90,0.15,3.90],[4.90,0.15,4.60],[4.744,0.15,4.60],[4.744,0.15,3.744]]);
  console.log('  ③ アゴあり・立上りをかいた '+JSON.stringify(C));
  ok(C.nSheet===1,'③ アゴありでも立上りには張れる',{nSheet:C.nSheet, how:C.how});
  const float3=(C.faces||[]).filter(f=>f.base<f.n);
  ok(float3.length===0,'③ こちらも宙に浮いた板が無い',{浮いた板:float3.length, faces:C.faces});

  /* ④ 「そこは防水を張る面か」の答え合わせ（かき始めのタップはこれで断っている） */
  await build(true);
  const D1=await p.evaluate(()=>{ try{ return {
    ten:  !!nnPaintAt(new THREE.Vector3(5.40,0.495,3.87), new THREE.Vector3(0,1,0)),   /* アゴの天端 */
    wall: !!nnPaintAt(new THREE.Vector3(5.40,0.150,3.744), new THREE.Vector3(0,0,-1)), /* 立上り */
    deck: !!nnPaintAt(new THREE.Vector3(6.00,0.012,3.00), new THREE.Vector3(0,1,0))    /* 平場 */
  }; }catch(e){ return {err:String(e)}; } });
  console.log('  ④ アゴあり '+JSON.stringify(D1));
  ok(D1.ten===false,'④ アゴの天端は「張らない面」と答える（かき始めをその場で断れる）',D1);
  ok(D1.wall===true && D1.deck===true,'④ 立上り・平場は「張る面」と答える',D1);
  await build(false);
  const D2=await p.evaluate(()=>{ try{ return {
    ten:  !!nnPaintAt(new THREE.Vector3(5.40,0.312,3.90), new THREE.Vector3(0,1,0)),
    wall: !!nnPaintAt(new THREE.Vector3(5.40,0.150,3.744), new THREE.Vector3(0,0,-1))
  }; }catch(e){ return {err:String(e)}; } });
  console.log('  ④ アゴなし '+JSON.stringify(D2));
  ok(D2.ten===true && D2.wall===true,'④ アゴなしなら天端も「張る面」（①〜③で壊れていない）',D2);

  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 宙に浮いた増張りは無い');
  await b.close(); process.exit(ng?1:0);
})();
