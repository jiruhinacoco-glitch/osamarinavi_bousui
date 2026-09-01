/* ★2026-09-02b 空と光（§265③）＋屋上の設備（§265②）の検証
   ・空は3Dの背景と「光」の両方に使う（つやのある防水層に映り込む）
   ・時間帯（朝・昼・夕・夜）で 空・太陽の向き/色/強さ・露出・地面が一式変わる
   ・夜を選ぶと画面も夜に（昼画面／夜画面のボタンと双方向で合う）
   ・手すりは辺ごと。3Dに支柱と横桟が立ち、積算と御見積書に m と 本 で出る
   ・室外機・配管ラック・キュービクル・タラップが置けて、3Dで本物らしい姿になる
   使い方: node _check/sky1.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const scene=()=>{
  state.scaleM=1; state.specCode='X-2';
  state.polys=[{name:'屋根', lv:0, pts:[{x:0,y:0},{x:18,y:0},{x:18,y:12},{x:0,y:12}],
    edges:[0,1,2,3].map(()=>({h:350,w:250,k:'para'}))}];
  state.active=0; saveState(); renderPolyList(); recalc(); draw(); setTab('d3');
};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1240,height:840}});
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

/* ---- ① 図面タブではボタンがある ---- */
ok('ツールバーに「⌐ 手すり」がある', await p.evaluate(()=>!!document.getElementById('tl_tesuri')));
ok('ツールバーに「⚙ 設備」がある', await p.evaluate(()=>!!document.getElementById('tl_setsubi')));
const set=await p.evaluate(()=>{ nnSetsubiPanel();
  return ['aircon','piperack','cubicle','tarap','hatogoya','kaidan']
    .map(k=>!!document.getElementById('tl_p_'+k)); });
ok('「⚙ 設備」に6つの部材がそろう', set.every(Boolean), JSON.stringify(set));
await p.evaluate(()=>{ nnSetsubiPanel(); });

await p.evaluate(scene);
await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.renderer;}catch(_){return false;}},null,{timeout:25000});
await p.waitForTimeout(6000);

/* ---- ② 空（背景・光・太陽・地面） ---- */
const s1=await p.evaluate(()=>({
  kind:nnSkyKind(),
  bgTex:!!(T.scene.background&&T.scene.background.isTexture),
  bgEqui:T.scene.background&&T.scene.background.mapping===THREE.EquirectangularReflectionMapping,
  env:!!T.scene.environment, envI:T.scene.environmentIntensity,
  exp:T.renderer.toneMappingExposure, gnd:!!T.nnGnd,
  bar:!!document.getElementById('nnSkyBar'),
  dir:T.nnSunDir?[+T.nnSunDir.x.toFixed(3),+T.nnSunDir.y.toFixed(3),+T.nnSunDir.z.toFixed(3)]:null
}));
ok('背景が「空の絵」になっている', s1.bgTex && s1.bgEqui);
ok('空を「光」にも使っている（映り込みが出る）', s1.env===true);
ok('地面（うっすら見える板）がある', s1.gnd===true);
ok('3Dに時間帯のボタンがある', s1.bar===true);

/* ★2026-09-02c 地面は「絵（テクスチャ）」を1枚も使わない。
   iPhone は絵の置き場が足りなくなると中身が化け、地面が虹色のまだらになった（実機）。
   頂点の濃さだけでぼかしを作れば、化けようがない。 */
const g1=await p.evaluate(()=>{const g=T.nnGnd; if(!g) return null;
  const m=g.material; return {map:!!m.map, vc:!!m.vertexColors,
    a4:!!(g.geometry.attributes.color&&g.geometry.attributes.color.itemSize===4),
    tris:g.geometry.index?g.geometry.index.count/3:0, side:m.side===THREE.FrontSide};});
ok('★地面に絵（テクスチャ）を使っていない', !!g1 && g1.map===false, JSON.stringify(g1));
ok('★地面のぼかしは頂点の濃さで作っている', !!g1 && g1.vc===true && g1.a4===true && g1.tris>100,
   JSON.stringify(g1));
