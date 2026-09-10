/* ★2026-09-10 本人の指摘（添付1）「打点の位置がおかしい。おそらく同じ依頼を10回はしている」。
   ★これまでの `_check/ptaim.js` は「点が1つだけ置いてある」状態しか測っていなかった。
     本人の画面は **天端から面取り・立上りへ何点も打ったあと・出隅のそば** で、
     そこでは「入隅に吸い付く」「角に吸い付く」「同じ長さにそろえる」「45度きざみ」が
     いっせいに効く。ここを測っていなかった。
   使い方: node _check/datten.js  ／ node _check/datten.js _before.html */
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
    /* L字：(5,4) が出隅（本人の画面と同じ） */
    const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para',ch:30}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.waitForTimeout(1200);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnFocusBtn,#nnQuickBar,#nnD3Dims{display:none!important}'});
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:12000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=6; }catch(_){return false;} },{timeout:20000}).catch(()=>{}); await p.waitForTimeout(150); };
  const cam=async(o)=>{ await p.evaluate(o=>{ Object.assign(T,o); T.rev=(T.rev|0)+1; },o); await p.waitForTimeout(700); await settle(); };
  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  const FING=async(s)=>p.evaluate(s=>(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}), s);
  const tapAt=async(c)=>{ const s=await SCR(c); const t=await FING(s); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(420); };

  /* 本人の画面と同じ見え方：出隅を屋根の中から見おろす */
  await cam({theta:Math.PI*1.25, phi:1.05, tx:4.6, tz:3.6, r:2.2});

  /* 天端 → 面取り → 立上り と何点か打つ（本人の 0.47/0.47/0.22 と同じ形） */
  await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
    nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(500);
  await tapAt([5.45, 0.312, 3.80]);                 /* ①天端 */
  await tapAt([5.45, 0.312, 3.90]);                 /* ②天端（内がわ） */
  await tapAt([4.90, 0.312, 3.90]);                 /* ③天端（角へ） */
  const np=await p.evaluate(()=>{const d=window.nnD3DrawDbg&&nnD3DrawDbg();return d?d.pts.length:-1;});
  ok(np>=3,'天端に3点打てた（本人の画面と同じ状態）',{n:np});

  /* ここから：画面をなめて「狙ったところに打点されるか」を測る */
  const sw=await p.evaluate(()=>{
    const el=T.renderer.domElement,r=el.getBoundingClientRect(), out=[], mo=[], via={}, vmax={}, vw={};
    let mx=0,mxc=null;
    const prj=w=>{ const q=new THREE.Vector3(w[0],w[1],w[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; };
    for(let x=r.left+24;x<r.right-24;x+=10) for(let y=r.top+24;y<r.bottom-24;y+=10){
      let D=null; try{ D=window.nnD3AimDbg(x,y); }catch(_){}
      if(!D||!D.w||!D.aim) continue;
      const s=prj(D.w), d=Math.hypot(s.x-x,s.y-y);
      /* ★画面のpxだけでなく、**現場での距離（m）** も測る。
         すれすれに見えている面では、22px が実際には十数cmになる（本人の「謎の場所」）。 */
      const A=D.aimW, mm=Math.hypot(A[0]-D.w[0], A[1]-D.w[1], A[2]-D.w[2]);
      out.push(d); mo.push(mm);
      const v=D.via||'?'; via[v]=(via[v]||0)+1;
      if(mm>(vmax[v]||0)){ vmax[v]=mm;
        vw[v]={m:+mm.toFixed(3), px:+d.toFixed(1), aim:A, w:D.w.map(z=>+z.toFixed(3)),
               L:(D.q&&window.nnD3DrawDbg)?null:null, same:D.sameLen, ang:D.ang}; }
      if(mm>mx){ mx=mm; mxc={x:Math.round(x),y:Math.round(y),px:+d.toFixed(1),m:+mm.toFixed(3),via:v,
        aim:A, w:D.w.map(v2=>+v2.toFixed(3)), same:D.sameLen}; }
    }
    if(!out.length) return null;
    out.sort((a,b)=>a-b); mo.sort((a,b)=>a-b);
    const q=f=>+out[Math.floor(out.length*f)].toFixed(1);
    const qm=f=>+mo[Math.floor(mo.length*f)].toFixed(3);
    Object.keys(vmax).forEach(k=>vmax[k]=+vmax[k].toFixed(3));
    return {n:out.length, med:q(0.5), p90:q(0.9), p99:q(0.99), max:+out[out.length-1].toFixed(1),
      mMed:qm(0.5), mP90:qm(0.9), mP99:qm(0.99), mMax:+mx.toFixed(3),
      worst:mxc, over30:out.filter(v=>v>30).length, mOver10:mo.filter(v=>v>0.10).length,
      mOver6:mo.filter(v=>v>0.06).length, via, vmax, vw};
  });
  ok(sw && sw.n>300,'面に当たるタップを十分に測れた', sw&&{n:sw.n});
  if(sw){
    console.log('    きめ方の内わけ '+JSON.stringify(sw.via));
    console.log('    ズレ 中央値'+sw.med+'px／90%'+sw.p90+'px／99%'+sw.p99+'px／最大'+sw.max+'px');
    ok(sw.med<=8,   'ふだんのズレ（中央値）が8px以内',{med:sw.med});
    ok(sw.p99<=30,  '99%が30px以内',{p99:sw.p99});
    ok(sw.max<=40,  'いちばん大きいズレも40px以内',{max:sw.max, worst:sw.worst});
    ok(sw.over30===0,'30pxを超えるタップが1つも無い',{over30:sw.over30, worst:sw.worst});
    console.log('    現場でのズレ 中央値'+(sw.mMed*1000)+'mm／90%'+(sw.mP90*1000)+'mm／99%'
      +(sw.mP99*1000)+'mm／最大'+(sw.mMax*1000)+'mm');
    console.log('    きめ方ごとの最大ズレ(m) '+JSON.stringify(sw.vmax));
    Object.keys(sw.vw).forEach(k=>console.log('      '+k+' '+JSON.stringify(sw.vw[k])));
    ok(sw.mP99<=0.06,'99%が現場で6cm以内（きざみ1つぶん）',{p99:sw.mP99});
    ok(sw.mMax<=0.10,'いちばん大きいズレも現場で10cm以内',{max:sw.mMax, worst:sw.worst});
    ok(sw.mOver10===0,'現場で10cmを超えて飛ぶタップが1つも無い',{n:sw.mOver10, worst:sw.worst});
  }
  ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
  console.log(ng?('★NG '+ng+'件'):'○ 何点も打ったあと・出隅のそばでも、狙ったところに打点される');
  await b.close(); process.exit(ng?1:0);
})();
