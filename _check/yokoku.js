/* ★★2026-09-10 §387 本人の指摘「入隅に貼ったルーフィングが、立上りの入隅を貫通して
   平場に貼られようとしてる。なんで2面あるの？」。

   紫の予告（かいている途中の面）は、巻けなかったとき **1枚の平らな面** に落ちていた。
   平面は無限に伸びるので（罠6）、角や折れ目をまたぐ形では躯体を突き抜けた紫が出る。
   本番の貼り物は §367・§380 で「巻けないなら貼らない」に直してあるのに、
   予告だけが古いままで、**予告と結果が食い違って**いた（§360 の趣旨に反する）。

   この検査は「予告の紫が、本当に躯体の面の上にあるか」を光線で測る。
   ①貼れない面（アゴありの天端）＝紫を出さない ②ふつうの壁＝紫は出て、面の上にある

   使い方: node _check/yokoku.js  ／ node _check/yokoku.js _before.html
   ★直す前の版では①が★NG（貫通した紫が出る）。 */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'  ★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:760},deviceScaleFactor:1});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(1600); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const build=async(ago)=>{
    await p.evaluate(ago=>{ try{localStorage.clear();}catch(_){}
      state.scaleM=1;
      const P=[{x:0,y:0},{x:16,y:0},{x:16,y:12},{x:0,y:12}];
      state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250,ch:30,ago:ago?1:0,agoD:100})),lv:0,name:'屋根①'}];
      state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0;
      saveState(); setTab('d3'); dirty3d=true; try{build3D();}catch(_){} }, ago);
    await p.waitForTimeout(1800);
  };
  await build(true);
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); }); await p.waitForTimeout(1300);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnFocusBtn,#nnQuickBar{display:none!important}'});
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});

  const cam=async(o)=>{ await p.evaluate(o=>{Object.assign(T,o);T.rev=(T.rev|0)+1;},o); await p.waitForTimeout(1400); };
  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  const tap=async(w)=>{ const s=await SCR(w); await p.mouse.click(s.x,s.y); await p.waitForTimeout(340); };
  const draw=async(PT)=>{
    await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(350);
    for(const w of PT) await tap(w);
    return p.evaluate(()=>{const d=nnD3DrawDbg();return d?d.pts.length:-1;});
  };
  /* 紫の面を読み、その中の点の裏に下地があるか測る */
  const pv=async()=>p.evaluate(()=>{
    const rc=new THREE.Raycaster();
    const hid=[]; T.group.traverse(o=>{ if(o.name==='nnSheet'||o.name==='nnSheetLab'){ hid.push([o,o.visible]); o.visible=false; } });
    const res=[];
    T.scene.traverse(o=>{
      if(!(o.parent&&o.parent.name==='nnPvFill'&&o.isMesh)) return;
      o.updateMatrixWorld(true);
      const pos=o.geometry.attributes.position, V=[];
      for(let i=0;i<pos.count;i++) V.push(new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld));
      /* 面の向き（3点から） */
      let nn=new THREE.Vector3(0,1,0);
      if(V.length>=3){ nn=new THREE.Vector3().subVectors(V[1],V[0]).cross(new THREE.Vector3().subVectors(V[2],V[0]));
        if(nn.length()>1e-9) nn.normalize(); }
      const c=new THREE.Vector3(); V.forEach(v=>c.add(v)); c.multiplyScalar(1/(V.length||1));
      const samples=[c].concat(V.map(v=>c.clone().lerp(v,0.8)));
      let miss=0, worst=0;
      samples.forEach(w=>{
        let best=null;
        [nn.clone(), nn.clone().negate()].forEach(d=>{
          rc.set(w.clone().addScaledVector(d,0.06), d.clone().negate());
          const hs=(rc.intersectObjects(T.group.children,true)||[])
            .filter(o2=>o2.object.visible!==false && !(o2.object.userData&&o2.object.userData.pick) && o2.object.name!=='nnPvDot');
          if(hs.length){ const dd=Math.abs(hs[0].distance-0.06); if(best===null||dd<best) best=dd; }
        });
        if(best===null) miss++; else if(best>worst) worst=best;
      });
      res.push({下地なし:miss, 一番離れてるmm:Math.round(worst*1000)});
    });
    hid.forEach(([o,v])=>{o.visible=v;});
    return res;
  });

  console.log('① アゴあり・天端（§380で「防水を張らない面」＝貼れない）');
  await cam({theta:Math.PI*0.25, phi:0.80, tx:0.8, tz:0.8, r:2.2});
  /* アゴの天端は y=0.312 あたり。出隅をまたいでかこむ（uku.js と同じ狙い） */
  const n1=await draw([[0.40,0.312,0.10],[0.70,0.312,0.10],[0.70,0.312,0.20],[0.40,0.312,0.20]]);
  const A=await pv();
  console.log('  紫の面 '+JSON.stringify(A));
  ok(A.length===0 || A.every(f=>f.下地なし===0 && f.一番離れてるmm<=30),
     '① 貼れない面をかいても、躯体を貫通した紫が出ない', {紫:A});

  console.log('② ふつうの立上り（貼れる）');
  await build(false);
  await p.waitForTimeout(600);
  await cam({theta:Math.PI*0.25, phi:0.85, tx:0.8, tz:0.8, r:2.0});
  const n2=await draw([[0.55,0.20,0.256],[0.256,0.20,0.55],[0.256,0.06,0.55],[0.55,0.06,0.256]]);
  const B=await pv();
  console.log('  紫の面 '+JSON.stringify(B)+'  点='+n2);
  ok(B.length>=1, '② ふつうの立上りでは、紫がちゃんと出る（出なくなっていない）', {紫の面数:B.length});
  ok(B.every(f=>f.下地なし===0 && f.一番離れてるmm<=30),
     '② その紫は、躯体の面の上にある', {紫:B});

  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 予告の紫は、貼れる面の上にだけ出る');
  await b.close(); process.exit(ng?1:0);
})();
