/* ★2026-09-06c 端部（小口）の選択面は実形状／面取りの上限を外した（§295）
   使い方: node _check/endface.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:850}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){} state.scaleM=1;
    const pts=[{x:0,y:0},{x:14,y:0},{x:14,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①', lv:3, pts, holes:[], edges:pts.map(()=>({h:600,w:400,k:'para'}))}];
    state.parts=[]; state.d3sol=[]; state.d3sheet=[]; state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} });
  await p.waitForTimeout(700);
  const prof=async(f)=>p.evaluate(async(f)=>{ pick3(null); pick3({p:0,r:-1,e:0,f}); await new Promise(r=>setTimeout(r,400));
    let o=null; T.scene.traverse(x=>{ if(!o&&x.userData&&x.userData.face===f) o=x; }); if(!o) return null;
    o.updateMatrixWorld(true); const a=o.geometry.attributes.position, V=[];
    for(let i=0;i<a.count;i++){ const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);
      if(!V.some(q=>q.distanceTo(v)<0.001)) V.push(v); }
    const ys=V.map(v=>+v.y.toFixed(3)), xs=V.map(v=>+v.x.toFixed(3)), zs=V.map(v=>+v.z.toFixed(3));
    return {n:V.length, yMin:Math.min(...ys), yMax:Math.max(...ys), xs:[...new Set(xs)].sort((a,b)=>a-b), zs:[...new Set(zs)].sort((a,b)=>a-b),
      pts:V.map(v=>[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)])}; },f);
  /* ① 端部の面：四角ではなく5点（天端の内側が面取りで切れている） */
  const eA=await prof('endA');
  ok(eA&&eA.n===5,'端部の面は四角（4点）ではなく、面取りで切れた5点の形',eA&&{n:eA.n});
  ok(eA&&Math.abs(eA.yMin-0)<0.02&&Math.abs(eA.yMax-3.6)<0.02,'躯体の足元（GL0）から天端（3.6m）まで＝途中で終わらない',eA&&{yMin:eA.yMin,yMax:eA.yMax});
  /* 面取り20mm＝天端の内側で 0.02 だけ下がった点がある（y=3.58） */
  ok(eA&&eA.pts.some(q=>Math.abs(q[1]-3.58)<0.005),'天端の内側の角が面取りで 20mm 下がっている',eA&&eA.pts.map(q=>q[1]));
  /* ② 面取りを 380mm に（旧45%＝180mm の上限では止まっていた） */
  const big=await p.evaluate(async()=>{ const ed=state.polys[0].edges[0]; ed.ch=380; saveState(); dirty3d=true; build3D();
    await new Promise(r=>setTimeout(r,700));
    /* 屋根の中から外へ向かって、天端の高さの少し下（斜面の途中）に光線を当てる */
    T.group.updateMatrixWorld(true); const objs=[]; T.group.traverse(o=>{ if(o.isMesh&&o.visible&&!(o.userData&&o.userData.pick))objs.push(o); });
    const rc=new THREE.Raycaster();
    const shootDown=(z)=>{ rc.set(new THREE.Vector3(7, 4.2, z), new THREE.Vector3(0,-1,0)); rc.far=1.5;
      const h=rc.intersectObjects(objs,false); return h.length?+h[0].point.y.toFixed(3):null; };
    /* 辺0＝南（y=0）。壁は z=-0.4..0（内向き法線は +z）。外の面 z=0 の内側 0.2m ＝ z=-0.2 は斜面の途中 */
    /* 辺0＝南（y=0）。内向き法線は +z なので、壁は z=0（外の面）〜z=0.4（内の面） */
    return {mid:shootDown(0.2), outer:shootDown(0.01), ch:state.polys[0].edges[0].ch}; });
  ok(big.ch===380,'面取り 380mm が保たれる（上限で丸められない）',big.ch);
  ok(big.mid!=null&&Math.abs(big.mid-3.42)<0.03,'3Dの斜面が 380mm の面取りどおり（天端から 0.18m 下がる）',big);
  ok(big.outer!=null&&Math.abs(big.outer-3.6)<0.02,'外壁側の天端はそのまま（面取りは内側だけ）',big.outer);
  /* 端部の面も面取りに追従する */
  const eA2=await prof('endA');
  ok(eA2&&eA2.pts.some(q=>Math.abs(q[1]-3.22)<0.02),'端部の面も 380mm の面取りに追従（3.6−0.38＝3.22）',eA2&&eA2.pts.map(q=>q[1]));
  /* ③ 保存・復元 */
  await p.evaluate(()=>saveState()); await p.reload({waitUntil:'load'}); await p.waitForTimeout(1300);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  ok(await p.evaluate(()=>state.polys[0].edges[0].ch)===380,'380mm は保存して開き直しても残る');
  /* ④ アゴありの端部：アゴの形まで含む（10点） */
  const eAgo=await p.evaluate(async()=>{ setTab('d3'); await new Promise(r=>setTimeout(r,900));
    const ed=state.polys[0].edges[1]; ed.ago=1; ed.agoD=120; saveState(); dirty3d=true; build3D(); await new Promise(r=>setTimeout(r,700));
    pick3(null); pick3({p:0,r:-1,e:1,f:'endA'}); await new Promise(r=>setTimeout(r,500));
    let o=null; T.scene.traverse(x=>{ if(!o&&x.userData&&x.userData.face==='endA') o=x; }); if(!o) return null;
    o.updateMatrixWorld(true); const a=o.geometry.attributes.position, V=[];
    for(let i=0;i<a.count;i++){ const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);
      if(!V.some(q=>q.distanceTo(v)<0.001)) V.push(v); }
    return {n:V.length, yMax:Math.max(...V.map(v=>+v.y.toFixed(3)))}; });
  ok(eAgo&&eAgo.n>=8,'アゴのある辺の端部は、アゴの形まで含む（8点以上）',eAgo);
  ok(eAgo&&Math.abs(eAgo.yMax-3.795)<0.02,'アゴのぶん 195mm 高い（3.6+0.195）',eAgo&&eAgo.yMax);
  ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
  await b.close();
  console.log(ng?('★NG '+ng+'件'):'すべて○');
})().catch(e=>{ console.error(e); process.exit(1); });
