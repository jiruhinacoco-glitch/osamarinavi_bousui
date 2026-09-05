/* 防水シートが「面の角が変わるところ」で巻けるか（§297）
   本人の指摘「立上りから平場や、傾斜面から立上りといった、面の角度が変わるところに
   追随できていない。これは致命的」
   使い方： node _check/wrap1.js  ／ 直す前と比べる： node _check/wrap1.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m)=>{ if(!c)ng++; console.log((c?'○':'★NG')+' '+m); };
const near=(a,b,t)=>Math.abs(a-b)<=(t||0.01);
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(700);
await p.evaluate(()=>{
  /* 20×16マス（1マス0.5m＝10×8m）・立上り300・天端250・面取り20 */
  state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
    edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}];
  saveState(); setTab('d3');
});
await p.waitForTimeout(2500);

const has=await p.evaluate(()=>typeof window.nnSheetWrap==='function');
ok(has, '① 巻く仕組み（nnSheetWrap）がある');
if(!has){ console.log('--- ★NG '+ng+' 件 ---'); await b.close(); process.exit(1); }

/* 平場に、辺0（z=0 の壁）をまたぐ長方形をかく。
   幅 u=3〜5m（2m）、z=-0.40（外壁側へ0.40m）〜 +1.00（平場の中） ＝ 道のり1.40m */
const R=await p.evaluate(()=>{
  const poly=state.polys[0];
  const hf=window.nnDeckHFn?nnDeckHFn(poly):null;
  const y=(hf?hf(5,1):0)+0.012;
  const face={p:[0,y,0],n:[0,1,0],u:[1,0,0],v:[0,0,1],pts:[[3,-0.4],[5,-0.4],[5,1.0],[3,1.0]]};
  const fs=window.nnSheetWrap(face);
  function area(f){ let a=0,P=f.pts; for(let i=0;i<P.length;i++){const q=P[i],r=P[(i+1)%P.length]; a+=q[0]*r[1]-r[0]*q[1];} return Math.abs(a)/2; }
  return {n:fs.length, sum:+fs.reduce((a,f)=>a+area(f),0).toFixed(4),
    ns:fs.map(f=>f.n.map(v=>+v.toFixed(2))),
    hs:fs.map(f=>{ let lo=1e9,hi=-1e9; f.pts.forEach(q=>{lo=Math.min(lo,q[1]);hi=Math.max(hi,q[1]);}); return +(hi-lo).toFixed(3); }),
    ws:fs.map(f=>{ let lo=1e9,hi=-1e9; f.pts.forEach(q=>{lo=Math.min(lo,q[0]);hi=Math.max(hi,q[0]);}); return +(hi-lo).toFixed(3); })};
});
ok(R.n===5, '① 平場→立上り→面取り→天端→外壁 の5面に巻く（'+R.n+'面）');
ok(R.ws.every(w=>near(w,2.0)), '① どの面も幅2.0m（'+R.ws.join('/')+'）');
ok(near(R.hs.reduce((a,b)=>a+b,0), 1.40, 0.02), '① 巻いた長さの合計＝かいた1.40m（'+R.hs.reduce((a,b)=>a+b,0).toFixed(3)+'）');
ok(near(R.sum, 2.80, 0.05), '① 面積の合計＝2.80㎡（'+R.sum+'）');
const nn=JSON.stringify(R.ns);
ok(R.ns.some(v=>near(v[1],1)&&near(v[2],0)), '② 平場の面（上向き）がある '+nn);
ok(R.ns.some(v=>near(v[1],0)&&near(v[2],1)), '② 立上りの内側の面（屋根を向く）がある');
ok(R.ns.some(v=>near(v[1],0.707,0.05)&&near(v[2],0.707,0.05)), '② 面取りの斜面（45度）がある');
ok(R.ns.some(v=>near(v[1],0)&&near(v[2],-1)), '② 外壁の面（外を向く）がある');

/* またがない形は1面のまま */
const R2=await p.evaluate(()=>{
  const poly=state.polys[0];
  const hf=window.nnDeckHFn?nnDeckHFn(poly):null;
  const y=(hf?hf(5,3):0)+0.012;
  return window.nnSheetWrap({p:[0,y,0],n:[0,1,0],u:[1,0,0],v:[0,0,1],
    pts:[[3,2.0],[5,2.0],[5,4.0],[3,4.0]]}).length;
});
ok(R2===1, '③ 角をまたがない形は1面のまま（'+R2+'）');

/* 立上りの内側にかいて、平場へ折り返す（逆向きも巻ける） */
const R3=await p.evaluate(()=>{
  /* 立上りの内側の面：p=(0, lv, th)、u=+x、v=+y、n=+z */
  const th=0.25;
  return window.nnSheetWrap({p:[0,0,th],n:[0,0,1],u:[1,0,0],v:[0,1,0],
    pts:[[6,-0.3],[7,-0.3],[7,0.2],[6,0.2]]}).length;   /* y=-0.3 は平場側へはみ出す */
});
ok(R3>=2, '③ 立上り→平場へも巻ける（'+R3+'面）');

/* 実際に置いてみる（3Dに層が出る・保存される） */
const R4=await p.evaluate(async()=>{
  window.nnSheetMode={kind:'draw', mat:{n:'テスト防水材', col:'#3a7', src:''}, t:4};
  const poly=state.polys[0];
  const hf=window.nnDeckHFn?nnDeckHFn(poly):null;
  const y=(hf?hf(5,1):0)+0.012;
  window.nnSheetCommit({p:[0,y,0],n:[0,1,0],u:[1,0,0],v:[0,0,1],pts:[[3,-0.4],[5,-0.4],[5,1.0],[3,1.0]]});
  window.nnSheetMode=null;
  build3D();
  let mesh=0; T.scene.traverse(o=>{ if(o.userData&&o.userData.nnSheet!=null) mesh++; });
  const s=(state.d3sheet||[]);
  return {n:s.length, faces:s[0]?s[0].faces.length:0, fold:s[0]?s[0].fold:0, mesh:mesh};
});
ok(R4.n===1 && R4.faces===5, '④ 置くと1件・5面で保存される（'+R4.n+'件/'+R4.faces+'面）');
ok(R4.fold===1, '④ 巻いた印が付く');
const R5=await p.evaluate(()=>{ saveState(); return 1; });
await p.reload(); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(1200);
const R6=await p.evaluate(()=>{ const s=(state.d3sheet||[]); return {n:s.length, faces:s[0]?s[0].faces.length:0}; });
ok(R6.n===1 && R6.faces===5, '④ 開き直しても5面のまま（'+R6.n+'件/'+R6.faces+'面）');

ok(errs.length===0, 'JSエラーなし（'+errs.join(' / ')+'）');
console.log('--- ★NG '+ng+' 件 ---');
await b.close();
process.exit(ng?1:0);
})();
