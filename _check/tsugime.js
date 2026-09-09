/* ★2026-09-09d §368 増張りの「謎の斜めの線」＝同じ面の上で板が何枚にも割れている継ぎ目。
   デカール（画面から投影して貼る方式）は、かこった形が凹んでいると三角形に切ってから貼るので、
   切れはしが1枚ずつ厚み4mmの板になり、その小口が線に見えていた（本人の指摘）。
   ★検算に製品の関数は使わない：面積は検査側で自分で出し、
     「同じ平面（向きと高さが同じ）の板が2枚以上あるか」を数える。
   使い方: node _check/tsugime.js  ／ node _check/tsugime.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
/* 多角形の面積（検査側で別に計算する） */
function ar2(P){ let a=0; for(let i=0;i<P.length;i++){ const q=P[i], r=P[(i+1)%P.length]; a+=q[0]*r[1]-r[0]*q[1]; } return Math.abs(a)/2; }
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:460},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(900);
  await p.evaluate(()=>{ state.scaleM=1;
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}];
    state.d3sheet=[]; saveState(); setTab('d3'); });
  await p.waitForTimeout(2500);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
  const put=async(W3, cam)=>{
    await p.evaluate(c=>{ Object.assign(T,c); T.rev=(T.rev|0)+1; }, cam);
    await p.waitForTimeout(1300);
    return p.evaluate(W=>{
      state.d3sheet=[];
      window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
      const wv=W.map(a=>new THREE.Vector3(a[0],a[1],a[2]));
      const p0=wv[0].clone(), u0=new THREE.Vector3(1,0,0), v0=new THREE.Vector3(0,0,1);
      const pts=wv.map(w=>{ const d=w.clone().sub(p0); return [d.dot(u0), d.dot(v0)]; });
      nnSheetCommit({p:p0.toArray(), n:[0,1,0], u:u0.toArray(), v:v0.toArray(), pts, w:wv, off:0.012});
      const s=state.d3sheet[0]; if(!s) return {none:1};
      const V=a=>new THREE.Vector3(a[0],a[1],a[2]);
      return {how:(window.__nnWrapUsed||{}).how, n:s.faces.length,
        f:s.faces.map(F=>{ const q0=V(F.p), qu=V(F.u), qv=V(F.v);
          return {k:F.id&&F.id.k, n:F.n.map(v=>+v.toFixed(3)),
            w:F.pts.map(q=>{ const t=q0.clone().addScaledVector(qu,q[0]).addScaledVector(qv,q[1]);
              return [+t.x.toFixed(4),+t.y.toFixed(4),+t.z.toFixed(4)]; }) }; })};
    }, W3);
  };
  /* 同じ平面（向き＋原点までの距離）の板が何枚あるか */
  const samePlane=(r)=>{ const g={};
    (r.f||[]).forEach(F=>{ const n=F.n, w=F.w[0];
      const d=(n[0]*w[0]+n[1]*w[1]+n[2]*w[2]);
      const key=n.map(v=>Math.round(v*100)).join(',')+'@'+Math.round(d*1000);
      g[key]=(g[key]||0)+1; });
    return Math.max.apply(null, Object.keys(g).map(k=>g[k]).concat([0])); };

  /* ① 平場だけの L字（凹んだ形）＝1枚でなければ継ぎ目の線が出る */
  const A=await put([[7.0,0.024,5.0],[9.5,0.024,5.0],[9.5,0.024,7.0],[8.4,0.024,7.0],[8.4,0.024,6.0],[7.0,0.024,6.0]],
    {theta:Math.PI*1.25, phi:1.15, tx:8.4, tz:6.0, r:5.0});
  console.log('  ① '+JSON.stringify({how:A.how, n:A.n, kinds:(A.f||[]).map(x=>x.k+':'+x.w.length)}));
  ok(!A.none && A.n>0, '① 貼れている', A.n);
  ok(samePlane(A)===1, '① 平場のL字が1枚につながる（同じ平面に板は1枚だけ）', samePlane(A));
  /* 面積は検査側で計算：大きい四角 2.5×2.0＝5.00 から 欠き 1.4×1.0＝1.40 を引いて 3.60㎡ */
  const arA=(A.f||[]).reduce((s,F)=>{ const P=F.w.map(w=>[w[0],w[2]]); return s+ar2(P); },0);
  ok(Math.abs(arA-3.6)<0.12, '① 面積は 3.60㎡ のまま（つないでも増減しない）', +arA.toFixed(3));

  /* ② 角をまたぐ形（平場＋2つの立上り）＝折れの3枚は残る（消してはいけない） */
  const B=await put([[8.4,0.024,6.4],[8.4,0.20,7.732],[9.744,0.20,7.732],[9.732,0.20,6.4]],
    {theta:Math.PI*1.25, phi:1.30, tx:9.0, tz:7.0, r:3.2});
  console.log('  ② '+JSON.stringify({how:B.how, n:B.n, kinds:(B.f||[]).map(x=>x.k+':'+x.w.length)}));
  ok(B.n>=2, '② 折れをまたぐ形は面ごとに分かれたまま（folds は本物の線）', B.n);
  ok(samePlane(B)===1, '② それでも同じ平面に板は1枚だけ', samePlane(B));

  /* ③ 本人のスクショに近い形：角の近くで凹んだ形を、平場と立上りにまたがってかく */
  const C=await put([[7.6,0.024,6.0],[9.6,0.024,6.0],[9.6,0.15,7.732],[8.8,0.15,7.732],[8.8,0.024,7.0],[7.6,0.024,7.0]],
    {theta:Math.PI*1.25, phi:1.22, tx:8.8, tz:6.6, r:4.2});
  console.log('  ③ '+JSON.stringify({how:C.how, n:C.n, kinds:(C.f||[]).map(x=>x.k+':'+x.w.length)}));
  ok(C.n>0, '③ 貼れている', C.n);
  ok(samePlane(C)===1, '③ 平場も立上りも、同じ平面には板1枚だけ', samePlane(C));

  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 同じ面の上に継ぎ目の線は出ない');
  await b.close();
})();
