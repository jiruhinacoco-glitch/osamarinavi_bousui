/* 面（辺・小口）を動かしたとき、となりの壁が斜めにならないか（§304）
   本人の指摘「パラペットを移動すると、垂直に触れているパラペットまで追随して斜め方向になる」
   使い方： node _check/slide1.js  ／ 直す前と比べる： node _check/slide1.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(700);
/* 辺の向き（度）をぜんぶ返す */
async function angs(){ return await p.evaluate(()=>{
  const q=state.polys[0].pts, N=q.length, a=[];
  for(let i=0;i<N;i++){ const s=q[i], e=q[(i+1)%N];
    a.push(+(Math.atan2(e.y-s.y, e.x-s.x)*180/Math.PI).toFixed(2)); }
  return a; }); }
async function setup(){
  await p.evaluate(()=>{
    state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
      edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}];
    saveState(); setTab('d3');
  });
  await p.waitForTimeout(1600);
}
await setup();
await p.waitForFunction(()=>{ try{ return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag); }catch(_){ return false; } },{timeout:20000});
await p.evaluate(()=>{ setTool('sel'); T.theta=-Math.PI/2; T.phi=0.85; T.r=22; T.tx=10; T.tz=8; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(1000);

const has=await p.evaluate(()=>typeof window.nnSlideEnds==='function');
ok(has, '① 辺を動かす道具（nnSlideEnds）がある');

/* ── ① 数値の押し出し：となりの辺の向きが変わらない ── */
if(has){
  const a0=await angs();
  await p.evaluate(()=>{ pick3({p:0,r:-1,e:0,f:'out'}); nnEdgeOffset(2.0); });
  await p.waitForTimeout(500);
  const a1=await angs();
  ok(JSON.stringify(a0)===JSON.stringify(a1), '① 押し出しても4辺の向きは1度も変わらない', {a0,a1});
  const g=await p.evaluate(()=>state.polys[0].pts.map(q=>[q.x,q.y]));
  ok(Math.abs(g[0][1]-(-4))<0.02 && Math.abs(g[1][1]-(-4))<0.02, '① 動かした辺だけが 2.0m（4マス）外へ', g);
  ok(Math.abs(g[2][1]-16)<0.02 && Math.abs(g[3][1]-16)<0.02, '① 向かいの辺は動かない', g);
}

/* ── ② 小口（端部）：頂点1つではなく「となりの壁ごと」動く ── */
await setup();
await p.evaluate(()=>{ setTool('sel'); });
async function dragEnd(F, dx){
  const c=await p.evaluate((F)=>{
    pick3(null); pick3({p:0,r:-1,e:0,f:F});
    let hl=null; T.scene.traverse(o=>{ if(o.userData&&o.userData.face===F&&o.geometry) hl=o; });
    if(!hl) return null; hl.updateMatrixWorld(true);
    const v=new THREE.Vector3(); hl.geometry.computeBoundingBox(); hl.geometry.boundingBox.getCenter(v); hl.localToWorld(v);
    const q=v.clone().project(T.camera), r=T.renderer.domElement.getBoundingClientRect();
    return {x:r.left+(q.x+1)/2*r.width, y:r.top+(-q.y+1)/2*r.height};
  }, F);
  if(!c) return false;
  await p.waitForTimeout(300);
  await p.mouse.move(c.x,c.y); await p.mouse.down();
  await p.mouse.move(c.x+dx, c.y, {steps:6}); await p.waitForTimeout(250); await p.mouse.up();
  await p.waitForTimeout(500); return true;
}
const b0=await angs();
const moved=await dragEnd('endB', 120);
ok(moved, '② 小口（端部）をつかめる');
const b1=await angs();
const g2=await p.evaluate(()=>state.polys[0].pts.map(q=>[+q.x.toFixed(2),+q.y.toFixed(2)]));
ok(JSON.stringify(b0)===JSON.stringify(b1), '② 小口を動かしても4辺の向きは1度も変わらない（斜めにならない）', {b0,b1});
const w0=20, w1=Math.abs(g2[1][0]-g2[0][0]);
ok(Math.abs(w1-w0)>0.5, '② 動かした先の壁が前後に動いて、屋根の幅が変わる', {幅:w1});
ok(Math.abs(g2[1][0]-g2[2][0])<0.02, '② その壁は「まっすぐ」のまま（両端が同じ位置）', g2);

ok(errs.length===0, 'JSエラーなし', errs);
console.log(ng?('★NG '+ng+'件'):'すべて○');
await b.close();
process.exit(ng?1:0);
})();
