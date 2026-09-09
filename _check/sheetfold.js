/* ★★2026-09-09 §360 折れ（平場↔立上り）をまたぐ増張りが「塗りすぎ」ないか
   §344 で DS.path を作るのをやめた副作用で、face.us が付くことが無くなり、
   **どんな形もデカール（画面から投影して切り取る）**になっていた。
   デカールは奥行きを見ないので、立上りの点から出た光線が平場をどこまでも塗る
   （実測：平場 0.588㎡ のはずが 1.10㎡＝1.87倍。本人の指摘「また変な形になります」）。
   ・折れをまたぐ形＝道どおりに巻く（how:'path'）
   ・1つの面の中だけの形＝今までどおりデカール（how:'decal'・実測で正確）
   ・どちらの面にも **面ID** が付く（§345 建物を変えても付いてくる／§356【4】数量が追従）
   使い方: node _check/sheetfold.js  ／ node _check/sheetfold.js _before.html
   ★#d3pad などの浮かせたボタンは隠す（かくときの当たり判定を見る検査なので。
     ボタンの重なりは mikire／gosadou が別に見ている） */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:420,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(1800); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:16,y:0},{x:16,y:12},{x:0,y:12}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} });
  await p.waitForTimeout(1500);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnQuickBar{display:none!important}'});
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:18000}).catch(()=>{}); await p.waitForTimeout(150); };
  const cam=async(o)=>{ await p.evaluate(o=>{ Object.assign(T,o); T.rev=(T.rev|0)+1; },o); await p.waitForTimeout(900); await settle(); };
  const SCR=async(c)=>{ await settle(); return p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      const s={x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height};
      const t=(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}); const e=document.elementFromPoint(t.x,t.y);
      return {t:[t.x,t.y], ok: t.x>r.left+4&&t.x<r.right-4&&t.y>r.top+4&&t.y<r.bottom-4 && e && e.tagName==='CANVAS'}; },c); };
  const draw=async(pts)=>{
    await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(600);
    let miss=0;
    for(const c of pts){ const s=await SCR(c); if(!s.ok){ miss++; continue; }
      await p.touchscreen.tap(s.t[0],s.t[1]); await p.waitForTimeout(430); }
    const s0=await SCR(pts[0]); if(s0.ok){ await p.touchscreen.tap(s0.t[0],s0.t[1]); await p.waitForTimeout(1500); }
    const r=await p.evaluate(()=>{ const s=state.d3sheet[0]; if(!s) return {none:1};
      return {n:s.faces.length, how:(window.__nnWrapUsed&&window.__nnWrapUsed.how)||'?',
        area:+s.faces.reduce((a,f)=>a+(+f.am||0),0).toFixed(4),
        f:s.faces.map(f=>({k:f.id&&f.id.k, ei:f.id&&f.id.ei, hasId:!!f.id, am:+(+f.am||0).toFixed(4)})) }; });
    r.miss=miss; return r; };

  /* ① 折れをまたぐ増張り（平場0.294m ＋ 立上り0.188m × 2m）＝いちばんふつうの使い方 */
  await cam({theta:Math.PI*0.42, phi:0.85, tx:6, tz:1.0, r:5.0});
  const A=await draw([[5.0,0.012,0.55],[7.0,0.012,0.55],[7.0,0.20,0.256],[5.0,0.20,0.256]]);
  console.log('  ① '+JSON.stringify(A));
  ok(A.miss===0, '① 4点とも置ける', A.miss);
  ok(A.n===2, '① 平場1面＋立上り1面になる', A.n);
  ok(A.how==='path', '① 折れをまたぐ形は「道」で巻く（デカールではない）', A.how);
  const dk=(A.f||[]).find(x=>x.k==='deck'), wl=(A.f||[]).find(x=>x.k==='wall');
  ok(dk && dk.am>0.50 && dk.am<0.68, '① 平場は 0.588㎡ 前後（塗りすぎない）', dk&&dk.am);
  ok(wl && wl.am>0.30 && wl.am<0.46, '① 立上りは 0.376㎡ 前後', wl&&wl.am);
  ok(A.area>0.85 && A.area<1.12, '① 合計 0.96㎡ 前後', A.area);
  ok((A.f||[]).length>0 && (A.f||[]).every(x=>x.hasId), '① どの面にも面IDが付く（建物を変えても付いてくる）', A.f);

  /* ② 1つの面の中だけ＝今までどおりデカール（実測で正確） */
  await cam({theta:Math.PI*0.25, phi:0.60, tx:6, tz:4, r:11});
  const B=await draw([[5.0,0.012,3.0],[7.0,0.012,3.0],[7.0,0.012,5.0],[5.0,0.012,5.0]]);
  console.log('  ② '+JSON.stringify(B));
  ok(B.miss===0 && B.n===1, '② 平場だけの形は1面', B.n);
  ok(B.how==='decal', '② 1つの面の中だけならデカールのまま', B.how);
  ok(B.area>3.8 && B.area<4.2, '② 2m×2m ＝ 4.00㎡ ちょうど', B.area);
  ok((B.f||[]).every(x=>x.hasId), '② こちらも面IDが付く', B.f);
  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 0件');
  await b.close();
})();
