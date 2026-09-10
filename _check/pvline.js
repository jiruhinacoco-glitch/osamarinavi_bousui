/* ★2026-09-10 本人の動画「ちゃんと線引けてないよ」。
   予告線（赤い点線）が **真ん中でとぎれて2本に割れ**、しかもカーソルまで届いていなかった。

   ★測り方は現実と同じ：**画面に出ている線そのもの（nnPvLine2）を読んで**
     ①線と線のあいだの すきま ②線の先が狙いに届いているか を測る。
     モデルの中の数字ではなく「見えている線」で測る。
   使い方: node _check/pvline.js  ／ node _check/pvline.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:700},deviceScaleFactor:1});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1;
    /* L字の屋根：(5,4) が出隅（本人の画面と同じ形） */
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}];
    state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250,ch:30})),lv:0,name:'屋根①'}];
    state.parts=[];state.d3sol=[];state.d3sheet=[]; saveState(); setTab('d3'); });
  await p.waitForTimeout(2400);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnFocusBtn,#nnQuickBar{display:none!important}'});
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.25, phi:0.95, tx:4.7, tz:3.7, r:2.6}); T.rev=(T.rev|0)+1; });
  /* カメラは時間ではなく条件で待つ */
  await p.waitForFunction(()=>{ try{ const q=T.camera.getWorldPosition(new THREE.Vector3()).toArray().map(v=>v.toFixed(4)).join(',');
    if(window.__q===q){ window.__n=(window.__n|0)+1; } else { window.__q=q; window.__n=0; }
    return (window.__n|0)>=8; }catch(_){ return false; } },{timeout:20000,polling:60});

  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },c);

  /* 画面に出ている予告線を読む。すきま・とどく距離・黄色い印の長さ */
  const read=(tg)=>p.evaluate((tg)=>{
    let gr=null, one=null, gd=null;
    T.scene.traverse(o=>{ if(o.name==='nnPvLine2') gr=o; if(o.name==='nnPvLine') one=o;
                          if(o.name==='nnPvGuide') gd=o; });
    const out={};
    /* 吸い付きの黄色い印：ひと続きの線分が長すぎたら「建物を突き抜けている」 */
    out.guide=0;
    if(gd) gd.children.forEach(o=>{ if(!o.isLine||!o.geometry) return;
      const a=o.geometry.attributes.position; if(!a||a.count<2) return;
      for(let i=1;i<a.count;i++){
        const d=Math.hypot(a.getX(i)-a.getX(i-1),a.getY(i)-a.getY(i-1),a.getZ(i)-a.getZ(i-1));
        if(d>out.guide) out.guide=+d.toFixed(3); } });
    if(!gr){ out.one=!!one; return out; }
    const segs=[];
    gr.children.forEach(o=>{ if(!o.isLine||!o.geometry||!o.geometry.attributes.position) return;
      const a=o.geometry.attributes.position; if(a.count<2) return;
      segs.push({A:[a.getX(0),a.getY(0),a.getZ(0)], B:[a.getX(1),a.getY(1),a.getZ(1)]}); });
    if(!segs.length){ out.n=0; return out; }
    const V=q=>new THREE.Vector3(q[0],q[1],q[2]);
    const P0=V(segs[0].A); let far=P0, fd=0;
    segs.forEach(s=>{ [s.A,s.B].forEach(q=>{ const d=P0.distanceTo(V(q)); if(d>fd){fd=d; far=V(q);} }); });
    const dir=far.clone().sub(P0), L=dir.length();
    if(L<1e-6){ out.n=segs.length; out.deg=1; return out; }
    dir.normalize();
    const iv=segs.map(s=>{ const ta=V(s.A).sub(P0).dot(dir), tb=V(s.B).sub(P0).dot(dir);
      return {lo:Math.min(ta,tb), hi:Math.max(ta,tb)}; }).sort((x,y)=>x.lo-y.lo);
    let cov=0, hi=iv[0].lo, maxGap=0;
    iv.forEach(g=>{ if(g.lo>hi+1e-6){ maxGap=Math.max(maxGap,g.lo-hi); hi=g.lo; }
      if(g.hi>hi){ cov+=g.hi-hi; hi=g.hi; } });
    /* 線の先が狙いにどれだけ届いているか（＝途中で切れていないか） */
    const TG=new THREE.Vector3(tg[0],tg[1],tg[2]);
    let reach=1e9;
    segs.forEach(s=>{ reach=Math.min(reach, TG.distanceTo(V(s.A)), TG.distanceTo(V(s.B))); });
    out.n=segs.length; out.total=+L.toFixed(4); out.cov=+cov.toFixed(4);
    out.maxGap=+maxGap.toFixed(4); out.reach=+reach.toFixed(3);
    return out;
  },tg);

  const cases=[
    ['立上り→同じ立上り（まっすぐ）', [5.50,0.15,3.744], [5.90,0.22,3.744], 0.08],
    ['立上り→出隅をまたいで となりの立上り', [5.50,0.15,3.744], [4.744,0.20,4.30], 0.10],
    ['立上り→平場（入隅をこえる）', [5.50,0.15,3.744], [5.30,0.012,3.30], 0.08],
    ['平場→立上り', [5.50,0.012,3.40], [5.50,0.20,3.744], 0.08],
    ['平場→平場（壁ぎわを走る）', [5.50,0.012,3.40], [6.40,0.012,3.40], 0.08],
    ['天端→同じ天端', [5.50,0.312,3.88], [5.90,0.312,3.88], 0.08],
    ['天端→出隅をまたいで となりの天端', [5.50,0.312,3.88], [4.88,0.312,4.30], 0.10],
    ['天端→面取り→立上り', [5.50,0.312,3.88], [5.50,0.10,3.744], 0.08],
    /* ★出隅の「線」の延長の上を横切る（ここが §381 の本命）。
       立上りは辺の長さの中にしか無いのに、無限にのびる平面で判定していたため、
       この帯ぜんぶが「面が無い」ことにされていた。 */
    ['平場を横切る（出隅のすぐ手前）', [4.00,0.012,3.50], [6.50,0.012,3.50], 0.08],
  ];
  for(const [nm,st,tg,tol] of cases){
    await p.evaluate(()=>{ try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      state.d3sheet=[]; nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(250);
    const s1=await SCR(st); await p.mouse.click(s1.x,s1.y); await p.waitForTimeout(300);
    const n1=await p.evaluate(()=>{const d=window.nnD3DrawDbg&&nnD3DrawDbg();return d?d.pts.length:0;});
    if(n1!==1){ ok(false,'【'+nm+'】1点目が置けた',{n:n1}); continue; }
    const s2=await SCR(tg); await p.mouse.move(s2.x,s2.y); await p.waitForTimeout(260);
    const R=await read(tg);
    console.log('  '+nm+' '+JSON.stringify(R));
    ok(R.n>0,'【'+nm+'】予告線が出る',R);
    if(!(R.n>0)) continue;
    ok(R.maxGap<=0.005,'【'+nm+'】線がとぎれていない（すきま5mm以内）',
       {すきま_mm:Math.round(R.maxGap*1000), 本数:R.n});
    ok(R.reach<=tol,'【'+nm+'】線の先が狙いまで届いている（'+Math.round(tol*1000)+'mm以内）',
       {とどかない_mm:Math.round(R.reach*1000)});
    ok(R.guide<=0.12,'【'+nm+'】吸い付きの黄色い印が建物を突き抜けていない（1本の線分が12cm以内）',
       {いちばん長い線分_mm:Math.round(R.guide*1000)});
  }
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 予告線はとぎれず、狙いまで届く');
  await b.close(); process.exit(ng?1:0);
})();
