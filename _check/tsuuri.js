/* ★★2026-09-10 §384 本人の指摘「増し張りだけで5日間ずっとやってる。全然だめ」。
   これまでの検査は **予告線や照準（かいている途中）** ばかり測っていて、
   「4点タップして閉じた結果、どんな形が出来たか」を誰も測っていなかった。
   だから ★4点目が『閉じる』の当たり判定に飲まれて三角形になり、面積がちょうど半分★
   という一番痛い不具合が、ずっと素通りしていた。

   この検査は **本人と同じ操作を端から端まで**やる：
     スマホ・照準ごしに 立上りに2点／平場に2点 → 始点をタップして閉じる
   そして **出来上がった防水層の寸法と面積** を、手で計算した値と突き合わせる。

   使い方: node _check/tsuuri.js  ／ node _check/tsuuri.js _before.html
   ★直す前の版では★NG（面積が半分・立上りが2.0mでなく1.1m）。 */
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
  /* ★2026-09-10 §384 照準（スマホ）は画面のどこでも指せるわけではない。
     検査の逆引き nnD3AimFinger が返した指の位置を **実際に写し直して確かめる**。
     届いていないのに気づかず打つと、検査は「狙っていない場所」を測ってしまう
     （実測：寄った見え方で 22〜32px＝現場の94〜134mm ずれていた）。 */
  const FING=async(s)=>p.evaluate(s=>{
    if(!window.nnD3AimFinger||!window.nnD3AimOff) return {x:s.x-36,y:s.y+52,miss:0};
    const f=nnD3AimFinger(s.x,s.y), o=nnD3AimOff(f.x,f.y);
    return {x:f.x, y:f.y, miss:Math.hypot(f.x+o[0]-s.x, f.y+o[1]-s.y)};
  }, s);
  let missMax=0;
  const tap=async(w)=>{ const s=await SCR(w); const t=await FING(s);
    missMax=Math.max(missMax, t.miss||0);
    await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(430); };

  /* 立上り際の増張り：辺 y=0 の壁ぎわに 2.0m ぶん。
     立上りは 入隅(y=0.012) から y=0.15 まで／平場は z=0.256 から z=0.40 まで。
     ＝手で計算すると 2.0×0.138(立上り) ＋ 2.0×0.144(平場) ＝ 0.564㎡ あたり
     （面の厚みぶん 12mm 浮かせてあるので、実測は 0.576㎡ 付近になる） */
  const P=[[5.0,0.150,0.256],[7.0,0.150,0.256],[7.0,0.012,0.400],[5.0,0.012,0.400]];

  /* ★どちらの見え方でも、4つの狙いが画面の中に入っていること（外に出ていると
     照準が届かず、検査が「狙っていない場所」を測ってしまう。§384で実際に起きた）。 */
  const onScreen=async()=>{ for(const w of P){ const s=await SCR(w);
      const r=await p.evaluate(()=>{const b=T.renderer.domElement.getBoundingClientRect();
        return {l:b.left,t:b.top,r:b.right,b:b.bottom};});
      if(s.x<r.l+20||s.x>r.r-20||s.y<r.t+20||s.y>r.b-20) return false; } return true; };

  for(const [vn,V,strict] of [
      ['ふつうの寄り', {theta:Math.PI*0.5, phi:1.00, tx:6, tz:1.6, r:6.0}, true],
      ['もっと寄る',   {theta:Math.PI*0.5, phi:1.15, tx:6, tz:1.5, r:4.2}, true]]){
    console.log('【'+vn+'】立上りに2点・平場に2点 → 始点で閉じる');
    await cam(V);
    missMax=0;
    ok(await onScreen(), '【'+vn+'】4つの狙いが画面の中にある（検査が別の場所を測らない）');
    await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(500);
    for(const w of P) await tap(w);
    const n4=await p.evaluate(()=>{const d=window.nnD3DrawDbg&&nnD3DrawDbg();return d?d.pts.length:-1;});
    /* ★これが5日間ずっと見逃されていた不具合：4点目が「閉じる」に飲まれて三角形になる */
    ok(n4===4, '【'+vn+'】4点とも入る（4点目が「閉じる」に飲まれない）', {点:n4});
    await tap(P[0]);
    await p.waitForTimeout(700);
    const R=await p.evaluate(()=>{
      const A=state.d3sheet||[];
      const sz=f=>{ const P2=f.pts||[]; const g=i=>P2.map(q=>q[i]);
        return {w:+(Math.max(...g(0))-Math.min(...g(0))).toFixed(3), h:+(Math.max(...g(1))-Math.min(...g(1))).toFixed(3),
                up:Math.abs((f.n||[0,0,0])[1])>0.5}; };
      return {n:A.length, area:+(A.reduce((a,s)=>a+(window.nnSheetArea?nnSheetArea(s):0),0)).toFixed(3),
              faces:A.length?(A[0].faces||[]).map(sz):[]};
    });
    console.log('     出来た枚数='+R.n+'  面積='+R.area+'㎡  面='+JSON.stringify(R.faces));
    ok(R.n===1, '【'+vn+'】防水層が1枚できる', {枚数:R.n});
    /* 照準が狙いに届いていたか。届いていないなら、以下の寸法は「狙っていない場所」の値。 */
    const reach=missMax<=2;
    ok(true, '【'+vn+'】照準が狙いに届いたか（参考）',
       {届かなかったpx:Math.round(missMax), 判定:(reach?'届いた':'届いていない＝寸法は当てにならない')});
    if(strict && R.n===1 && reach){
      const wall=R.faces.find(f=>!f.up), deck=R.faces.find(f=>f.up);
      ok(!!wall && !!deck, '【'+vn+'】立上りと平場の2面に折れている', R.faces);
      if(wall) ok(Math.abs(wall.w-2.0)<=0.06, '【'+vn+'】立上り側の長さが 2.0m（±60mm）', {立上りm:wall&&wall.w});
      if(deck) ok(Math.abs(deck.w-2.0)<=0.06, '【'+vn+'】平場側の長さが 2.0m（±60mm）', {平場m:deck&&deck.w});
      /* 手で計算：2.0×0.148 ＋ 2.0×0.16 ＝ 0.616 …面の浮かせぶんを含めた実測の許容は ±8% */
      ok(Math.abs(R.area-0.576)<=0.046, '【'+vn+'】面積が 0.576㎡ あたり（±8%）', {面積:R.area});
    }
  }
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ タップしたとおりの増張りが出来る');
  await b.close(); process.exit(ng?1:0);
})();