ok('太陽の向きが空の絵から決まっている', !!s1.dir && s1.dir[1]>0, JSON.stringify(s1.dir));

/* 太陽の向きが「空の絵の中の太陽」と合っているか（投影して確かめる） */
const align=await p.evaluate(()=>{
  const P=NN_SKY[nnSkyKind()], d=T.nnSunDir;
  const u=Math.atan2(d.z,d.x)/(Math.PI*2)+0.5;
  const v=Math.asin(Math.max(-1,Math.min(1,d.y/Math.hypot(d.x,d.y,d.z))))/Math.PI+0.5;
  return {du:Math.abs(((u-P.az)%1+1.5)%1-0.5), dv:Math.abs(v-(0.5+P.el*0.5))};
});
ok('★太陽の向きと、空の絵の太陽の位置が一致する', align.du<0.01 && align.dv<0.01, JSON.stringify(align));

/* 時間帯を変えると一式変わる */
const list=[];
for(const k of ['asa','hiru','yuu','yoru']){
  await p.evaluate(kk=>nnSkySet(kk), k); await p.waitForTimeout(400);
  list.push(await p.evaluate(()=>({k:nnSkyKind(), sun:+T.sun.intensity.toFixed(2),
    exp:+T.renderer.toneMappingExposure.toFixed(2), col:T.sun.color.getHexString(),
    theme:(typeof nnTheme!=='undefined')?nnTheme:'?'})));
}
ok('時間帯4つで太陽の強さが変わる', new Set(list.map(x=>x.sun)).size===4, JSON.stringify(list.map(x=>x.sun)));
ok('時間帯4つで太陽の色が変わる', new Set(list.map(x=>x.col)).size===4);
/* ★空の絵・光を4つとも抱え込まない（絵の置き場が足りなくなると、他の絵が化ける） */
const tx0=await p.evaluate(()=>T.renderer.info.memory.textures);
for(const k of ['asa','hiru','yuu','yoru','asa','hiru']){
  await p.evaluate(kk=>nnSkySet(kk), k); await p.waitForTimeout(250);
}
const tx1=await p.evaluate(()=>T.renderer.info.memory.textures);
ok('★時間帯を一巡してもGPUの絵が増え続けない', (tx1-tx0)<=2, 'before='+tx0+' after='+tx1);
ok('★夜を選ぶと画面も夜になる', list[3].theme==='dark' && list[1].theme==='light',
   list.map(x=>x.k+':'+x.theme).join(','));
/* 昼画面／夜画面のボタンからも合う */
await p.evaluate(()=>nnSetTheme('light')); await p.waitForTimeout(300);
ok('★昼画面に戻すと時間帯も昼に戻る', (await p.evaluate(()=>nnSkyKind()))!=='yoru');
await p.evaluate(()=>nnSkySet('hiru')); await p.waitForTimeout(300);

/* ---- ③ 手すり（辺ごと） ---- */
await p.evaluate(()=>{ nnTesuriSet(0,true); }); await p.waitForTimeout(900);
const t1=await p.evaluate(()=>{
  let n=0, minY=1e9, maxY=-1e9;
  T.scene.traverse(o=>{ if(o.name==='nnTesuri'){ n=o.children.length;
    o.children.forEach(c=>{ minY=Math.min(minY,c.position.y); maxY=Math.max(maxY,c.position.y); }); } });
  const rows=nnEstimateData().rows.filter(r=>/手すり|支柱/.test(r.n));
  return {n, minY:+minY.toFixed(2), maxY:+maxY.toFixed(2), agg:nnTesuriAgg(),
    rows:rows.map(r=>({n:r.n,q:r.q,u:r.u})), on:nnTesuriOn(0)};
});
ok('手すりが3Dに立つ（支柱＋横桟）', t1.n>=20, t1.n+'本');
ok('手すりの長さ＝外周60m', Math.abs(t1.agg.len-60)<0.01, t1.agg.len+'m');
ok('支柱の本数が出る', t1.agg.posts>=48, t1.agg.posts+'本');
ok('★御見積書（紙）にも m と 本 で出る',
   t1.rows.length===2 && t1.rows[0].u==='m' && t1.rows[1].u==='本', JSON.stringify(t1.rows));
