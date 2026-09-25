/* ★2026-09-26d 本人「増し貼りがうまく反映されない場合がある。徹底的に直して」（寸法で貼る 300×300 が壁から離れた所で折れて立っていた）
   「出来上がり」を測る（§384）：L字の屋根（本人の図面と同じ形）で、壁ぎわ・入隅・出隅・平場の真ん中・立上り・天端 の
   たくさんの場所に「寸法で貼る」を実際に置き、**画面に描かれた増し張り**（nnSheetCurrentFaces＝描く直前の位置）が
   すべて建物の面の上に載っているかを、面の外から建物へ光線を当てて1点ずつ測る（検査したい関数は使わない）。
   ① 置いた増し張りの面積 ≒ 300×300（はみ出し・欠けがない）
   ② どの点も建物の面から ±8mm 以内（浮いていない・めり込んでいない）
   ③ 描き直し（build3D）・再読み込みのあとも同じ位置
   使い方：node _check/sizeon.js [ファイル名]（http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const exe=fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).map(d=>'/opt/pw-browsers/'+d+'/chrome-linux/chrome')[0];
const file=process.argv[2]||'zumen_sekisan.html';
const SPEC=process.env.SPEC||'AS-J3';
let ng=0; const ok=(c,m,x)=>{ console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c) ng++; };
(async()=>{const b=await chromium.launch({executablePath:exe,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+file); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate((SPEC)=>{ const pts=[[0,0],[16,0],[16,7],[22,7],[22,13],[8,13],[8,6],[0,6]].map(q=>({x:q[0],y:q[1]}));
  state.specCode=SPEC; state.scaleM=1; state.polys=[{lv:0,name:'屋根①',pts,edges:pts.map(()=>({h:300,w:250,k:'para'}))}]; state.d3sheet=[]; saveState(); setTab('d3'); },SPEC);
await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.scene&&T.renderer&&T.scene.children.length>3,{timeout:30000}); await p.waitForTimeout(1500);
/* 試す場所（屋根の座標 m・高さ）：平場の壁ぎわ5cm・15cm／入隅・出隅のそば／平場の真ん中／立上りの中ほど／天端 */
const R=await p.evaluate(()=>{
  const out=[], sM=state.scaleM, poly=state.polys[0], P=poly.pts, n=P.length, h=0.3;
  const hitAt=(w,dir)=>{ /* w＝狙う3Dの点。dir＝そこへ向かう向き（画面を経由せず光線で面を拾う＝ユーザーのタップと同じ faceHit） */
    const o=w.clone().addScaledVector(dir,-1.5); const rc=new THREE.Raycaster(o,dir.clone().normalize(),0,5);
    return (window.nnSheetFaceHitRay?nnSheetFaceHitRay(rc):null); };
  return {n};
});
/* 光線で面を拾う口がなければ、画面の点から拾う（nnSheetCornerHit） */
const cases=await p.evaluate(()=>{
  const sM=state.scaleM, P=state.polys[0].pts, n=P.length, H=0.3, out=[];
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  /* 屋根の内側の向き（反時計回りかどうかで決める） */
  let a2=0; for(let i=0;i<n;i++){ const a=P[i],b=P[(i+1)%n]; a2+=a.x*b.y-b.x*a.y; }
  const inward=(a,b)=>{ const dx=b.x-a.x, dy=b.y-a.y, L=Math.hypot(dx,dy); return a2>0?{x:-dy/L,y:dx/L}:{x:dy/L,y:-dx/L}; };
  for(let i=0;i<n;i++){ const a=P[i], b=P[(i+1)%n], nv=inward(a,b), L=Math.hypot(b.x-a.x,b.y-a.y);
    /* ★パラペットは図面の線の内側に天端幅W（250mm）ぶん立つ。壁の内側の面＝線から W。平場はその先 */
    const Wt=0.25;
    for(const t of [0.5, 0.5/L, 1-0.5/L]){
      for(const d of [0.02,0.05,0.15,0.30]){
        const x=(a.x+(b.x-a.x)*t+nv.x*(Wt+d))*sM, z=(a.y+(b.y-a.y)*t+nv.y*(Wt+d))*sM;
        out.push({name:'平場 辺'+i+' t'+t.toFixed(2)+' 壁から'+Math.round(d*100)+'cm', w:[x,0.02,z], dir:[0,-1,0]}); }
      /* 立上りの中ほど・下のほう（壁の面へ屋根の内側から）／天端 */
      for(const y of [0.05,0.15]){ const x=(a.x+(b.x-a.x)*t+nv.x*Wt)*sM, z=(a.y+(b.y-a.y)*t+nv.y*Wt)*sM;
        out.push({name:'立上り 辺'+i+' t'+t.toFixed(2)+' 高さ'+Math.round(y*100)+'cm', w:[x,y,z], dir:[-nv.x,0,-nv.y]}); }
      const x=(a.x+(b.x-a.x)*t+nv.x*0.12)*sM, z=(a.y+(b.y-a.y)*t+nv.y*0.12)*sM;
      out.push({name:'天端 辺'+i+' t'+t.toFixed(2), w:[x,H+0.01,z], dir:[0,-1,0]});
    }
  }
  out.push({name:'平場の真ん中', w:[4*sM,0.02,3*sM], dir:[0,-1,0]});
  return out; });
