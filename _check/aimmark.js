/* ★★2026-09-09 §363 画面に見えている「赤い照準の四角」の場所と、
   実際に打たれる点の場所が一致するか。
   §354 で「打たれる点に四角を合わせる」としたが、置き場所は toWorld(q)＝
   **平面の座標を平面上で3Dに戻した点** のままで、§357 で打点を
   「さわっている面の上の点」に変えたあとも直っていなかった。
   そのため別の面をさわるほど照準だけが遠くへずれ、
   本人の指摘「黄色のタップ場所に打点位置が来ない」「点がホーミングしてこない」になっていた。
   ★これまでの検査は内部の戻り値しか見ていなかったので、全部通っていた。
   使い方: node _check/aimmark.js  ／ node _check/aimmark.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:900,height:420},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(1800); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1; const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} });
  await p.waitForTimeout(1500);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnQuickBar,#nnStageBar,#nnSideBtn,#nnTbFold,#nnPerpBtn{display:none!important}'});
  /* 本人の場面：出隅に寄る */
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*0.30, phi:1.15, tx:9.2, tz:7.2, r:2.6}); T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(1400);
  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  const FING=async(s)=>p.evaluate(s=>(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}), s);
  const TOUCH=`(t,id,x,y)=>{const el=T.renderer.domElement;
    el.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true}));}`;
  await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
    nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'poly'); });
  await p.waitForTimeout(500);
  /* 1点目＝壁 z=8 の内面 */
  const s1=await SCR([9.0,0.15,7.738]); const f1=await FING(s1);
  await p.touchscreen.tap(f1.x,f1.y); await p.waitForTimeout(500);
  const n1=await p.evaluate(()=>{try{return (nnD3DrawWs()||[]).length;}catch(_){return 0;}});
  ok(n1===1,'1点目が置ける',n1);

  /* ★指を置いたまま、いろいろな面の上で「赤い四角の位置」と「打たれる点」を比べる */
  const targets=[[9.5,0.312,7.77],[8.6,0.312,7.77],[9.738,0.15,7.0],[9.4,0.012,7.2],[9.9,0.15,6.4]];
  const res=[];
  for(const c of targets){
    const s=await SCR(c); const f=await FING(s);
    await p.evaluate(`(${TOUCH})('pointerdown',31,${f.x},${f.y})`); await p.waitForTimeout(90);
    await p.evaluate(`(${TOUCH})('pointermove',31,${f.x},${f.y})`); await p.waitForTimeout(140);
    const r=await p.evaluate(([fx,fy])=>{
      const d=document.getElementById('nnD3Aim'); if(!d||d.style.display!=='block') return null;
      const w3=document.getElementById('three-wrap').getBoundingClientRect(), Z=window.nnPZ||1;
      const i=d.querySelector('i');
      /* 赤い四角の画面上のまん中 */
      const mx=w3.left+(parseFloat(d.style.left)+parseFloat(i.style.left)+13)*Z;
      const my=w3.top +(parseFloat(d.style.top )+parseFloat(i.style.top )+13)*Z;
      /* 実際に打たれる点（照準の位置から） */
      const o=window.nnD3AimOff?nnD3AimOff(fx,fy):[36,-52];
      const dbg=window.nnD3AimDbg?nnD3AimDbg(fx+o[0],fy+o[1]):null;
      if(!dbg||!dbg.w) return {mark:[mx,my],w:null};
      const el=T.renderer.domElement, rc=el.getBoundingClientRect();
      const q=new THREE.Vector3(dbg.w[0],dbg.w[1],dbg.w[2]).project(T.camera);
      const px=rc.left+(q.x*0.5+0.5)*rc.width, py=rc.top+(-q.y*0.5+0.5)*rc.height;
      return {mark:[Math.round(mx),Math.round(my)], pt:[Math.round(px),Math.round(py)],
        gap:+Math.hypot(mx-px,my-py).toFixed(1)};
    },[f.x,f.y]);
    await p.evaluate(`(${TOUCH})('pointercancel',31,${f.x},${f.y})`); await p.waitForTimeout(120);
    res.push(r);
  }
  res.forEach((r,i)=>console.log('   狙い'+JSON.stringify(targets[i])+' → '+JSON.stringify(r)));
  const gaps=res.filter(r=>r&&r.gap!=null).map(r=>r.gap);
  ok(gaps.length===targets.length,'どの場所でも照準が出る',gaps.length);
  ok(gaps.length&&Math.max(...gaps)<=8,'★赤い四角の位置＝実際に打たれる点（ズレ8px以内）',{max:gaps.length?Math.max(...gaps):null,gaps});
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 0件');
  await b.close();
})();