ok('横桟はパラペットの上（天端＋1.1m）にある', t1.maxY>0.35 && t1.maxY<0.35+1.2, t1.maxY);

/* 保存して開き直しても残る（★ek と normE の両方に足したか） */
const keep=await p.evaluate(()=>{ saveState();
  const raw=localStorage.getItem('nn_zumen_v1'); const o=JSON.parse(raw);
  let n=0; (o.polys||[]).forEach(pp=>(pp.edges||[]).forEach(e=>{ if(e.tesuri)n++; }));
  return n; });
ok('★保存に手すりが書かれる（normE）', keep===4, keep+'辺');
const alive=await p.evaluate(()=>{ loadState(); return nnTesuriList().length; });
ok('★開き直しても手すりが残る（ek）', alive===4, alive+'辺');

await p.evaluate(()=>{ nnTesuriSet(0,false); }); await p.waitForTimeout(700);
ok('外すと3Dから消える', (await p.evaluate(()=>{ let n=0;
  T.scene.traverse(o=>{ if(o.name==='nnTesuri') n=o.children.length; }); return n; }))===0);

/* ---- ④ 屋上の設備が置けて、3Dで本物らしい姿になる ---- */
await p.evaluate(()=>{
  ['aircon','piperack','cubicle','tarap'].forEach((k,i)=>{ nnStamp(k); nnPlaceAtGrid(3+i*4,5); });
  setTool('sel'); dirty3d=true; build3D();
});
await p.waitForTimeout(2500);
const eq=await p.evaluate(()=>{
  const out={};
  T.group.children.forEach(g=>{
    if(g.userData.partIdx==null || g.name==='nnPart') return;
    const it=state.parts[g.userData.partIdx]; if(!it)return;
    const P=nnPartsLib().find(x=>x.id===it.p); if(!P)return;
    const bb=new THREE.Box3().setFromObject(g); const sz=new THREE.Vector3(); bb.getSize(sz);
    let m=0; g.traverse(o=>{ if(o.isMesh)m++; });
    out[P.kind]={h:+sz.y.toFixed(2), mesh:m};
  });
  let hidden=0; T.group.children.forEach(g=>{ if(g.name==='nnPart'&&g.userData.partIdx!=null&&!g.visible)hidden++; });
  return {out, hidden};
});
ok('4つとも3Dで本物らしい姿になる（箱が隠れる）', eq.hidden===4, eq.hidden+'個');
ok('室外機の高さ0.8m・部品が複数', eq.out.aircon && Math.abs(eq.out.aircon.h-0.8)<0.05 && eq.out.aircon.mesh>=10,
   JSON.stringify(eq.out.aircon));
ok('配管ラックに配管がある', eq.out.piperack && eq.out.piperack.mesh>=8, JSON.stringify(eq.out.piperack));
ok('キュービクルの高さ1.9m', eq.out.cubicle && Math.abs(eq.out.cubicle.h-1.94)<0.06, JSON.stringify(eq.out.cubicle));
ok('タラップは縦に立つ（高さ2.4m）', eq.out.tarap && Math.abs(eq.out.tarap.h-2.4)<0.06, JSON.stringify(eq.out.tarap));

/* ---- ⑤ カメラは動かない（§152） ---- */
const cam0=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4)));
await p.evaluate(()=>{ nnSkySet('yuu'); nnTesuriSet(0,true); }); await p.waitForTimeout(900);
const cam1=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4)));
ok('★時間帯を変えても手すりを付けてもカメラは動かない（§152）',
   JSON.stringify(cam0)===JSON.stringify(cam1), JSON.stringify(cam0)+' / '+JSON.stringify(cam1));
ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));

await p.evaluate(()=>{ state.polys=[]; state.parts=[]; state.active=-1; saveState(); });
await p.close(); await b.close();
console.log(R.join('\n'));
console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
process.exit(R.some(x=>x[0]==='★')?1:0);
})();
