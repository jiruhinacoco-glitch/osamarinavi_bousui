/* ★2026-08-29p 現況「躯体」の材質が、下地の切り替えに追従するかの検査
   不具合（本人の指摘）：3Dで下地をW造にしたあとRC造に切り替えると、
   天端（防水層の差し替え材質）だけW造の木のまま残っていた。
   原因＝nn-genkyo-js の memMat のキャッシュキーに下地が入っていなかった。
   見かた：天端・平場の上から光線を落とし、当たった材質の「色の暖かさ」
   （b÷r。木＝約0.33で暖色／RC＝約0.86でほぼ無彩色）で下地を見分ける。
   使い方：node _check/genkyokz.js            … いまのファイル
   　　　　node _check/genkyokz.js <file>    … 別のファイル（例 _before.html）と比較 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const file=process.argv[2]||'zumen_sekisan.html';
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+file,{waitUntil:'load'});
  await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}} );
  await p.evaluate(()=>{
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[],
      edges:pts.map(()=>({h:300, w:250, k:'para'})), genkyo:'body'}];
    state.active=0; try{saveState();}catch(_){}
    setTab('d3');
  });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined' && T && T.group && T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.waitForTimeout(600);

  /* 下地を切り替えて、天端（壁の上・z=0.125）と平場（中央）の材質の色を測る */
  const probe=async(kz,polyKz)=>{
    return await p.evaluate(({kz,polyKz})=>{
      state.kouzou=kz;
      if(polyKz===undefined) delete state.polys[0].kouzou;
      else state.polys[0].kouzou=polyKz;
      build3D();
      T.group.updateMatrixWorld(true);
      const rc=new THREE.Raycaster();
      const objs=[]; T.group.traverse(o=>{ if(o.isMesh && o.visible) objs.push(o); });
      const col=(x,y,z)=>{
        rc.set(new THREE.Vector3(x,y,z), new THREE.Vector3(0,-1,0)); rc.far=3;
        const h=rc.intersectObjects(objs,false)[0];
        if(!h||!h.object.material||!h.object.material.color) return null;
        const c=h.object.material.color; return {r:c.r,g:c.g,b:c.b, warm:c.b/(c.r||1)};
      };
      return { ten:col(3,1,0.125), hira:col(3,1,2) };   /* 天端の帯の上／平場の中央 */
    },{kz,polyKz});
  };

  const NG=[];
  const ok=(c,name,info)=>{ console.log((c?'○':'★NG')+' '+name+(info!==undefined?('　'+info):'')); if(!c)NG.push(name); };
  /* 実測：木 b/r≈0.33／RC b/r≈0.86（材質の色は線形空間なので、見た目の比とは違う） */
  const warm=v=>v&&v.warm<0.55, cool=v=>v&&v.warm>0.70;
  const f=v=>v?('b/r='+v.warm.toFixed(2)):'当たらない';

  const w1=await probe('w');
  ok(warm(w1.ten)&&warm(w1.hira), '① 下地W造：天端・平場が木の色', f(w1.ten)+' / '+f(w1.hira));
  const r1=await probe('rc');
  ok(cool(r1.ten), '② W→RCに切替：天端がRC（コンクリート）の色になる', f(r1.ten));
  ok(cool(r1.hira), '③ W→RCに切替：平場もRCの色になる', f(r1.hira));
  const w2=await probe('w');
  ok(warm(w2.ten)&&warm(w2.hira), '④ RC→Wに戻す：また木の色になる', f(w2.ten)+' / '+f(w2.hira));
  const pk=await probe('rc','w');                       /* 屋根ごとの下地（poly.kouzou）でも効く */
  ok(warm(pk.ten), '⑤ 屋根ごとの下地（全体RC・この屋根だけW）でも木の色', f(pk.ten));
  const pk2=await probe('rc');                          /* 屋根ごとの指定を外すと全体（RC）に戻る */
  ok(cool(pk2.ten), '⑥ 屋根ごとの指定を外すとRCに戻る', f(pk2.ten));
  ok(errs.length===0, 'JSエラーなし', errs.join('|')||'');
  console.log('===', file, ' ★NG', NG.length, NG.join(' / '));
  await b.close();
})();
