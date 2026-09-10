/* ★2026-09-09 本人の指摘（添付2・3）「テーパーの辺が白い。おそらくちゃんと連続していない。
   増貼の角が突き出ている」。
   ＝立上り→面取り（テーパー）→天端 と巻いた増張りの **折れ目に細いすき間** があり、
     そこから下地（躯体）が白く見えている。

   ★測り方は現実と同じ：折れ目の谷（V字）を **二等分線の向きから のぞきこむ**。
     最初に当たるのが増張りなら continuous、躯体なら「白い線」。
     モデルの中の数字ではなく「見えるか」で測る。
   ★あわせて、板がとなりの板より外へ飛び出していないかも見る（本人「角が突き出ている」）。
   使い方: node _check/teepa.js  ／ node _check/teepa.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');

/* 面取りの形は検査側で別に計算する（product の wallPath は使わない）。
   build3D と同じ決まり：fo=th+0.006（防水層の面）／MEM=0.012／
   面取りは (t=fo, y=hh-CH) → (t=th-CH, y=hh+MEM)。t は壁の外面から内向き。 */
const TH=0.25, HH=0.30, CH=0.03, MEM=0.012, FO=TH+0.006;

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:600},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1000);
  await p.evaluate(({TH,HH,CH})=>{ state.scaleM=1;
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}];
    state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:HH*1000,w:TH*1000,ch:CH*1000})),lv:0,name:'屋根①'}];
    state.d3sheet=[]; saveState(); setTab('d3'); },{TH,HH,CH});
  await p.waitForTimeout(2600);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.25, phi:1.05, tx:4.6, tz:3.6, r:1.6}); T.rev=(T.rev|0)+1; });
  /* ★カメラが落ち着くのを **時間ではなく条件で** 待つ（§検査の決まり）。
     デカールは「そのときのカメラ」で切り取るので、動いている途中で貼ると毎回ちがう結果になる。 */
  await p.waitForFunction(()=>{
    try{ const q=T.camera.getWorldPosition(new THREE.Vector3()).toArray().map(v=>v.toFixed(4)).join(',');
      if(window.__camQ===q){ window.__camN=(window.__camN|0)+1; } else { window.__camQ=q; window.__camN=0; }
      return (window.__camN|0)>=8; }catch(_){ return false; }
  },{timeout:20000,polling:60});

  /* 出隅(5,4) をまたいで、立上り→面取り→天端 に巻く（添付3と同じ形） */
  const B=await p.evaluate(({FO})=>{ state.d3sheet=[];
    window.nnSheetMode={mat:{n:'増し張り材',col:'#101010',src:'t'},kind:'poly',w:400,d:200,t:4};
    const W=[new THREE.Vector3(5.60,0.10,4-FO), new THREE.Vector3(5.60,0.312,3.86),
             new THREE.Vector3(4.86,0.312,3.86), new THREE.Vector3(4.86,0.312,4.60),
             new THREE.Vector3(5-FO,0.10,4.60), new THREE.Vector3(5-FO,0.10,4-FO)];
    const p0=W[0].clone(), u0=new THREE.Vector3(1,0,0), v0=new THREE.Vector3(0,0,1);
    const pts=W.map(w=>{ const d=w.clone().sub(p0); return [d.dot(u0), d.dot(v0)]; });
    nnSheetCommit({p:p0.toArray(), n:[0,1,0], u:u0.toArray(), v:v0.toArray(), pts, w:W, off:0.012});
    const s=state.d3sheet[0];
    return {n:s?s.faces.length:0, k:(s?s.faces:[]).map(f=>f.id?f.id.k:'?')};
  },{FO});
  await p.waitForFunction(()=>{ try{ let n=0; T.group.traverse(o=>{ if(o.name==='nnSheet')n++; }); return n>=6; }catch(_){ return false; } },{timeout:20000,polling:60});
  ok(B.n>=6,'出隅をまたいで 立上り・面取り・天端 に巻ける',B);

  /* 折れ目の谷を二等分線の向きからのぞく。当たったものが増張りでなければ「白い線」 */
  const peek=()=>p.evaluate(({TH,HH,CH,MEM,FO})=>{
    T.scene.updateMatrixWorld(true);
    const objs=[]; T.group.traverse(o=>{ if(o.isMesh&&o.visible&&!(o.userData&&o.userData.pick)) objs.push(o); });
    const rc=new THREE.Raycaster();
    const nrm=(a,b2)=>{ const L=Math.hypot(a,b2); return [a/L,b2/L]; };
    /* 段ごとの表向き（t,y） */
    const nWall=[1,0];
    const dCh=[ (TH-CH)-FO, (HH+MEM)-(HH-CH) ];
    const nCham=nrm(dCh[1], -dCh[0]);
    const nTop=[0,1];
    const bis=(a,b2)=>nrm(a[0]+b2[0], a[1]+b2[1]);
    const folds=[
      {nm:'立上り／面取り', t:FO,      y:HH-CH,   n:bis(nWall,nCham)},
      {nm:'面取り／天端',   t:TH-CH,   y:HH+MEM,  n:bis(nCham,nTop)}
    ];
    const out=[];
    folds.forEach(F=>{
      ['A','B'].forEach(side=>{
        let miss=0, hit=0, first=null;
        for(let i=0;i<=40;i++){
          /* 貼った帯の中だけを見る（帯は側Aが x=4.744〜5.60、側Bが z=3.744〜4.60）。
             ふちより外はそもそも貼っていないので、そこは見ない。 */
          const s=(side==='A') ? 4.80+0.015*i : 3.80+0.015*i;     /* 角から 0.6m（帯のふちは見ない） */
          const P = (side==='A') ? new THREE.Vector3(s, F.y, 4-F.t)
                                 : new THREE.Vector3(5-F.t, F.y, s);
          const N = (side==='A') ? new THREE.Vector3(0, F.n[1], -F.n[0])
                                 : new THREE.Vector3(-F.n[0], F.n[1], 0);
          rc.set(P.clone().addScaledVector(N,0.30), N.clone().multiplyScalar(-1));
          const hs=rc.intersectObjects(objs,false)||[];
          let nm2='-';
          for(let k=0;k<hs.length;k++){ const m=hs[k].object;
            if(m.material&&m.material.transparent&&m.material.opacity<0.1) continue;
            if(m.name==='nnSolLab'||m.name==='nnSheetLab') continue;
            nm2=m.name||'(躯体)'; break; }
          if(nm2==='nnSheet') hit++; else { miss++; if(first===null){ first=+s.toFixed(2);
            out.__dbg=(out.__dbg||[]); if(out.__dbg.length<6) out.__dbg.push({f:F.nm,side,s:+s.toFixed(2),
              hits:hs.slice(0,4).map(h=>(h.object.name||'(躯体)')+'@'+h.distance.toFixed(4))}); } }
        }
        out.push({fold:F.nm, side, hit, miss, first});
      });
    });
    /* 出隅のたて稜線（角が突き出ていないか・穴が無いか） */
    const ridge=[];
    for(let k=0;k<10;k++){
      const y=0.12+k*0.012;                 /* 貼った帯（y=0.10〜0.27）の中だけを見る */
      const o0=new THREE.Vector3(5-FO-0.25, y, 4-FO-0.25);
      rc.set(o0, new THREE.Vector3(1,0,1).normalize());
      const hs=rc.intersectObjects(objs,false)||[];
      let nm2='-';
      for(let i=0;i<hs.length;i++){ const m=hs[i].object;
        if(m.material&&m.material.transparent&&m.material.opacity<0.1) continue;
        if(m.name==='nnSolLab'||m.name==='nnSheetLab') continue;
        nm2=m.name||'(躯体)'; break; }
      ridge.push(nm2==='nnSheet'?1:0);
    }
    return {out, dbg:out.__dbg||[], ridge:ridge.reduce((a,b2)=>a+b2,0)};
  },{TH,HH,CH,MEM,FO});

  const R=await peek();
  console.log('    当たり内訳 '+JSON.stringify(R.dbg));
  R.out.forEach(r=>console.log('    '+r.fold+' '+r.side+'：増張り '+r.hit+'／下地 '+r.miss
    +(r.first!=null?('（最初に下地が見えた位置 '+r.first+'）'):'')));
  R.out.forEach(r=>{
    ok(r.miss===0, '折れ目「'+r.fold+'」'+r.side+' に白い線が無い（下地が見えない）', r);
  });
  ok(R.ridge===10,'出隅のたて稜線も増張りでふさがっている（10点すべて）',R.ridge);

  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ テーパー（面取り）の折れ目に白い線は無い');
  await b.close(); process.exit(ng?1:0);
})();
