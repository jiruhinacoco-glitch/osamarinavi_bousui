/* 貼り物が躯体に食い込む形を探す道具（○/★NGは出さない）。
   いろいろな (u,s) の四角を貼って、検査側で書き下した断面の式で「何m食い込むか」を測る。 */
const FILE=process.argv[2]||'zumen_sekisan.html';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const RX=10, RZ=8, TH=0.25, HH=0.30, MEM=0.012, FO=TH+0.006;
function depth(x,y,z){
  /* ★屋根の外は空。中なら「境界からいちばん近い距離 tin」で断面を見る
     （辺ごとに見ると、辺の端より先まで壁があることにしてしまう） */
  const tin=Math.min(x, RX-x, z, RZ-z);
  let d=-9;
  if(tin>FO) d=Math.max(d, Math.min(MEM-y, tin-FO));                 /* 平場（防水層の中） */
  d=Math.max(d, Math.min(HH+MEM-y, FO-tin, tin+MEM,
      (0.53+MEM*Math.SQRT2-(tin+y))/Math.SQRT2));                    /* 立上り＋天端（面取りで切る） */
  return d;
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(900);
  await p.evaluate(()=>{ state.scaleM=1; state.polys=[{pts:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],
    edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}]; state.d3sheet=[]; saveState(); setTab('d3'); });
  await p.waitForTimeout(2500);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
  /* ★1件ずつ「貼る→描き直しを待つ→頂点を取る」。まとめて回すと前の板が残っていて誤判定になる */
  const setup=await p.evaluate(()=>{
    const P=nnSheetPathAt(new THREE.Vector3(5,0.15,0.256), new THREE.Vector3(0,0,1));
    if(!P) return {noPath:1};
    window.__P=P;
    return {deck:nnSheetPathUS(P,new THREE.Vector3(5,0.012,1.0))[1],
            wall:nnSheetPathUS(P,new THREE.Vector3(5,0.15,0.256))[1],
            top: nnSheetPathUS(P,new THREE.Vector3(5,0.312,0.10))[1],
            out: nnSheetPathUS(P,new THREE.Vector3(5,0.15,-0.012))[1]};
  });
  if(setup.noPath){ console.log('道が取れない'); await b.close(); return; }
  const K=['deck','wall','top','out'], cases=[];
  [[4,6],[8.5,10.5],[9.5,11.5],[-1.5,0.5],[9.9,10.1]].forEach(u=>{
    for(let i=0;i<K.length;i++) for(let j=i;j<K.length;j++){
      let s0=setup[K[i]], s1=setup[K[j]]; if(Math.abs(s0-s1)<1e-6) s1=s0+0.25;
      cases.push({u, s:[s0,s1], lab:u.join('..')+' '+K[i]+'→'+K[j]});
    }
  });
  const res={out:[]};
  for(const c of cases){
    const r=await p.evaluate(c=>{
      state.d3sheet=[];
      window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
      let f=null; try{ f=nnSheetPathFace(window.__P, [[c.u[0],c.s[0]],[c.u[1],c.s[0]],[c.u[1],c.s[1]],[c.u[0],c.s[1]]]); }catch(e){ return {err:'face '+e.message}; }
      if(!f) return {err:'face無し'};
      try{ nnSheetCommit(f); }catch(e){ return {err:e.message}; }
      try{ dirty3d=true; build3D(); }catch(_){}
      return {n:(state.d3sheet&&state.d3sheet[0]?state.d3sheet[0].faces.length:0)};
    }, c);
    if(r.err){ res.out.push({lab:c.lab, err:r.err}); continue; }
    await p.waitForTimeout(320);
    const vs=await p.evaluate(()=>{ const vs=[];
      T.scene.traverse(o=>{ if(!o.isMesh||o.name!=='nnSheet') return;
        o.updateMatrixWorld(true);
        const g=o.geometry, pos=g.attributes&&g.attributes.position; if(!pos) return;
        const v=new THREE.Vector3();
        for(let i=0;i<pos.count;i++){ v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld); vs.push([v.x,v.y,v.z]); } });
      return vs; });
    res.out.push({lab:c.lab, nv:vs.length, vs, nf:r.n});
  }
  let worstAll=0;
  res.out.forEach(r=>{
    if(r.err){ console.log('   -- '+r.lab+'  '+r.err); return; }
    let bad=0, wd=-9, w=null;
    (r.vs||[]).forEach(v=>{ const d=depth(v[0],v[1],v[2]); if(d>0.02){ bad++; if(d>wd){ wd=d; w=[+v[0].toFixed(2),+v[1].toFixed(3),+v[2].toFixed(2),+d.toFixed(3)]; } } });
    if(bad){ worstAll=Math.max(worstAll,wd); console.log('★ '+r.lab+'  面'+r.nf+'  食い込み '+bad+'/'+r.nv+'  最大'+wd.toFixed(3)+'m  例'+JSON.stringify(w)); }
    else console.log('   '+r.lab+'  面'+r.nf+'  ok  ('+r.nv+'点)');
  });
  console.log('最大の食い込み '+worstAll.toFixed(3)+'m   errs '+errs.slice(0,2));
  await b.close();
})();
