const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/zumen_sekisan.html'); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(600);
// L字：(0,0)-(20,0)-(20,8)-(10,8)-(10,16)-(0,16)  → (10,8) が出隅
await p.evaluate(()=>{ state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:8},{x:10,y:8},{x:10,y:16},{x:0,y:16}],
  edges:[0,1,2,3,4,5].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}]; saveState(); setTab('d3'); });
await p.waitForTimeout(2000);
await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
const R=await p.evaluate(()=>{
  const sM=state.scaleM, out=[];
  const rings=nnRingsAll(state.polys[0]);
  const inRoof=(x,z)=>pointInPoly(rings[0].pts,x/sM,z/sM);
  const corners=[[0,0,'入隅'],[20,0,'入隅'],[20,8,'入隅'],[10,8,'出隅'],[10,16,'入隅'],[0,16,'入隅']];
  for(const [gx,gy,exp] of corners){
    state.d3sheet=[]; window.nnSheetMode={mat:{n:'T',col:'#333',src:'free'},kind:'corner',w:400,d:200,t:4};
    const V=new THREE.Vector3(gx*sM,0,gy*sM); const pt=V.clone(); // 少し屋根側へ
    const r=nnSheetCornerTap({point:pt, n:new THREE.Vector3(0,1,0)});
    const sh=state.d3sheet[0]; if(!sh){ out.push({gx,gy,exp,err:'no sheet'}); continue; }
    // 平場の面（n≈Y）の全頂点＋中心が屋根の中か／壁の面が屋根の中の縁にあるか
    let bad=0, deckA=0, wallA=0, wallIn=0, wallN=0;
    for(const f of sh.faces){
      const P=new THREE.Vector3().fromArray(f.p), U=new THREE.Vector3().fromArray(f.u), Vv=new THREE.Vector3().fromArray(f.v), N=new THREE.Vector3().fromArray(f.n);
      const W=(q)=>P.clone().addScaledVector(U,q[0]).addScaledVector(Vv,q[1]);
      const c=f.pts.reduce((a,q)=>a.add(W(q)),new THREE.Vector3()).multiplyScalar(1/f.pts.length);
      const area=Math.abs(f.pts.reduce((a,q,i)=>{const r2=f.pts[(i+1)%f.pts.length];return a+q[0]*r2[1]-r2[0]*q[1];},0))/2;
      if(Math.abs(N.y)>0.9){ deckA+=area; for(const q of f.pts){ const w=W([q[0]*0.98+c.x*0, q[1]]); } 
        // 頂点を中心へ2%寄せて内外判定
        for(const q of f.pts){ const w=W(q); const s=w.clone().lerp(c,0.03); if(!inRoof(s.x,s.z)) bad++; } }
      else { wallA+=area; wallN++; // 表向きへ5cm進んだ点が屋根の中
        const s=c.clone().addScaledVector(N,0.05); if(inRoof(s.x,s.z)) wallIn++; }
    }
    out.push({gx,gy,exp,kado:sh.kado,faces:sh.faces.length,deckA:+deckA.toFixed(3),wallA:+wallA.toFixed(3),bad,wallN,wallIn,msg:sh.kado});
  }
  return out;
});
for(const r of R){ ok(r.kado===r.exp && r.bad===0 && r.wallIn===2 && r.wallN===2 && Math.abs(r.wallA-0.16)<1e-6 && Math.abs(r.deckA-(r.exp==='入隅'?0.16:0.48))<1e-6, `角(${r.gx},${r.gy}) ${r.exp}`, r); }
ok(errs.length===0,'JSエラーなし',errs);
console.log('★NG'+ng); await b.close(); })();
