/* §358 貼れる面（paintFaces）の角の輪郭が build3D と同じか。
   これまで壁・面取り・天端は「辺の長さいっぱいの長方形」で、角では実物とずれていた。
   使い方: node _check/pfjoint.js            （いまのファイル）
           node _check/pfjoint.js _before.html（直す前と比べる）
   期待値は手で計算した独立の値（product の関数は使わない）。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const near=(a,b,t)=>Math.abs(a-b)<=(t||0.004);
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(600);

/* ── ① 長方形・全部おなじ高さ（角は留め継ぎ） ───────────────── */
const A=await p.evaluate(()=>{
  state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
    edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}];
  state.holes=null; saveState(); setTab('d3'); return null;
});
await p.waitForTimeout(1800);
const R1=await p.evaluate(()=>{
  const sM=state.scaleM, F=nnPaintFacesTest();
  const pick=(ei,k)=>F.find(f=>f.id&&f.id.pi===0&&f.id.ri===0&&f.id.ei===ei&&f.id.k===k);
  const g=f=>f?{u:f.pts.map(q=>+q[0].toFixed(4)), v:f.pts.map(q=>+q[1].toFixed(4)), sl:+f.sl.toFixed(4)}:null;
  return {sM, len0:20*sM, out:g(pick(0,'out')), wall:g(pick(0,'wall')), top:g(pick(0,'top')), n:F.length};
});
const L0=R1.len0, TH=0.25, CH=0.02;
/* ★2026-09-09 §359 貼れる面は「躯体の面」ではなく **防水層の面** をなぞる。
   立上りの防水は 内面より 6mm 手前（build3D の fo=th+0.006 と同じ数字）なので、
   留め継ぎの寄りも 0.25 ではなく 0.256 になるのが正しい。 */
const FO=TH+0.006;
ok(R1.out&&near(R1.out.u[0],0)&&near(R1.out.u[1],L0), '① 外壁の面は 辺いっぱい 0〜'+L0.toFixed(2)+'m', R1.out&&R1.out.u);
ok(R1.wall&&near(R1.wall.u[0],FO)&&near(R1.wall.u[1],L0-FO),
   '① 立上りの防水面は 両端が 0.256m（＝壁の厚み＋6mm）ぶん内側（留め継ぎ）', R1.wall&&R1.wall.u);
ok(R1.top&&near(R1.top.u[0],TH-CH)&&near(R1.top.u[3],0)&&near(R1.top.u[2],L0),
   '① 天端は台形（面取り側 0.23m〜／外側は辺いっぱい）', R1.top&&R1.top.u);

/* ── ② 1辺だけ高い（角は突き付け） ─────────────────────────── */
await p.evaluate(()=>{ state.polys[0].edges[0]={k:'para',h:600,w:250}; saveState(); build3D(); });
await p.waitForTimeout(900);
const R2=await p.evaluate(()=>{
  const F=nnPaintFacesTest();
  const pick=(ei,k)=>F.find(f=>f.id&&f.id.pi===0&&f.id.ri===0&&f.id.ei===ei&&f.id.k===k);
  const g=f=>f?f.pts.map(q=>+q[0].toFixed(4)):null;
  return {hi:g(pick(0,'out')), hiW:g(pick(0,'wall')), lo:g(pick(1,'out')), loW:g(pick(1,'wall'))};
});
const L1=16*R1.sM;
ok(R2.hi&&near(R2.hi[0],0)&&near(R2.hi[1],L0), '② 高い辺の外壁は 角でまっすぐ（0〜'+L0.toFixed(2)+'m）', R2.hi);
ok(R2.hiW&&near(R2.hiW[0],0)&&near(R2.hiW[1],L0), '② 高い辺の内側も 角まで通す', R2.hiW);
ok(R2.lo&&near(R2.lo[0],TH)&&near(R2.lo[1],L1),  '② となりの低い辺は 高い壁の内側(0.25m)で止まる', R2.lo);
ok(R2.loW&&near(R2.loW[0],TH)&&near(R2.loW[1],L1-FO), '② その防水面は 高い側0.25m・反対は留め継ぎ0.256m', R2.loW);

/* ── ③ 中抜き（穴）の輪でも角の輪郭が出る ───────────────────── */
await p.evaluate(()=>{
  state.polys[0].edges[0]={k:'para',h:300,w:250};
  state.polys[0].holes=[{pts:[{x:6,y:6},{x:10,y:6},{x:10,y:10},{x:6,y:10}],
    edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250}))}];
  saveState(); build3D();
});
await p.waitForTimeout(900);
const R3=await p.evaluate(()=>{
  const F=nnPaintFacesTest(), sM=state.scaleM;
  const f=F.find(x=>x.id&&x.id.ri===1&&x.id.ei===0&&x.id.k==='wall');
  return {len:4*sM, u:f?f.pts.map(q=>+q[0].toFixed(4)):null, n:F.filter(x=>x.id&&x.id.ri===1).length};
});
ok(R3.n>0, '③ 穴の縁にも面ができる（'+R3.n+'枚）');
ok(R3.u && Math.abs((R3.u[0])-(R3.len-R3.u[1]))<0.004 && Math.abs(R3.u[0])>0.001,
   '③ 穴の縁も角で内側に寄る（左右おなじ量）', R3.u);

ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
console.log(ng?('★NG '+ng+'件'):'すべて○');
await b.close(); process.exit(ng?1:0);
})();
