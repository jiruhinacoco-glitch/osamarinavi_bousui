/* ★2026-09-08ak §356 GPTの指摘4件（②細い面取りを消さない ③形の変更に追従 ④描画と積算が同じ形
   ①中抜きに貼らない）。使い方: node _check/gptfb.js ／ 直す前と比べる: node _check/gptfb.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(800);
await p.evaluate(()=>{ state.scaleM=1;
  const pts=[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}];
  const hole=[{x:6,y:6},{x:10,y:6},{x:10,y:10},{x:6,y:10}];
  state.polys=[{name:'屋根①',lv:0,pts,holes:[{pts:hole,edges:hole.map(()=>({k:'para',h:300,w:250}))}],
    edges:pts.map(()=>({k:'para',h:300,w:250}))}];
  state.parts=[];state.d3sol=[];state.d3sheet=[]; saveState(); setTab('d3'); });
await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:20000});

/* ③ 形の変更に追従：頂点の数を変えずに屋根を動かしたら、面が作り直されるか */
const has=await p.evaluate(()=>!!window.nnPfKeyTest);
if(!has){ console.log('  ★NG 検査用の口が無い＝直す前の版（③②①④とも未対応）'); console.log('★NG 9件'); await b.close(); process.exit(1); }
const k=await p.evaluate(()=>{ const a=nnPfKeyTest();
  state.polys[0].pts.forEach(q=>{ q.x+=3; }); const b=nnPfKeyTest();
  state.polys[0].pts.forEach(q=>{ q.x-=3; });
  const c=nnPfKeyTest(); state.scaleM=0.5; const d=nnPfKeyTest(); state.scaleM=1;
  const e=nnPfKeyTest(); state.polys[0].holes[0].pts[0].x=5; const f=nnPfKeyTest();
  state.polys[0].holes[0].pts[0].x=6;
  return {moved:a!==b, back:a===c, scale:e!==d, hole:e!==f}; });
ok(k.moved,'③ 屋根を動かしたら面が作り直される（頂点の数が同じでも）',k);
ok(k.back,'③ 戻せば同じ合図に戻る',k);
ok(k.scale,'③ 縮尺を変えたら作り直される',k);
ok(k.hole,'③ 中抜きを変えたら作り直される',k);

/* ② 細い面取りの帯が消えない：面取り10mm・幅50mm ＝ 7.07c㎡ */
const th=await p.evaluate(()=>{ const src=String(window.nnSheetDecalPlane);
  return {flat:/ar<0\.0012/.test(src), shape:/extent2\(/.test(src)}; });
ok(!th.flat && th.shape,'② 面積だけの一律削除をやめ、かたちで見ている',th);

/* ① 中抜きの中には貼らない：穴をまたぐ大きな貼り物 */
await p.evaluate(()=>{ d3ViewPlan(); try{nnRoofFold(true);}catch(_){}
  T.tx=8; T.tz=8; T.r=26; T.phi=0.16; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(1200);
const hole=await p.evaluate(()=>{
  window.nnSheetMode={mat:{n:'T',col:'#333',src:'free'},kind:'poly',w:400,d:200,t:4};
  const F=(nnPaintFacesTest()||[]).find(f=>f.id&&f.id.k==='deck'); if(!F) return {err:'no deck'};
  const P0=new THREE.Vector3().fromArray(F.p),U=new THREE.Vector3().fromArray(F.u),V=new THREE.Vector3().fromArray(F.v);
  const loc=(x,z)=>{ const w=new THREE.Vector3(x,0.012,z).sub(P0); return [w.dot(U),w.dot(V)]; };
  const q=[loc(4,4),loc(12,4),loc(12,12),loc(4,12)];
  const w=[[4,0.012,4],[12,0.012,4],[12,0.012,12],[4,0.012,12]].map(a=>new THREE.Vector3(...a));
  const r=nnSheetDecalPlane(F.p,F.u,F.v,F.n,q,w);
  if(!r) return {err:'no decal'};
  // 穴（6..10 × 6..10）の中に貼られていないか
  /* 見るのは **平場の面だけ**（穴のパラペットの壁は貼れて当たり前） */
  let inHole=0, area=0, nd=0;
  r.forEach(f=>{ if(!f.id||f.id.k!=='deck') return; nd++;
    const p0=new THREE.Vector3().fromArray(f.p),u=new THREE.Vector3().fromArray(f.u),v=new THREE.Vector3().fromArray(f.v);
    area+=f.am||0;
    const c=f.pts.reduce((a,g)=>[a[0]+g[0]/f.pts.length,a[1]+g[1]/f.pts.length],[0,0]);
    const wc=p0.clone().addScaledVector(u,c[0]).addScaledVector(v,c[1]);
    if(wc.x>6.05&&wc.x<9.95&&wc.z>6.05&&wc.z<9.95) inHole++;
    // 頂点が1つでも穴の中にあってもだめ
    f.pts.forEach(g=>{ const w=p0.clone().addScaledVector(u,g[0]).addScaledVector(v,g[1]);
      if(w.x>6.05&&w.x<9.95&&w.z>6.05&&w.z<9.95) inHole++; });
  });
  return {n:r.length, nd, inHole, area:+area.toFixed(2)};
});
ok(!hole.err && hole.inHole===0,'① 中抜きの中には貼られない',hole);
ok(!hole.err && Math.abs(hole.area-48)<3,'① 平場の面積は 8×8−4×4＝48㎡（穴のぶんが抜けている）',hole);

/* ④ 描画と積算が同じ形：形を詰めたら数量も減る */
const q4=await p.evaluate(()=>{
  const f={id:{pi:0,ri:0,ei:0,k:'wall'}, p:[0,0,0],u:[1,0,0],v:[0,1,0],n:[0,0,1],
    pts:[[0,0],[1,0],[1,0.30],[0,0.30]], am:0.30};
  const a=nnFaceAreaTest(f);
  state.polys[0].edges.forEach(e=>{ e.h=150; }); saveState();
  const b=nnFaceAreaTest(f);
  state.polys[0].edges.forEach(e=>{ e.h=300; }); saveState();
  const c=nnFaceAreaTest(f);
  return {before:+a.toFixed(3), after:+b.toFixed(3), back:+c.toFixed(3)};
});
ok(q4.after < q4.before-0.01,'④ 立上りを300→150にしたら数量も減る',q4);
ok(Math.abs(q4.back-q4.before)<0.01,'④ 戻せば数量も戻る',q4);
ok(errs.length===0,'JSエラーなし',errs);
console.log(ng?('★NG '+ng+'件'):'○ 0件'); await b.close(); process.exit(ng?1:0);
})();
