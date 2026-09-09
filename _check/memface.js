/* 防水層の面（build3D）と、貼れる面（paintFaces）の輪郭が **同じ点** かを見る。
   ★2026-09-09 §359 GPTの指摘の良い2点：
     ①輪郭の完全共通化（build3D と paintFaces を同じ jointH から作る）
     ②貼れる面は「躯体の面」ではなく「防水層の面」を基準にする
   直す前（joint と jointH が混ざっていた／躯体の面をなぞっていた）では
   面取りの下の角が食い違うので★NGが出る。
   使い方： node _check/memface.js  ／  node _check/memface.js _before.html            */
const path=require('path');
const { chromium }=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ if(!c) ng++; console.log((c?'  ○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); };
const near=(a,b,e)=>Math.abs(a-b)<=(e==null?0.002:e);

(async()=>{
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await br.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,140)));
  await p.route('**/textures/*', r=>r.abort());      /* 質感を止める（材質の見分けを素直に） */
  await p.goto('http://127.0.0.1:8899/'+FILE, {waitUntil:'load'});
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(400);

  /* 20×16の長方形。辺0だけ高さ600（＝角が突き付けになる） */
  await p.evaluate(()=>{
    state.polys=[]; state.parts=[]; state.d3sol=[]; state.d3sheet=[];
    const e=(h)=>({k:'para',h:h,w:250});
    state.polys.push({pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
      edges:[e(600),e(300),e(300),e(300)], lv:0, holes:[]});
    saveState(); if(window.renderPolyList) renderPolyList();
  });
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.scene, null, {timeout:20000});
  await p.waitForTimeout(1400);

  const R=await p.evaluate(()=>{
    const V=(a)=>new THREE.Vector3(a[0],a[1],a[2]);
    const sp=specOfPoly(state.polys[0]); const memc=nnMemColor(sp);
    /* 防水層のメッシュの頂点（world）を集める */
    const pts=[]; const seen=[];
    T.group.traverse(function(o){
      if(!o.isMesh||!o.geometry||!o.material) return;
      const m=o.material; if(!m.polygonOffset) return;
      if(!m.color||m.color.getHex()!==memc) return;
      seen.push(o.geometry.type);
      o.updateMatrixWorld(true);
      const pa=o.geometry.attributes&&o.geometry.attributes.position; if(!pa) return;
      for(let i=0;i<pa.count;i++){
        const v=new THREE.Vector3().fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld);
        pts.push([v.x,v.y,v.z]);
      }
    });
    /* 面取りの防水層（slope 6頂点・上端が lv+hh+0.012） */
    const chams=[];
    T.group.traverse(function(o){
      if(!o.isMesh||!o.geometry||!o.material) return;
      const m=o.material; if(!m.polygonOffset||!m.color||m.color.getHex()!==memc) return;
      const pa=o.geometry.attributes&&o.geometry.attributes.position;
      if(!pa||pa.count!==6) return;
      o.updateMatrixWorld(true);
      const ws=[]; for(let i=0;i<6;i++) ws.push(new THREE.Vector3().fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld));
      const ys=ws.map(w=>w.y), lo=Math.min(...ys), hi=Math.max(...ys);
      chams.push({lo:lo, hi:hi, bot:ws.filter(w=>w.y<lo+1e-4).map(w=>[w.x,w.z])});
    });
    /* paintFaces の面（wall/cham/top）の角を world に */
    const F=nnPaintFacesTest();
    function corners(f){ const p0=V(f.p),u=V(f.u),v=V(f.v);
      return f.pts.map(q=>{ const w=p0.clone().addScaledVector(u,q[0]).addScaledVector(v,q[1]); return [w.x,w.y,w.z]; }); }
    const out={};
    ['wall','cham','top'].forEach(function(k){
      out[k]=[];
      for(let ei=0;ei<4;ei++){
        const f=F.find(x=>x.id&&x.id.pi===0&&x.id.ri===0&&x.id.ei===ei&&x.id.k===k);
        if(f) out[k].push({ei:ei, c:corners(f)});
      }
    });
    return {mem:pts, chams:chams, faces:out, nmesh:seen.length, kinds:seen};
  });

  ok(R.nmesh>0, '防水層のメッシュが見つかる（'+R.nmesh+'枚）', R.kinds.slice(0,6));

  /* ── 角の（x,z）が、防水層のメッシュの頂点とぴったり一致するか ── */
  function planNear(c){ let b=1e9;
    for(const q of R.mem){ const d=Math.hypot(q[0]-c[0], q[2]-c[2]); if(d<b) b=d; }
    return b; }
  ['wall','cham','top'].forEach(function(k){
    let worst=0, where=null;
    (R.faces[k]||[]).forEach(function(F){ F.c.forEach(function(c){
      const d=planNear(c); if(d>worst){ worst=d; where=F.ei; } }); });
    ok(worst<0.002, k+' の角は 防水層のメッシュと同じ位置（ずれ '+(worst*1000).toFixed(1)+'mm・辺'+where+'）', +(worst*1000).toFixed(2));
  });

  /* ── 面取りの下の角＝立上りの上の角（joint と jointH が混ざっていないか） ── */
  let worstC=0;
  (R.faces.cham||[]).forEach(function(F){
    const bot=F.c.filter((c,i)=>i<2);            /* pts[0],pts[1] が s=s0 側＝下 */
    bot.forEach(function(c){
      let b=1e9;
      R.chams.forEach(function(ch){ ch.bot.forEach(function(q){
        const d=Math.hypot(q[0]-c[0], q[1]-c[2]); if(d<b) b=d; }); });
      if(b>worstC) worstC=b;
    });
  });
  ok(worstC<0.002, '面取りの防水層の下の角も同じ点（ずれ '+(worstC*1000).toFixed(1)+'mm）', +(worstC*1000).toFixed(2));

  /* ── 貼れる面が「防水層の面」を基準にしているか（躯体の面ではない） ── */
  const R3=await p.evaluate(()=>{
    const F=nnPaintFacesTest();
    const f=F.find(x=>x.id&&x.id.pi===0&&x.id.ri===0&&x.id.ei===1&&x.id.k==='wall');
    if(!f) return null;
    const p0=new THREE.Vector3(f.p[0],f.p[1],f.p[2]);
    const poly=state.polys[0], sM=state.scaleM||0.5;
    const a=poly.pts[1], b=poly.pts[2];
    const nr=ringNormal(poly, poly.pts, a, b);          /* 内向き */
    const A=new THREE.Vector3(a.x*sM,(+poly.lv||0),a.y*sM);
    const t=new THREE.Vector3().subVectors(p0,A).dot(new THREE.Vector3(nr.x,0,nr.y));
    return {t:+t.toFixed(4), y:+(p0.y-(+poly.lv||0)).toFixed(4), th:nnWallTh(ek(poly.edges[1]))};
  });
  ok(R3 && near(R3.t, R3.th+0.006), '立上りの貼れる面は 躯体の内面より 6mm 手前（防水層の面）', R3);
  ok(R3 && near(R3.y, 0.012), '立上りの貼れる面の足元は 平場の防水層の上（＋12mm）', R3&&R3.y);

  ok(errs.length===0, 'JSエラーなし', errs.slice(0,3));
  console.log(ng?('★NG '+ng+' 件'):'すべて○');
  await br.close(); process.exit(ng?1:0);
})();
