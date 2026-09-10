/* ★2026-09-10 本人の指摘①「立上りに1点目を打って平場に打とうとしたら、
   立上りには線があるのに **平場に線がない**。崩壊しているのでは？」

   ■ 何を見ているか
   入隅（立上りと平場の境目）への吸い付きは **画面で9px以内** で決めている（§361）。
   ところが**低い視点（寝かせて見る）では、壁ぎわの平場が画面でつぶれて見える**ので、
   9px が現場の 10〜20cm にもなる。すると平場をねらっても点が入隅へ引き戻され、
   予告線が立上りから先へ出ない＝本人の画面そのもの。

   ■ 測り方は現実と同じ
   ・平場の「壁から◯m」をねらって、**実際に置かれる点が壁から何m か**を測る（現場のm）
   ・入隅ちょうどをねらったときは、いままでどおり入隅に乗ること（§361・§382を壊さない）
   使い方: node _check/hiraba.js  ／ node _check/hiraba.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FO=7.75, START=[5.00,0.15,FO];       /* 壁 y=8 の内面（立上りの防水面）に1点目 */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:700},deviceScaleFactor:1});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1;
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250,ch:30})),lv:0,name:'屋根①'}];
    state.parts=[];state.d3sol=[];state.d3sheet=[]; saveState(); setTab('d3'); });
  await p.waitForTimeout(2400);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnFocusBtn,#nnQuickBar{display:none!important}'});

  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  const cam=async(ph,rr)=>{
    await p.evaluate(({ph,rr})=>{ Object.assign(T,{theta:Math.PI*1.25, phi:ph, tx:5.0, tz:3.4, r:rr});
      T.rev=(T.rev|0)+1; window.__q=null; window.__n=0; },{ph,rr});
    await p.waitForFunction(()=>{ try{ const q=T.camera.getWorldPosition(new THREE.Vector3()).toArray().map(v=>v.toFixed(4)).join(',');
      if(window.__q===q){ window.__n=(window.__n|0)+1; } else { window.__q=q; window.__n=0; }
      return (window.__n|0)>=8; }catch(_){ return false; } },{timeout:20000,polling:60});
  };
  const aimAt=async(c)=>{ const s=await SCR(c); await p.mouse.move(s.x,s.y); await p.waitForTimeout(190);
    /* 予告線と札を確実に出す（検査用の入口。マウスを動かすだけだと見え方によって出ない） */
    await p.evaluate(({sx,sy})=>{ try{ nnD3LineAt(sx,sy); }catch(_){} },{sx:s.x,sy:s.y});
    await p.waitForTimeout(120);
    return p.evaluate(({sx,sy})=>{ const D=window.nnD3AimDbg?nnD3AimDbg(sx,sy):null;
      return {via:D&&D.via, fold:!!(D&&D.fold), w:D&&D.w?D.w.map(v=>+v.toFixed(4)):null}; },{sx:s.x,sy:s.y}); };
  /* 画面に出ている予告線が、狙いまで届いているか
     （道の上は nnPvLine2＝段ごとの折れ線／平らな面だけなら nnPvLine＝1本。両方見る） */
  const reachOf=(tg)=>p.evaluate(tg=>{
    const TG=new THREE.Vector3(tg[0],tg[1],tg[2]); let r=1e9;
    const eat=o=>{ if(!o||!o.isLine||!o.geometry||!o.geometry.attributes.position) return;
      const a=o.geometry.attributes.position;
      for(let i=0;i<a.count;i++) r=Math.min(r, TG.distanceTo(new THREE.Vector3(a.getX(i),a.getY(i),a.getZ(i)))); };
    T.scene.traverse(o=>{ if(o.name==='nnPvLine2'){ (o.children||[]).forEach(eat); }
                          else if(o.name==='nnPvLine'){ eat(o); } });
    return r===1e9?null:+r.toFixed(3);
  },tg);
  /* その場所で「画面の1px は現場の何m か」（寝かせて見ると1pxが数cmになる＝これより細かくは狙えない） */
  const mPerPx=async(c)=>{ const a=await SCR(c), b2=await SCR([c[0],c[1],c[2]+0.05]);
    const px=Math.hypot(a.x-b2.x,a.y-b2.y); return px>0.01?(0.05/px):1; };

  /* phi が大きいほど「寝かせて見る」＝壁ぎわの平場が画面でつぶれる */
  const views=[['ふつうの見下ろし',0.75,2.4],['低い視点',1.20,2.4],['かなり寝かせた視点',1.42,2.0]];
  for(const [vn,ph,rr] of views){
    await cam(ph,rr);
    await p.evaluate(()=>{ try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      state.d3sheet=[]; nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(260);
    const s1=await SCR(START); await p.mouse.click(s1.x,s1.y); await p.waitForTimeout(320);
    const n1=await p.evaluate(()=>{const d=window.nnD3DrawDbg&&nnD3DrawDbg();return d?d.pts.length:0;});
    ok(n1===1,'【'+vn+'】立上りに1点目が置ける',{n:n1});
    if(n1!==1) continue;

    /* ① 平場をねらったら、平場に置かれる（入隅へ引き戻されない）
       ★ゆるし幅は 30mm。ただし寝かせた視点では画面の1pxが現場の数cmになるので、
         「2px ぶん」より細かくは求めない（人にも狙えないため）。 */
    let worst=0, wd=null, worstTol=0;
    for(const dist of [0.10,0.15,0.20,0.30,0.50]){
      const tg=[5.00,0.012,FO-dist];
      const R=await aimAt(tg);
      if(!R||!R.w){ ok(false,'【'+vn+'】壁から'+dist+'m が狙える',R); continue; }
      const inner=FO-R.w[2];                      /* 実際に置かれた点は壁から何m内側か */
      const tol=Math.max(0.03, 2*(await mPerPx(tg)));
      const gap=(dist-inner)-tol;                 /* ＋＝壁のほうへ引き戻された量（これが不具合） */
      if(gap>worst){ worst=gap; worstTol=tol;
        wd={ねらい_m:dist, 置かれた_m:+inner.toFixed(3), 吸い付き:R.via, ゆるし_mm:Math.round(tol*1000)}; }
    }
    ok(worst<=0,'【'+vn+'】平場をねらったら平場に置かれる（入隅へ引き戻されない）',
       {はみ出し_mm:Math.round(worst*1000), worst:wd});

    /* ② 予告線が平場まで届く（本人の「平場に線がない」） */
    const tgL=[5.00,0.012,FO-0.20];
    await aimAt(tgL);
    const rc=await reachOf(tgL);
    ok(rc!=null && rc<=0.05,'【'+vn+'】予告線が平場のねらい（壁から20cm）まで届く（50mm以内）',
       {とどかない_mm:rc==null?null:Math.round(rc*1000)});

    /* ③ 入隅ちょうどをねらったら、いままでどおり入隅に乗る（§361・§382を壊さない） */
    const R3=await aimAt([5.00,0.012,FO]);
    const onIri = R3.w && Math.abs(R3.w[1]-0.012)<0.015 && Math.abs(FO-R3.w[2])<0.015;
    ok(onIri,'【'+vn+'】入隅ちょうどをねらえば入隅に乗る',R3);
    ok(!!R3.fold,'【'+vn+'】入隅に乗った合図が出る',{fold:R3.fold, via:R3.via});
  }
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 平場をねらえば平場に打てる（入隅に吸い付きすぎない）');
  await b.close(); process.exit(ng?1:0);
})();
