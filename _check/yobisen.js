/* ★2026-09-09f §370 予告線（赤い線）は、**いま打った点から** 出ているか。
   本人の指摘①「4点目を垂直に下ろしているのに、謎の場所に赤いラインが入る」。
   ★見方も実物と同じ：画面に描かれている線の端が、打った点の3Dの場所と合っているか。
   使い方: node _check/yobisen.js  ／ node _check/yobisen.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:420,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'}); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1;
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①',lv:0,pts:P,holes:[],edges:P.map(()=>({h:300,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} try{nnStageSet('body',0);}catch(_){} });
  await p.waitForTimeout(1600);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnQuickBar,#nnStageBar,#nnSideBtn,#nnTbFold,#nnPerpBtn,#navShowTab,#toast{display:none!important}'});
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:18000}).catch(()=>{}); await p.waitForTimeout(150); };
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.25, phi:1.22, tx:4.55, tz:3.55, r:2.6}); T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(900); await settle();
  const SCR=async(c)=>{ await settle(); return p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      const s={x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height};
      const t=(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}); const e=document.elementFromPoint(t.x,t.y);
      return {t:[t.x,t.y], ok: t.x>r.left+4&&t.x<r.right-4&&t.y>r.top+4&&t.y<r.bottom-4 && e && e.tagName==='CANVAS'}; },c); };
  await p.evaluate(()=>{ state.d3sheet=[]; nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(600);
  /* 立上りに3点：壁A（x=4.732）の上／角のふもと／壁B（z=3.732）の上 */
  const PTS=[[4.732,0.22,4.30],[4.732,0.06,3.744],[5.30,0.22,3.732]];
  let miss=0;
  for(const c of PTS){ const s=await SCR(c); if(!s.ok){ miss++; console.log('とどかない',c); continue; }
    await p.touchscreen.tap(s.t[0],s.t[1]); await p.waitForTimeout(450); }
  /* 4点目を狙う（3点目の真下） */
  const s4=await SCR([5.30,0.024,3.40]);   /* 4点目＝3点目の真下（平場へ下ろす） */
  const TOUCH=`(t,id,x,y)=>{const el=T.renderer.domElement;
    el.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true}));}`;
  await p.evaluate(`(${TOUCH})('pointerdown',77,${s4.t[0]},${s4.t[1]})`); await p.waitForTimeout(90);
  await p.evaluate(`(${TOUCH})('pointermove',77,${s4.t[0]},${s4.t[1]})`); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{
    try{ nnD3PH(); }catch(e){}
    const out=[];
    T.scene.traverse(o=>{
      if(!o.isLine) return;
      let par=o, nm='';
      while(par){ if(par.name){ nm=par.name+(nm?('/'+nm):''); } par=par.parent; }
      const c=o.material&&o.material.color?('#'+o.material.color.getHexString()):'?';
      const a=o.geometry&&o.geometry.attributes&&o.geometry.attributes.position;
      if(!a) return;
      const P=[]; for(let i=0;i<a.count;i++) P.push([+a.getX(i).toFixed(3),+a.getY(i).toFixed(3),+a.getZ(i).toFixed(3)]);
      out.push({nm, c, P});
    });
    const d=window.nnD3DrawDbg?nnD3DrawDbg():null;
    let us=null;
    try{
      const D=window.__nnDS; us='(DSが取れない)';
    }catch(e){}
    /* 打点の3Dの点を、いま使っている道の座標へ直せるか */
    let map=null;
    try{
      const ws=(window.nnD3DrawWs?nnD3DrawWs():[])||[];
      map=ws.map(w=>{ const W=new THREE.Vector3(w[0],w[1],w[2]);
        let r=null; try{ r=window.__nnPH?nnSheetPathUS(window.__nnPH, W):null; }catch(e){ r='ERR'; }
        return r?[+r[0].toFixed(3),+r[1].toFixed(3)]:null; });
    }catch(e){ map='ERR '+e.message; }
    return {lines:out, pts:d&&d.pts?d.pts.length:0, w:(window.nnD3DrawWs?nnD3DrawWs():null), map};
  });
  let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
  const last=r.w&&r.w.length?r.w[r.w.length-1]:null;
  const pv=(r.lines||[]).filter(L=>/nnPvLine/.test(L.nm));
  console.log('  打点',JSON.stringify(r.w),' 道の座標',JSON.stringify(r.map));
  pv.forEach(L=>console.log('  予告線',L.nm,JSON.stringify(L.P)));
  ok(r.pts===3, '3点とも打てた', r.pts);
  ok(!!last, '打点の3Dの場所が取れる', last);
  ok(pv.length>0, '予告線が出ている', pv.length);
  const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const near=pv.some(L=>L.P.length>=2 && (d(L.P[0],last)<0.02 || d(L.P[L.P.length-1],last)<0.02));
  ok(near, '予告線の端が「いま打った点」から出ている（平面に落ちていない）',
     {last, ends:pv.map(L=>[L.P[0],L.P[L.P.length-1]])});
  /* 角の向こうの点が「建物を一周した言い方」になっていないか（罠④：同点） */
  const uu=(r.map||[]).map(m=>m&&m[0]);
  ok(uu.every(u=>u==null || Math.abs(u)<3), '角の向こうの点も「近いほうの言い方」で持っている', uu);
  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 予告線は打った点から出ている');
  await b.close();
})();
