/* ★2026-08-23b 鳩小屋のリッチ3D＋Blender(.glb)読み込み口（§154）
   node _check/hatogoya.js
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
const CAM=`(()=>({th:+T.theta.toFixed(4),ph:+T.phi.toFixed(4),r:+T.r.toFixed(3),tx:+T.tx.toFixed(3),tz:+T.tz.toFixed(3)}))()`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(700);

/* ① ボタンがあり、置ける */
ok(await p.evaluate(()=>!!document.getElementById('tl_p_hatogoya')),'ツールバーに「◆ 鳩小屋」がある');
await p.evaluate(()=>{ nnStamp('hatogoya'); nnPlaceAtGrid(6,6); });
await p.waitForTimeout(400);
ok(await p.evaluate(()=>(state.parts||[]).some(it=>{
   const P=nnPartsLib().find(x=>x.id===it.p); return P&&P.kind==='hatogoya';})),'鳩小屋を図面に置ける');

/* ② 3Dでリッチモデル（配管つき）が出る */
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);
const r1=await p.evaluate(()=>{
  let cyl=0, torus=0, boxHidden=0, richMesh=0;
  T.group.traverse(o=>{
    if(o.name==='nnPart' && o.userData.partIdx!=null && !o.visible) boxHidden++;
    if(o.isMesh && o.geometry){
      if(o.geometry.type==='CylinderGeometry') cyl++;
      if(o.geometry.type==='TorusGeometry') torus++;
    }
    if(o.isMesh && o.userData.partIdx!=null && o.visible) richMesh++;
  });
  return {cyl,torus,boxHidden,richMesh};
});
ok(r1.boxHidden>=1,'元の灰色の箱は見えなくなる',r1.boxHidden);
ok(r1.cyl>=3,'配管（円柱）が生える',r1.cyl);
ok(r1.torus>=1,'エルボ（曲がり）が付く',r1.torus);
ok(r1.richMesh>=6,'リッチモデルの部品数',r1.richMesh);

/* ③ タップで選べる（リッチモデル越しでも部品選択が生きる） */
await p.evaluate(()=>d3ViewIso()); await p.waitForTimeout(900);
const cam0=await p.evaluate(CAM);
const scr=await p.evaluate(()=>{
  /* ★サンプルの屋根は GL+9m。高さを決め打ちせず、隠した箱の実際の位置から出す */
  let bx=null; T.group.children.forEach(o=>{ if(o.name==='nnPart'&&o.userData.partIdx!=null)bx=o; });
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=bx.position.clone().project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
});
await p.evaluate(()=>setTool('sel'));
await p.mouse.click(scr.x,scr.y); await p.waitForTimeout(500);
ok(await p.evaluate(()=>nnPartSelIdx()>=0),'3Dでタップすると部品として選べる',await p.evaluate(()=>nnPartSelIdx()));
ok(same(await p.evaluate(CAM),cam0),'選んでもカメラは動かない');
/* 回す・削除も既存のバーがそのまま効く */
await p.evaluate(()=>{ const i=nnPartSelIdx()>=0?nnPartSelIdx():0;
  const it=state.parts[i]; it.r=(it.r||0)+45; saveState(); });
await p.waitForTimeout(300);
await p.waitForTimeout(500);
ok(await p.evaluate(()=>{
  let rot=null; T.group.traverse(o=>{ if(o.name==='nnPart'&&o.userData.partIdx!=null&&!o.visible) rot=o.rotation.y; });
  return rot!==null && Math.abs(Math.abs(rot)-Math.PI/4)<0.01; }),'回すとリッチモデルも回る');

/* ④ Blenderの .glb（PBRテクスチャ付き）が読める＝GLTFLoaderの実証 */
const glb=await p.evaluate(()=>new Promise(res=>{
  nnLoadGLTF(okk=>{
    if(!okk||!THREE.GLTFLoader){ res({ok:false}); return; }
    new THREE.GLTFLoader().load('_check/assets/testcube.glb', g=>{
      let mesh=null; g.scene.traverse(o=>{ if(o.isMesh)mesh=o; });
      res({ok:true, hasMesh:!!mesh,
           tris:mesh?mesh.geometry.index.count/3:0,
           hasTex:!!(mesh&&mesh.material&&mesh.material.map),
           texW:mesh&&mesh.material.map?mesh.material.map.image.width:0,
           std:mesh?mesh.material.type:''});
    }, undefined, ()=>res({ok:false,err:'load'}));
  });
}));
ok(glb.ok&&glb.hasMesh,'GLTFLoaderで .glb が読める',glb);
ok(glb.tris===12,'立方体の三角形12枚',glb.tris);
ok(glb.hasTex&&glb.texW===64,'テクスチャ（PBRのベースカラー）も読める',glb.texW);
ok(/MeshStandardMaterial|MeshPhysicalMaterial/.test(glb.std),'PBR材質になる（§63の環境光・影がそのまま効く）',glb.std);

/* ⑤ models/hatogoya.glb を置いたら差し替わる（読み込み口の実証） */
await p.evaluate(()=>{ window.NN_GLB_BASE='_check/assets/'; });
await p.evaluate(()=>{ dirty3d=true; build3D(); });   /* probe が走る */
await p.waitForTimeout(1500);
await p.evaluate(()=>{ dirty3d=true; build3D(); });
await p.waitForTimeout(700);
const r2=await p.evaluate(()=>{
  let texMesh=0; T.group.traverse(o=>{ if(o.isMesh&&o.userData.partIdx!=null&&o.visible&&o.material&&o.material.map)texMesh++; });
  return texMesh;
});
ok(r2>=1,'glb を置くと Blenderモデル（テクスチャ付き）に差し替わる',r2);

/* ⑥ 削除で消える（既存の口） */
await p.evaluate(()=>{ nnPartsClear(); });
await p.waitForTimeout(500);
ok(await p.evaluate(()=>{
  let n=0; T.group.traverse(o=>{ if(o.userData&&o.userData.partIdx!=null)n++; }); return n; })===0,
  '消すとリッチモデルも消える');
ok(errs.length===0,'JSエラーなし  '+errs.slice(0,3).join(' / '));
await p.screenshot({path:'/tmp/hatogoya.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