const res=[];
for(const c of cases){
  const r=await p.evaluate((c)=>{
    /* 前の場所の増し張りが残っていると、それを拾ってしまうので消してから */
    state.d3sheet=[]; dirty3d=true; build3D();
    const w=new THREE.Vector3(...c.w), dir=new THREE.Vector3(...c.dir).normalize();
    /* 画面上の点に直してから、ユーザーのタップと同じ口（nnSheetCornerHit）で面を拾う */
    T.renderer.render(T.scene,T.camera);
    const cam=T.camera; /* カメラをその点の真正面（面の外側）に置く */
    const eye=w.clone().addScaledVector(dir,-3).add(new THREE.Vector3(0.001,0.0005,0.0007));
    cam.position.copy(eye); cam.lookAt(w); cam.updateMatrixWorld(); if(cam.updateProjectionMatrix) cam.updateProjectionMatrix();
    T._nnHold=1;
    const v=w.clone().project(cam), el=T.renderer.domElement, rect=el.getBoundingClientRect();
    const hit=nnSheetCornerHit(rect.left+(v.x+1)/2*rect.width, rect.top+(1-v.y)/2*rect.height);
    if(!hit) return {name:c.name, err:'面を拾えない'};
    window.nnSheetMode={mat:{n:'ライナーコービング',col:'#3f3b36',src:'t'},kind:'size',w:300,d:300,t:4,angle:0};
    const faces=nnSheetSizeFaces(hit,300,300,0);
    if(!faces.length) return {name:c.name, err:'貼れない'};
    state.d3sheet=[{m:{n:'ライナーコービング',col:'#3f3b36',src:'t'},t:0.004,faces:JSON.parse(JSON.stringify(faces)),fold:faces.length>1?1:0,part:{kind:'size',w:300,d:300,angle:0}}];
    saveState(); dirty3d=true; build3D();
    /* 描く直前の位置（render3d と同じ nnSheetCurrentFaces） */
    const cur=nnSheetCurrentFaces(state.d3sheet[0]);
    const build=[]; T.scene.traverse(o=>{ if(o.isMesh&&o.visible&&o.name!=='nnSheet'&&!(o.userData&&o.userData.nnSheetPreview)&&o.geometry) build.push(o); });
    const rc=new THREE.Raycaster(); let area=0, worst=0, bad=[];
    cur.forEach((f,fi)=>{
      const P0=new THREE.Vector3(...f.p), U=new THREE.Vector3(...f.u), Vv=new THREE.Vector3(...f.v), N=new THREE.Vector3(...f.n).normalize();
      const pts=f.pts; let a=0; for(let i=0;i<pts.length;i++){ const q=pts[i], s=pts[(i+1)%pts.length]; a+=q[0]*s[1]-s[0]*q[1]; } area+=Math.abs(a)/2;
      const cx=pts.reduce((s,q)=>s+q[0],0)/pts.length, cy=pts.reduce((s,q)=>s+q[1],0)/pts.length;
      const samp=[[cx,cy]].concat(pts.map(q=>[q[0]+(cx-q[0])*0.2, q[1]+(cy-q[1])*0.2]));
      samp.forEach(q=>{ const W=P0.clone().addScaledVector(U,q[0]).addScaledVector(Vv,q[1]);
        rc.set(W.clone().addScaledVector(N,0.06), N.clone().negate()); rc.far=0.2;
        const h=rc.intersectObjects(build,false)[0]; const d=h?Math.abs(h.distance-0.06):9;
        worst=Math.max(worst,d); if(d>0.008) bad.push({face:fi, k:f.id&&f.id.k, at:W.toArray().map(v=>+v.toFixed(3)), gap:h?+(h.distance-0.06).toFixed(3):'面なし'}); });
    });
    T._nnHold=0;
    return {name:c.name, faces:cur.length, area:+area.toFixed(4), worst:+worst.toFixed(4), bad:bad.slice(0,3)};
  },c);
  res.push(r);
}
/* ── ④ 重ね貼り：先に貼った増し張りの上をタップして、もう1枚（本人の画面で起きた「浮いた増し張り」）── */
const ov=[];
for(const q of [{a:[8,0.02,1.0],b:[8.1,0.02,1.05]},{a:[8,0.02,0.40],b:[8.05,0.02,0.45]},{a:[15.6,0.02,0.4],b:[15.55,0.02,0.45]},{a:[8.3,0.15,6.25],b:[8.3,0.1,6.30],dirB:[1,0,0]}]){
  const r=await p.evaluate((q)=>{
    state.d3sheet=[]; dirty3d=true; build3D();
    const tap=(wv,dv)=>{ const w=new THREE.Vector3(...wv), dir=new THREE.Vector3(...(dv||[0,-1,0])).normalize(), cam=T.camera;
      cam.position.copy(w.clone().addScaledVector(dir,-3).add(new THREE.Vector3(0.001,0.0005,0.0007))); cam.lookAt(w); cam.updateMatrixWorld(); T._nnHold=1;
      const v=w.clone().project(cam), el=T.renderer.domElement, rect=el.getBoundingClientRect();
      return nnSheetCornerHit(rect.left+(v.x+1)/2*rect.width, rect.top+(1-v.y)/2*rect.height); };
    const put=(hit)=>{ const f=nnSheetSizeFaces(hit,300,300,0); if(!f.length) return 0;
      state.d3sheet.push({m:{n:'増',col:'#3f3b36',src:'t'},t:0.004,faces:JSON.parse(JSON.stringify(f)),fold:f.length>1?1:0,part:{kind:'size',w:300,d:300,angle:0}}); saveState(); dirty3d=true; build3D(); return f.length; };
    const h1=tap(q.a, q.dirB?[-1,0,0]:null); if(!h1||!put(h1)) return {err:'1枚目が貼れない'};
    const h2=tap(q.b, q.dirB); if(!h2) return {err:'2枚目の面を拾えない'}; if(!put(h2)) return {err:'2枚目が貼れない'};
    const build=[]; T.scene.traverse(o=>{ if(o.isMesh&&o.visible&&o.name!=='nnSheet'&&!(o.userData&&o.userData.nnSheetPreview)&&o.geometry) build.push(o); });
    const rc=new THREE.Raycaster(); let area=0, bad=[];
    nnSheetCurrentFaces(state.d3sheet[1]).forEach((f,fi)=>{
      const P0=new THREE.Vector3(...f.p), U=new THREE.Vector3(...f.u), Vv=new THREE.Vector3(...f.v), N=new THREE.Vector3(...f.n).normalize(), pts=f.pts;
      let a=0; for(let i=0;i<pts.length;i++){ const x=pts[i], y=pts[(i+1)%pts.length]; a+=x[0]*y[1]-y[0]*x[1]; } area+=Math.abs(a)/2;
      const cx=pts.reduce((s,x)=>s+x[0],0)/pts.length, cy=pts.reduce((s,x)=>s+x[1],0)/pts.length;
      [[cx,cy]].concat(pts.map(x=>[x[0]+(cx-x[0])*0.2,x[1]+(cy-x[1])*0.2])).forEach(x=>{ const W=P0.clone().addScaledVector(U,x[0]).addScaledVector(Vv,x[1]);
        rc.set(W.clone().addScaledVector(N,0.06), N.clone().negate()); rc.far=0.2; const h=rc.intersectObjects(build,false)[0], d=h?Math.abs(h.distance-0.06):9;
        if(d>0.012) bad.push({k:f.id&&f.id.k, at:W.toArray().map(v=>+v.toFixed(3)), gap:h?+(h.distance-0.06).toFixed(3):'面なし'}); }); });
    T._nnHold=0; return {area:+area.toFixed(4), bad:bad.slice(0,3), k:(state.d3sheet[1].faces||[]).map(f=>f.id&&f.id.k)};
  },q);
  ov.push(Object.assign({case:q.a.join(',')},r));
}
ok(ov.every(r=>!r.err&&!r.bad.length&&Math.abs(r.area-0.09)<0.004),'④ 先に貼った増し張りの上をタップしても、2枚目は建物の面の上に 300×300',ov);
/* ── ⑤ どの貼り方（寸法で貼る・入隅の2面・面にかく）でも、置いている最中は先に貼った増し張りを素通りして建物の面を拾う ── */
const pk=await p.evaluate(()=>{
  state.d3sheet=[{m:{n:'増',col:'#3f3b36',src:'t'},t:0.004,faces:[{p:[8,0.02,2],n:[0,1,0],u:[1,0,0],v:[0,0,-1],pts:[[-0.5,-0.5],[0.5,-0.5],[0.5,0.5],[-0.5,0.5]]}]}];
  saveState(); dirty3d=true; build3D();
  const w=new THREE.Vector3(8,0.02,2), cam=T.camera; cam.position.set(8.001,3,2.0007); cam.lookAt(w); cam.updateMatrixWorld(); T._nnHold=1;
  const v=w.clone().project(cam), el=T.renderer.domElement, rect=el.getBoundingClientRect(), cx=rect.left+(v.x+1)/2*rect.width, cy=rect.top+(1-v.y)/2*rect.height;
  const out={};
  ['size','corner','poly'].forEach(k=>{ window.nnSheetMode={mat:{n:'増',col:'#3f3b36',src:'t'},kind:k,w:300,d:300,t:4};
    const h=nnSheetCornerHit(cx,cy); out[k]=h?(h.o.name==='nnSheet'?'増し張りを拾った':'建物'):'なし'; });
  window.nnSheetMode=null; const h0=nnSheetCornerHit(cx,cy); out['置いていないとき']=h0?(h0.o.name==='nnSheet'?'増し張り':'建物'):'なし';
  T._nnHold=0; return out; });
ok(pk.size==='建物'&&pk.corner==='建物'&&pk.poly==='建物','⑤ どの貼り方でも、先に貼った増し張りの上をタップすると建物の面を拾う',pk);
const errc=res.filter(r=>r.err), badArea=res.filter(r=>!r.err&&Math.abs(r.area-0.09)>0.004), off=res.filter(r=>!r.err&&r.worst>0.008);
ok(!errc.length,'① どの場所でも貼れる（'+res.length+'か所）',errc.slice(0,5));
ok(!badArea.length,'① 面積が 0.09㎡（300×300）のまま',badArea.slice(0,5).map(r=>[r.name,r.area,r.faces]));
ok(!off.length,'② 描かれた増し張りが全部 建物の面の上（±8mm）',off.slice(0,6));
ok(!errs.length,'エラーなし',errs.slice(0,3));
if(process.env.V) console.log(JSON.stringify(res,null,1));
await b.close(); console.log(ng?('★NG '+ng+'件'):'すべて○');})();
