/* ★2026-09-10 本人の指摘「なぜ垂直に線を下せない？？ ただ立上り面の点から垂直におろし、
   平場と立上りの境界線に点を置くだけです。なぜそれができずに謎の青い線が
   よくわからない角度で出てくる？？」

   ★測り方は現実と同じ：立上りの点から **真下** をねらって、
     ①点が横にずれないか（横ずれ mm）②入隅（立上りと平場の境目）に乗るか
     ③**引いている向きの逆へ跳ね上がらないか**（上の折れ目に吸い付かないか）
   ★浅い見下ろし（立上りが画面で8pxしか見えない見え方）でも確かめる。
     本人の画面はほぼ真上から見ているので、ここが本番。
   使い方: node _check/tate.js  ／ node _check/tate.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FO=3.744, START=[5.50,0.22,FO];      /* 壁 z=4 の内面（防水面）／立上りの点 */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:700},deviceScaleFactor:1});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1;
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}];
    state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250,ch:30})),lv:0,name:'屋根①'}];
    state.parts=[];state.d3sol=[];state.d3sheet=[]; saveState(); setTab('d3'); });
  await p.waitForTimeout(2400);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnFocusBtn,#nnQuickBar{display:none!important}'});
  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  const cam=async(ph,rr)=>{
    await p.evaluate(({ph,rr})=>{ Object.assign(T,{theta:Math.PI*1.25, phi:ph, tx:4.7, tz:3.7, r:rr});
      T.rev=(T.rev|0)+1; window.__q=null; window.__n=0; },{ph,rr});
    /* カメラは時間ではなく条件で待つ */
    await p.waitForFunction(()=>{ try{ const q=T.camera.getWorldPosition(new THREE.Vector3()).toArray().map(v=>v.toFixed(4)).join(',');
      if(window.__q===q){ window.__n=(window.__n|0)+1; } else { window.__q=q; window.__n=0; }
      return (window.__n|0)>=8; }catch(_){ return false; } },{timeout:20000,polling:60});
  };
  const views=[[0.95,2.6,'ふつうの見下ろし'],[0.45,4,'浅い見下ろし'],[0.25,6,'ほぼ真上']];
  for(const [ph,rr,vn] of views){
    await cam(ph,rr);
    /* 立上りが画面で何px見えているか（＝どれだけ狙いにくい見え方か） */
    const a=await SCR(START), c0=await SCR([5.50,0.012,FO]);
    const wallPx=Math.round(Math.hypot(a.x-c0.x,a.y-c0.y));
    await p.evaluate(()=>{ try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      state.d3sheet=[]; nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(300);
    await p.mouse.click(a.x,a.y); await p.waitForTimeout(350);
    const n1=await p.evaluate(()=>{const d=window.nnD3DrawDbg&&nnD3DrawDbg();return d?d.pts.length:0;});
    ok(n1===1,'【'+vn+'（立上りが画面で'+wallPx+'px）】立上りに1点目が置ける',{n:n1});
    if(n1!==1) continue;
    /* 真下をねらう（立上りの上から入隅の少し先まで） */
    const aims=[
      ['立上りの途中 y=0.15', [5.50,0.15,FO], 0.22],
      ['立上りの下 y=0.10',   [5.50,0.10,FO], 0.22],
      ['入隅ちょうど',        [5.50,0.012,FO], 0.22],
      ['入隅の2cm先（平場）', [5.50,0.012,FO-0.02], 0.22],
    ];
    /* ★ここで見るのは「立上りの上〜入隅のすぐ先」をねらったとき。
       もっと平場の奥（10cm以上）をねらったら、平場に入るのが正しい（下で別に確かめる）。 */
    let worstYoko=0, worstUp=0, wu=null, wy=null;
    for(const [an,tg] of aims){
      const s2=await SCR(tg); await p.mouse.move(s2.x,s2.y); await p.waitForTimeout(200);
      const R=await p.evaluate(({sx,sy})=>{ const D=window.nnD3AimDbg?nnD3AimDbg(sx,sy):null;
        return {via:D&&D.via, w:D&&D.w?D.w.map(v=>+v.toFixed(4)):null}; },{sx:s2.x,sy:s2.y});
      if(!R.w){ ok(false,'【'+vn+'】'+an+'：打点が出る',R); continue; }
      const yoko=Math.hypot(R.w[0]-START[0], R.w[2]-START[2]);   /* 横にずれた量 */
      const up=R.w[1]-START[1];                                   /* ＋なら上へ跳ねた */
      if(yoko>worstYoko){ worstYoko=yoko; wy={an, via:R.via, w:R.w}; }
      if(up>worstUp){ worstUp=up; wu={an, via:R.via, w:R.w}; }
    }
    ok(worstYoko<=0.006,'【'+vn+'】真下をねらったら、点が横にずれない（6mm以内）',
       {横ずれ_mm:Math.round(worstYoko*1000), worst:wy});
    ok(worstUp<=0.006,'【'+vn+'】真下をねらったのに、点が上へ跳ね上がらない（6mm以内）',
       {上へ_mm:Math.round(worstUp*1000), worst:wu});
    /* 入隅（立上りと平場の境目）に、ちゃんと乗るか */
    const s3=await SCR([5.50,0.012,FO]); await p.mouse.move(s3.x,s3.y); await p.waitForTimeout(200);
    const R3=await p.evaluate(({sx,sy})=>{ const D=window.nnD3AimDbg?nnD3AimDbg(sx,sy):null;
      return {via:D&&D.via, fold:D&&D.fold, w:D&&D.w?D.w.map(v=>+v.toFixed(4)):null}; },{sx:s3.x,sy:s3.y});
    const onIri = R3.w && Math.abs(R3.w[1]-0.012)<0.004 && Math.abs(R3.w[2]-FO)<0.004;
    ok(onIri,'【'+vn+'】入隅（立上りと平場の境目）の上に点が乗る',R3);
    ok(!!R3.fold,'【'+vn+'】入隅に乗ったことが分かる合図が出る',{fold:R3.fold, via:R3.via});
    /* ★入隅が「吸い付きすぎ」ないこと＝平場の奥をねらったら、ちゃんと平場に入る */
    const s4=await SCR([5.50,0.012,FO-0.15]); await p.mouse.move(s4.x,s4.y); await p.waitForTimeout(200);
    const R4=await p.evaluate(({sx,sy})=>{ const D=window.nnD3AimDbg?nnD3AimDbg(sx,sy):null;
      return {via:D&&D.via, w:D&&D.w?D.w.map(v=>+v.toFixed(4)):null}; },{sx:s4.x,sy:s4.y});
    ok(R4.w && (FO-R4.w[2])>0.10,'【'+vn+'】平場の奥（15cm）をねらえば、ちゃんと平場に入る（吸い付きすぎない）',
       {平場へ_mm:R4.w?Math.round((FO-R4.w[2])*1000):null, via:R4.via});
  }
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 立上りから真下に下ろして、入隅に点が置ける');
  await b.close(); process.exit(ng?1:0);
})();
