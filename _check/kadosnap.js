/* ★★2026-09-09 §364 ②出入隅の「たての稜線」に吸い付く＋合図が出る
   ③打点マークの傾きが「実際にさわっている面」の向きになっている
   本人の指摘「出入隅辺に位置決めたいことが多いから当たり判定の状態変化が欲しい」
   「四角の打点マークの角度が該当面ではない角度になっている」
   使い方: node _check/kadosnap.js ／ node _check/kadosnap.js _before.html */
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
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnQuickBar,#nnStageBar,#nnSideBtn,#nnTbFold,#nnPerpBtn,#navShowTab,#toast{display:none!important}'});
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.28, phi:1.05, tx:9.3, tz:7.3, r:2.6}); T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(1400);
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:18000}).catch(()=>{}); await p.waitForTimeout(150); };
  const SCR=async(c)=>{ await settle(); return p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },c); };
  const FING=async(s)=>p.evaluate(s=>(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}), s);
  const TOUCH=`(t,id,x,y)=>{const el=T.renderer.domElement;
    el.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true}));}`;
  await p.evaluate(()=>{ nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'poly'); });
  await p.waitForTimeout(500);
  /* 1点目＝壁 z=7.75 の内面（角から離れたところ） */
  const s1=await SCR([9.0,0.15,7.738]); const f1=await FING(s1);
  await p.touchscreen.tap(f1.x,f1.y); await p.waitForTimeout(500);
  ok((await p.evaluate(()=>{try{return (nnD3DrawWs()||[]).length;}catch(_){return 0;}}))===1,'1点目が置ける');

  /* ② 出隅のたての稜線（x=9.75, z=7.75 の角）のすぐ近くを狙う */
  const near=[9.70,0.15,7.738];                       /* 角から5cm手前・壁の面の上 */
  const s2=await SCR(near); const f2=await FING(s2);
  await p.evaluate(`(${TOUCH})('pointerdown',41,${f2.x},${f2.y})`); await p.waitForTimeout(90);
  await p.evaluate(`(${TOUCH})('pointermove',41,${f2.x},${f2.y})`); await p.waitForTimeout(160);
  const r2=await p.evaluate(([fx,fy])=>{
    const d=document.getElementById('nnD3Aim');
    const o=window.nnD3AimOff?nnD3AimOff(fx,fy):[36,-52];
    const g=window.nnD3AimDbg?nnD3AimDbg(fx+o[0],fy+o[1]):null;
    const i=d?d.querySelector('i'):null;
    return {lab:d?(d.querySelector('b')||{}).textContent:null, fold:!!(g&&g.fold),
      yellow:!!(d&&d.classList.contains('fold')), w:g&&g.w?g.w.map(v=>+v.toFixed(3)):null,
      tr:i?i.style.transform:''};
  },[f2.x,f2.y]);
  console.log('   '+JSON.stringify(r2));
  ok(r2.fold,'② たての稜線に吸い付く（合図が立つ）',r2.fold);
  ok(/角|入隅/.test(r2.lab||''),'② 合図の文字が出る（角／入隅）',r2.lab);
  ok(r2.yellow,'② 照準が黄色になる',r2.yellow);
  ok(r2.w && Math.abs(r2.w[0]-9.738)<0.03,'② 打点が角のたての線（x=9.738）に乗る',r2.w);

  /* ③ 打点マークの傾き＝さわっている面の向き（壁ならタテ方向が画面のタテ） */
  const wall=await p.evaluate(()=>{ const i=document.getElementById('nnD3Aim').querySelector('i');
    const m=/matrix\(([^)]+)\)/.exec(i.style.transform||''); if(!m) return null;
    const a=m[1].split(',').map(Number); return {ux:a[0],uy:a[1],vx:a[2],vy:a[3]}; });
  console.log('   壁の上のマーク '+JSON.stringify(wall));
  ok(wall && Math.abs(wall.vy)>Math.abs(wall.vx)*1.5,'③ 壁では「たて方向」が画面のタテを向く',wall);
  await p.evaluate(`(${TOUCH})('pointercancel',41,${f2.x},${f2.y})`); await p.waitForTimeout(150);

  /* ③ 平場では ちがう傾きになる（面が変われば向きも変わる） */
  const s3=await SCR([9.0,0.012,7.0]); const f3=await FING(s3);
  await p.evaluate(`(${TOUCH})('pointerdown',42,${f3.x},${f3.y})`); await p.waitForTimeout(90);
  await p.evaluate(`(${TOUCH})('pointermove',42,${f3.x},${f3.y})`); await p.waitForTimeout(160);
  const deck=await p.evaluate(()=>{ const i=document.getElementById('nnD3Aim').querySelector('i');
    const m=/matrix\(([^)]+)\)/.exec(i.style.transform||''); if(!m) return null;
    const a=m[1].split(',').map(Number); return {ux:a[0],uy:a[1],vx:a[2],vy:a[3]}; });
  console.log('   平場のマーク '+JSON.stringify(deck));
  /* 壁の「たて」は世界の真上なので画面でもほぼ真たて（|vy|>0.95）。
     平場の「たて」は世界のZ方向なので、このカメラでは真たてにならない（|vy|<0.95）。
     ＝マークが「その面の向き」で作られている証拠 */
  ok(wall && Math.abs(wall.vy)>0.95,'③ 壁のマークは画面でほぼ真たて',wall&&wall.vy);
  ok(deck && Math.abs(deck.vy)<0.95,'③ 平場のマークは真たてではない（面が変われば向きも変わる）',deck&&deck.vy);
  await p.evaluate(`(${TOUCH})('pointercancel',42,${f3.x},${f3.y})`); await p.waitForTimeout(120);
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 0件');
  await b.close();
})();
