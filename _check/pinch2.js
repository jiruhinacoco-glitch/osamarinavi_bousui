/* ★2026-08-28a「3Dいじってると二本指ズームがおかしくなる」（§229）の検証。
   途中で操作が崩れる4つの原因を、実際のイベント列で再現して確かめる：
   ①面を選んだままでも二本指ズームができる（面ドラッグが2本目の指でピンチに譲る）
   ②3本目の指（手のひらの触れ）でズームが飛ばない・指の組替えでも飛ばない
   ③up が届かなかった指（ゴースト）が残っても、6秒で掃除されて操作が戻る
   ④面ドラッグそのものは今までどおり効く（1本指・カメラは動かない）
   使い方: node _check/pinch2.js ／ node _check/pinch2.js before（直す前と比較） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BEFORE=process.argv[2]==='before';
const FILE=BEFORE? '_before.html' : 'zumen_sekisan.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  if(BEFORE) require('./mkbefore')();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1500);
  /* イベントを流す道具をページに置く */
  await p.evaluate(()=>{
    const el=document.querySelector('#three-wrap canvas');
    window.__mk=(t,id,x,y)=>el.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',
      clientX:x,clientY:y,bubbles:true,cancelable:true}));
    window.__pinch=(id1,id2,cx,cy,d0,d1,steps)=>{
      __mk('pointerdown',id1,cx-d0/2,cy); __mk('pointerdown',id2,cx+d0/2,cy);
      for(let i=1;i<=steps;i++){ const d=d0+(d1-d0)*i/steps;
        __mk('pointermove',id1,cx-d/2,cy); __mk('pointermove',id2,cx+d/2,cy); }
      __mk('pointerup',id1,cx-d1/2,cy); __mk('pointerup',id2,cx+d1/2,cy);
    };
  });
  const cam=()=>p.evaluate(()=>({phi:+T.phi.toFixed(4),theta:+T.theta.toFixed(4),r:+T.r.toFixed(3)}));
  const CX=196, CY=430;

  /* --- ① 面（平場）を選択したままの二本指ズーム。屋根の真上に指を置く＝以前は面ドラッグに食われた --- */
  await p.evaluate(()=>{ setTool('sel'); try{ pick3({p:0,r:-1,e:-1,f:'deck'}); }catch(_){} });
  await p.waitForTimeout(300);
  const lv0=await p.evaluate(()=>+state.polys[0].lv||0);
  let c0=await cam();
  await p.evaluate(([cx,cy])=>__pinch(11,12,cx,cy,80,240,8),[CX,CY]);
  await p.waitForTimeout(300);
  let c1=await cam();
  const lv1=await p.evaluate(()=>+state.polys[0].lv||0);
  ok('①面を選んだままでも 広げる＝ズームイン', c1.r<c0.r*0.9, c0.r+' → '+c1.r);
  ok('①そのとき平場の高さは動かない（面ドラッグに食われない）', Math.abs(lv1-lv0)<0.001, lv0+' → '+lv1);
  ok('①傾き・向きは動かない', c1.phi===c0.phi&&c1.theta===c0.theta, '');
  /* 狭める＝ズームアウト */
  c0=c1;
  await p.evaluate(([cx,cy])=>__pinch(13,14,cx,cy,240,80,8),[CX,CY]);
  await p.waitForTimeout(200);
  c1=await cam();
  ok('①狭める＝ズームアウト', c1.r>c0.r*1.1, c0.r+' → '+c1.r);

  /* --- ② 3本目の指が触れる → 1本目を離す → そのまま動かす（組替え）。ズームが飛ばない --- */
  c0=await cam();
  const jump=await p.evaluate(([cx,cy])=>{
    __mk('pointerdown',21,cx-60,cy); __mk('pointerdown',22,cx+60,cy);
    __mk('pointermove',21,cx-62,cy); __mk('pointermove',22,cx+62,cy);
    const r1=T.r;
    __mk('pointerdown',23,cx,cy+120);          /* 手のひらの触れ */
    __mk('pointermove',23,cx+3,cy+120);        /* 3本目が少し動く */
    const r2=T.r;                               /* ここで飛んではいけない */
    __mk('pointerup',21,cx-62,cy);              /* 1本目を離す＝組替え */
    __mk('pointermove',22,cx+64,cy); __mk('pointermove',23,cx+2,cy+118);
    const r3=T.r;                               /* 組替え直後も飛ばない */
    __mk('pointermove',22,cx+90,cy); __mk('pointermove',23,cx-20,cy+140);  /* 新しい組で広げる */
    const r4=T.r;
    __mk('pointerup',22,cx+90,cy); __mk('pointerup',23,cx-20,cy+140);
    return {r1:+r1.toFixed(3),r2:+r2.toFixed(3),r3:+r3.toFixed(3),r4:+r4.toFixed(3)};
  },[CX,CY]);
  ok('②3本目の指でズームが飛ばない', Math.abs(jump.r2-jump.r1)<jump.r1*0.08, JSON.stringify(jump));
  ok('②指の組替え直後も飛ばない', Math.abs(jump.r3-jump.r2)<jump.r2*0.12, jump.r2+' → '+jump.r3);
  ok('②新しい組で広げるとズームインする', jump.r4<jump.r3, jump.r3+' → '+jump.r4);

  /* --- ③ up が届かない指（ゴースト）。1本指のパンでズームが変わらない＋6秒で掃除される --- */
  await p.evaluate(([cx,cy])=>{ __mk('pointerdown',31,cx-100,cy-100); },[CX,CY]);  /* up を送らない */
  await p.waitForTimeout(300);
  c0=await cam();
  await p.evaluate(([cx,cy])=>{      /* ゴーストが残ったまま1本指でなぞる */
    __mk('pointerdown',32,cx,cy);
    for(let i=1;i<=6;i++) __mk('pointermove',32,cx+i*15,cy);
    __mk('pointerup',32,cx+90,cy);
  },[CX,CY]);
  await p.waitForTimeout(200);
  c1=await cam();
  const drift1=Math.abs(c1.r-c0.r)/c0.r;
  await p.waitForTimeout(6300);       /* 6秒たてば次の down で掃除される */
  c0=await cam();
  await p.evaluate(([cx,cy])=>{
    __mk('pointerdown',33,cx,cy);
    for(let i=1;i<=6;i++) __mk('pointermove',33,cx+i*15,cy);
    __mk('pointerup',33,cx+90,cy);
  },[CX,CY]);
  await p.waitForTimeout(200);
  c1=await cam();
  ok('③掃除のあとは1本指のパンでズームが変わらない', Math.abs(c1.r-c0.r)<0.001,
     '直後のずれ'+(drift1*100).toFixed(1)+'% → 掃除後 '+c0.r+' → '+c1.r);
  /* 掃除後にふつうのピンチが効く */
  c0=c1;
  await p.evaluate(([cx,cy])=>__pinch(34,35,cx,cy,80,220,8),[CX,CY]);
  await p.waitForTimeout(200);
  c1=await cam();
  ok('③ゴースト掃除のあと、ピンチが正しく効く', c1.r<c0.r*0.9, c0.r+' → '+c1.r);

  /* --- ④ 面ドラッグ（1本指）は今までどおり効く・その間カメラは動かない --- */
  await p.evaluate(()=>{ try{d3ViewIso();}catch(_){} });   /* ①〜③でカメラが流れたので全体表示に戻す */
  await p.waitForTimeout(1200);
  const fd=await p.evaluate(async()=>{
    /* deck1.js と同じ段取り：きれいな長方形1面＋見やすいカメラで、タップ→ドラッグ */
    state.polys=[]; state.parts=[]; state.d3sol=[]; state.scaleM=0.5;
    drawPts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]; closePoly();
    setTool('sel'); sel=null; try{renderEdgeEdit();}catch(_){}
    build3D(); await new Promise(r2=>setTimeout(r2,700));
    T.theta=-0.7; T.phi=0.9; T.rev++;
    await new Promise(r2=>setTimeout(r2,500));
    const el=document.querySelector('#three-wrap canvas');
    const r=el.getBoundingClientRect();
    const pp=state.polys[0], sM=state.scaleM;
    let cx=0, cy=0; pp.pts.forEach(q=>{cx+=q.x; cy+=q.y;});
    cx=cx/pp.pts.length*sM; cy=cy/pp.pts.length*sM;
    const v=new THREE.Vector3(cx,(+pp.lv||0)+0.02,cy).project(T.camera);
    const hit={x:r.left+(v.x+1)/2*r.width, y:r.top+(1-(v.y+1)/2)*r.height};
    __mk('pointerdown',41,hit.x,hit.y); __mk('pointerup',41,hit.x,hit.y);   /* タップ＝面を選ぶ */
    await new Promise(r2=>setTimeout(r2,500));
    if(!(sel&&sel.f==='deck')) return {no:1, sel:JSON.stringify(sel)};
    const lvA=+pp.lv||0, cam0={tx:T.tx,tz:T.tz,r:T.r};
    __mk('pointerdown',42,hit.x,hit.y);
    for(let i=1;i<=10;i++) __mk('pointermove',42,hit.x,hit.y-i*32);
    __mk('pointerup',42,hit.x,hit.y-320);
    await new Promise(r2=>setTimeout(r2,500));
    return {lvA:lvA, lvB:+pp.lv||0,
            camMoved:(Math.abs(T.tx-cam0.tx)+Math.abs(T.tz-cam0.tz)+Math.abs(T.r-cam0.r))};
  });
  if(fd.no){ ok('④平場が画面から見つかる', false, 'タップで選べず sel='+fd.sel); }
  else{
    ok('④面ドラッグで平場が上がる（機能は生きている）', fd.lvB>fd.lvA, fd.lvA+' → '+fd.lvB);
    ok('④面ドラッグの間、カメラは動かない', fd.camMoved<0.001, 'ずれ '+fd.camMoved.toFixed(4));
  }

  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((BEFORE?'【直す前 _before.html】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
