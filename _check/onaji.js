/* ★2026-09-09h §373 すでに引いた辺と「同じ長さ」に来たら合図が出るか。
   本人の指示「例えば0.67mで描いてあるなら、反対も0.67mの時点で何かしら合図を出して欲しい」。
   ★実物と同じ見方：本物の指で2点打ち、3点目を「1辺目と同じ長さ」の少し手前・ぴったり・少し先で
     狙って、①札に「＝◯.◯◯m と同じ」が出るか ②その辺が黄色く光るか ③長さがぴったり合うか。
   使い方: node _check/onaji.js  ／ node _check/onaji.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:420,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'}); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1; const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} });
  await p.waitForTimeout(1500);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnQuickBar,#nnStageBar,#nnSideBtn,#nnTbFold,#nnPerpBtn,#navShowTab,#toast{display:none!important}'});
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:18000}).catch(()=>{}); await p.waitForTimeout(150); };
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*0.25, phi:0.60, tx:5, tz:4, r:9}); T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(900); await settle();
  const SCR=async(c)=>{ await settle(); return p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      const s={x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height};
      const t=(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}); const e=document.elementFromPoint(t.x,t.y);
      return {t:[t.x,t.y], ok: t.x>r.left+4&&t.x<r.right-4&&t.y>r.top+4&&t.y<r.bottom-4 && e && e.tagName==='CANVAS'}; },c); };
  await p.evaluate(()=>{ state.d3sheet=[]; nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(600);
  /* 平場に2点：長さ 1.20m の1辺目をつくる */
  let miss=0;
  for(const c of [[4.0,0.024,4.0],[5.2,0.024,4.0]]){
    const s=await SCR(c); if(!s.ok){ miss++; continue; }
    await p.touchscreen.tap(s.t[0],s.t[1]); await p.waitForTimeout(450); }
  ok(miss===0, '① 1辺目（1.20m）が引けた', miss);

  const TOUCH=`(t,id,x,y)=>{const el=T.renderer.domElement;
    el.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true}));}`;
  const probe=async(c)=>{
    const s=await SCR(c); if(!s.ok) return {miss:1};
    await p.evaluate(`(${TOUCH})('pointerdown',31,${s.t[0]},${s.t[1]})`); await p.waitForTimeout(90);
    await p.evaluate(`(${TOUCH})('pointermove',31,${s.t[0]},${s.t[1]})`); await p.waitForTimeout(280);
    const r=await p.evaluate(()=>{
      const el=T.renderer.domElement, rc=el.getBoundingClientRect();
      const d=window.nnD3AimDbg?nnD3AimDbg(rc.left+rc.width/2, rc.top+rc.height/2):null;
      const lb=document.getElementById('nnD3Lab');
      let yellow=0; T.scene.traverse(o=>{ if(o.isLine && o.name==='nnPvSame') yellow++; });
      /* 予告線の長さ（＝実際に置かれる長さ） */
      let len=null;
      try{ const ws=nnD3DrawWs(); const w0=ws[ws.length-1];
        let pts=null; T.scene.traverse(o=>{ if(!o.isLine) return; let q=o,hit=false;
          while(q){ if(q.name==='nnPvLine2'||q.name==='nnPvLine'){hit=true;break;} q=q.parent; }
          if(!hit) return; const a=o.geometry.attributes.position;
          const P=[]; for(let i=0;i<a.count;i++) P.push([a.getX(i),a.getY(i),a.getZ(i)]);
          pts=(pts||[]).concat(P); });
        if(pts&&pts.length>=2){ let s2=0; for(let i=0;i+1<pts.length;i+=2)
          s2+=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1],pts[i+1][2]-pts[i][2]);
          len=+s2.toFixed(3); } }catch(e){}
      return {lab:lb?lb.textContent:'', yellow, len};
    });
    await p.evaluate(`(${TOUCH})('pointercancel',31,${s.t[0]},${s.t[1]})`); await p.waitForTimeout(120);
    return r;
  };
  /* 2辺目：1辺目と同じ 1.20m になる場所の「ほぼぴったり」を狙う（1.19m の位置） */
  const A=await probe([5.2,0.024,2.81]);
  console.log('  ② ぴったり近く '+JSON.stringify(A));
  ok(/と同じ/.test(A.lab||''), '② 同じ長さに来たら札に「＝1.20m と同じ」が出る', A.lab);
  ok(A.yellow>0, '② そのとき、同じ長さの辺が黄色く光る', A.yellow);
  ok(A.len!=null && Math.abs(A.len-1.2)<0.02, '② 長さがぴったり 1.20m に合う', A.len);
  /* 遠いところでは合図を出さない（出しっぱなしにならない） */
  const B=await probe([5.2,0.024,1.6]);
  console.log('  ③ 遠いところ '+JSON.stringify(B));
  ok(!/と同じ/.test(B.lab||''), '③ 長さが違うところでは合図を出さない', B.lab);
  ok(B.yellow===0, '③ そのときは黄色い線も出ない', B.yellow);

  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 同じ長さで合図が出る');
  await b.close();
})();
