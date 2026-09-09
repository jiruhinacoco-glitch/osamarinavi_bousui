/* ★★2026-09-09 §361 「打点したところに打点される」＋「入隅に吸い付く」
   本人の指摘：「打点したところではないところに打点されるのが致命的」
               「立上りから平場の境目である入隅にセンサーが反応しないため、
                 入隅に打点できているのかわからない」
   使い方： node _check/ptaim.js            （いまの版）
           node _check/ptaim.js _before.html （直す前と比べる）
   ★直す前の版では①が★NGになる（中央値29px・最大427px・画面の半分以上が20px超）。 */
const FILE=process.argv[2]||'zumen_sekisan.html';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'  ★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
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
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} });
  await p.waitForTimeout(1500);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnFocusBtn,#nnQuickBar{display:none!important}'});
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:18000}).catch(()=>{}); await p.waitForTimeout(150); };
  const cam=async(o)=>{ await p.evaluate(o=>{ Object.assign(T,o); T.rev=(T.rev|0)+1; },o); await p.waitForTimeout(900); await settle(); };
  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  /* ★§362 照準は端でずらし量が縮むので、狙い→指の位置は逆引きする（決め打ちの -36/+52 は使わない） */
  const FING=async(s)=>p.evaluate(s=>(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}), s);
  const start=async(first)=>{
    await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(500);
    const s=await SCR(first);
    const t=await FING(s); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(430);
    return p.evaluate(()=>{const d=window.nnD3DrawDbg&&nnD3DrawDbg();return d?d.pts.length:-1;});
  };

  const hasDbg=await p.evaluate(()=>typeof window.nnD3AimDbg==='function');
  await cam({theta:Math.PI*0.5, phi:1.00, tx:6, tz:1.6, r:6.0});
  console.log('① 打点したところに打点されるか（画面を格子でなめて実測）');
  ok(hasDbg,'検査用の口 nnD3AimDbg がある（直す前の版には無い）');
  ok(await start([5.0,0.20,0.256])===1, '1点目が置ける');
  const sw=!hasDbg?null:await p.evaluate(()=>{
    const el=T.renderer.domElement,r=el.getBoundingClientRect(), out=[];
    let mx=0,mxc=null;
    const prj=w=>{ const q=new THREE.Vector3(w[0],w[1],w[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; };
    for(let x=r.left+30;x<r.right-30;x+=14) for(let y=r.top+30;y<r.bottom-30;y+=14){
      let D=null; try{ D=window.nnD3AimDbg(x,y); }catch(_){}
      if(!D||!D.w||!D.aim) continue;                 /* 面に当たっていないタップは数えない */
      const s=prj(D.w), d=Math.hypot(s.x-x,s.y-y);
      out.push(d); if(d>mx){ mx=d; mxc=[Math.round(x),Math.round(y),+d.toFixed(1)]; }
    }
    if(!out.length) return null;
    out.sort((a,b)=>a-b);
    const q=f=>+out[Math.floor(out.length*f)].toFixed(1);
    return {n:out.length, med:q(0.5), p90:q(0.9), p99:q(0.99), max:+mx.toFixed(1),
      worst:mxc, over30:out.filter(v=>v>30).length};
  });
  ok(sw && sw.n>300, '① 面に当たるタップを十分に測れた', sw&&{n:sw.n});
  if(sw){
    ok(sw.med<=8,   '① ふだんのズレ（中央値）が8px以内', {med:sw.med});
    ok(sw.p99<=30,  '① 99%が30px以内', {p99:sw.p99});
    ok(sw.max<=40,  '① いちばん大きいズレも40px以内', {max:sw.max, worst:sw.worst});
    ok(sw.over30===0,'① 30pxを超えるタップが1つも無い', {over30:sw.over30});
  }

  console.log('② 入隅（平場と立上りの境目）に吸い付くか');
  const rg=!hasDbg?[]:await p.evaluate(()=>{
    const el=T.renderer.domElement,r=el.getBoundingClientRect();
    const prj=w=>{ const q=new THREE.Vector3(w[0],w[1],w[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; };
    const s=prj([6.0,0.012,0.256]), out=[];
    for(let d=-8;d<=8;d+=4){
      let D=null; try{ D=window.nnD3AimDbg(s.x,s.y+d); }catch(_){}
      out.push({dy:d, fold:!!(D&&D.fold), w:D&&D.w?D.w.map(v=>+v.toFixed(3)):null});
    }
    return out;
  });
  const onRidge=rg.filter(o=>o.w && Math.abs(o.w[1]-0.012)<0.004 && Math.abs(o.w[2]-0.256)<0.004);
  ok(onRidge.length>=4, '② 入隅の線から±8pxの狙いが、入隅の上に乗る', {n:onRidge.length, rg});
  ok(rg.some(o=>o.fold), '② 入隅に乗ったことが分かる合図（_fold）が立つ', rg.map(o=>o.fold));

  console.log('③ 45度きざみは残っている（軸のそばを狙えば効く）');
  await cam({theta:Math.PI*0.42, phi:0.85, tx:6, tz:1.0, r:5.0});
  ok(await start([5.0,0.012,0.55])===1, '1点目が置ける（平場）');
  const a45=!hasDbg?{}:await p.evaluate(async()=>{
    const el=T.renderer.domElement,r=el.getBoundingClientRect();
    const prj=w=>{ const q=new THREE.Vector3(w[0],w[1],w[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; };
    const s=prj([7.0,0.012,0.55]);                 /* 壁と平行にまっすぐ（＝軸のそば） */
    const D=window.nnD3AimDbg(s.x,s.y);
    return {w:D&&D.w?D.w.map(v=>+v.toFixed(3)):null, ang:D&&D.ang};
  });
  ok(a45.w && Math.abs(a45.w[2]-0.55)<0.02, '③ 壁と平行に狙うと まっすぐ引ける', a45);
  ok(a45.ang===0 || a45.ang===90 || a45.ang===45, '③ 角度が45度きざみで出る', a45);

  console.log('④ 立上り際の増張りが狙いどおりの寸法になる');
  const draw=async(list)=>{
    await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(500);
    for(const c of list){ const s=await SCR(c); const t=await FING(s); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(400); }
    const s0=await SCR(list[0]); const t0=await FING(s0); await p.touchscreen.tap(t0.x,t0.y); await p.waitForTimeout(1400);
    return p.evaluate(()=>{ const s=state.d3sheet[0]; if(!s) return null;
      const by={}; s.faces.forEach(f=>{ const k=(f.id&&f.id.k)||'?'; by[k]=(by[k]||0)+(+f.am||0); });
      Object.keys(by).forEach(k=>by[k]=+by[k].toFixed(3));
      return {n:s.faces.length, by, tot:+s.faces.reduce((a,f)=>a+(+f.am||0),0).toFixed(3)}; });
  };
  const r4=await draw([[5.0,0.012,0.55],[7.0,0.012,0.55],[7.0,0.20,0.256],[5.0,0.20,0.256]]);
  ok(!!r4, '④ 増張りが置けた', r4);
  if(r4){
    ok(r4.by.deck>=0.52&&r4.by.deck<=0.64, '④ 平場は 2.0m×0.294m ＝ 0.588㎡ あたり', r4.by);
    ok(r4.by.wall>=0.33&&r4.by.wall<=0.45, '④ 立上りは 2.0m×0.188m ＝ 0.376㎡ あたり', r4.by);
    ok(r4.tot>=0.88&&r4.tot<=1.06,         '④ 合計 0.96㎡ あたり', {tot:r4.tot});
  }
  ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
  console.log(ng?('★NG '+ng+'件'):'すべて○');
  await b.close(); process.exit(ng?1:0);
})();
