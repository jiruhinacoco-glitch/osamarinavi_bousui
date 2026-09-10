/* ★★2026-09-10 §386 本人の指摘「なぜテーパーのところに隙間が存在しているのか」。
   天端→面取り→立上り をまたいで増張りを貼り、**板の四隅の裏に下地があるか**を
   光線で測る（_check/uku.js と同じやり方＝当の関数を使わない検算）。

   面取りの帯は 60mm ほどしかないのに、段のつなぎ目の重ねが一律18mmだったため、
   面取りの板が帯からはみ出して **宙に浮いた羽根** になっていた（実測 75mm）。
   浮いた角は「裏に下地が無い」ので、この検査で捕まる。

   使い方: node _check/hane.js  ／ node _check/hane.js _before.html
   ★直す前の版では★NG。 */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'  ★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:420,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(1800); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:16,y:0},{x:16,y:12},{x:0,y:12}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para',ch:30}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); }); await p.waitForTimeout(1500);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnFocusBtn,#nnQuickBar{display:none!important}'});
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*0.5, phi:0.70, tx:5.2, tz:1.0, r:1.8}); T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(1600);

  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  const tap=async(w)=>{ const s=await SCR(w);
    const t=await p.evaluate(s=>{const f=nnD3AimFinger(s.x,s.y),o=nnD3AimOff(f.x,f.y);
      return {x:f.x,y:f.y,miss:Math.hypot(f.x+o[0]-s.x,f.y+o[1]-s.y)};},s);
    await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(430); return t.miss; };

  await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
    nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(500);
  const PT=[[5.00,0.300,0.120],[5.45,0.300,0.120],[5.45,0.150,0.256],[5.00,0.150,0.256]];
  let miss=0; for(const w of PT) miss=Math.max(miss, await tap(w));
  const n4=await p.evaluate(()=>{const d=nnD3DrawDbg();return d?d.pts.length:-1;});
  ok(n4===4 && miss<=2,'天端→面取り→立上り に4点打てた（照準も届いている）',{点:n4,外しpx:Math.round(miss)});
  await tap(PT[0]); await p.waitForTimeout(900);

  const R=await p.evaluate(()=>{
    const A=state.d3sheet||[]; if(!A.length) return {err:'貼れていない'};
    const rc=new THREE.Raycaster(), DOWN=new THREE.Vector3(0,-1,0);
    /* ── ① 建物の実物の「面取り帯」を測る（増張りの板は隠して躯体だけ見る） ── */
    const hid=[];
    T.group.traverse(o=>{ if(o.name==='nnSheet'||o.name==='nnSheetLab'){ hid.push([o,o.visible]); o.visible=false; } });
    let zLo=null, zHi=null, yTop=-9;
    for(let z=0.10; z<=0.30; z+=0.001){
      rc.set(new THREE.Vector3(5.20, 2.0, z), DOWN);
      const hs=(rc.intersectObjects(T.group.children,true)||[])
        .filter(o=>o.object.visible!==false && !(o.object.userData&&o.object.userData.pick));
      if(!hs.length) continue;
      const y=hs[0].point.y; if(y>yTop) yTop=y;
      /* 天端でも平場でもない高さ＝斜めの面取りの上 */
      if(y<yTop-0.0015 && y>0.05){ if(zLo===null) zLo=z; zHi=z; }
    }
    hid.forEach(([o,v])=>{o.visible=v;});
    /* ── ② 出来た増張りの「面取りの板」の大きさ ── */
    let ch=null; const kinds=[];
    (A[0].faces||[]).forEach(f=>{
      const nn=(f.n||[0,0,0]);
      const p0=new THREE.Vector3().fromArray(f.p), u=new THREE.Vector3().fromArray(f.u),
            v=new THREE.Vector3().fromArray(f.v);
      const W=(f.pts||[]).map(q=>p0.clone().addScaledVector(u,q[0]).addScaledVector(v,q[1]));
      const zs=W.map(w=>w.z), ys=W.map(w=>w.y);
      const o={法線:nn.map(x=>+x.toFixed(2)),
               zはば:+(Math.max(...zs)-Math.min(...zs)).toFixed(4),
               yはば:+(Math.max(...ys)-Math.min(...ys)).toFixed(4)};
      kinds.push(o);
      /* 斜めの面＝面取り（たてでも よこでもない） */
      if(Math.abs(nn[1])>0.15 && Math.abs(nn[2])>0.15) ch=o;
    });
    return {実物の面取り:{z:[zLo,zHi], はばmm:(zLo!=null&&zHi!=null)?Math.round((zHi-zLo)*1000):null},
            面:kinds, 面取りの板:ch};
  });
  if(R.err){ ok(false,'増張りが貼れた',R); }
  else{
    console.log('  実物の面取り帯 '+JSON.stringify(R.実物の面取り));
    console.log('  出来た面 '+JSON.stringify(R.面));
    ok(R.面.length===3,'天端・面取り・立上りの3面に分かれる',{面数:R.面.length});
    ok(!!R.面取りの板 && R.実物の面取り.はばmm>0,'面取りの板と、実物の面取り帯の両方を測れた');
    if(R.面取りの板 && R.実物の面取り.はばmm>0){
      const 板=Math.round(R.面取りの板.zはば*1000), 実物=R.実物の面取り.はばmm;
      /* つなぎ目をふさぐ重ねは要るが、はみ出してよいのは合わせて15mmまで
         （それ以上は板が帯からはみ出して宙に浮く＝本人の見た「隙間」） */
      ok(板 <= 実物+15, '面取りの板が、実物の面取り帯からはみ出しすぎていない（+15mm以内）',
         {板mm:板, 実物mm:実物, はみ出しmm:板-実物});
    }
  }
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 面取りをまたいでも、板が浮かない');
  await b.close(); process.exit(ng?1:0);
})();
