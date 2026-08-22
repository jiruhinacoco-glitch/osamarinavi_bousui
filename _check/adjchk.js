/* ★2026-08-16s 隣り合う屋根：境界の辺を自動でつなぐ／立上りを二重にしない
   使い方: node adjchk.js  （スマホは node adjchk.js ph） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                            :{viewport:{width:1400,height:900}});
  if(PH)await p.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});
    Object.defineProperty(screen,'height',{get:()=>852});}catch(e){} });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{localStorage.removeItem('nn_zumen_v1');}catch(e){} });
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

  /* ---- 準備：屋根①を10×6マスの長方形で作る（データを直接入れる） ---- */
  await p.evaluate(()=>{
    state.polys=[]; state.active=-1; drawPts=[];
    const pts=[{x:4,y:4},{x:14,y:4},{x:14,y:10},{x:4,y:10}];
    state.polys.push({name:'屋根①', lv:0, pts:pts,
      edges:pts.map(()=>({h:300,w:250,k:'para'}))});
    state.active=0; saveState(); renderPolyList(); draw();
  });

  /* ---- ① 屋根②を右どなりに「境界を引かずに」描く ----
     始点＝屋根①の右上(14,4)／点を2つ置いて／最後は右下(14,10)の上でタップ。
     ＝境界（14,4)-(14,10) は自動で補われるはず。 */
  const res=await p.evaluate(()=>{
    setTool('draw'); drawPts=[{x:14,y:4},{x:20,y:4},{x:20,y:10}];
    const r=nnResolvePoint(14,10);                     /* 屋根①の輪郭の上 */
    return {close:r.close, adj:!!r.adj, g:r.g, pend:!!nnAdjPending()};
  });
  ok('境界の上で「閉じられる」と判定される', res.close&&res.adj, JSON.stringify(res));

  const made=await p.evaluate(()=>{
    closeShape('draw');
    const q=state.polys[1];
    return q?{n:q.pts.length, pts:q.pts.map(p=>p.x+','+p.y).join(' / '),
      area:+polyAreaM(q.pts,state.scaleM).toFixed(2),
      kinds:q.edges.map(e=>e.k).join(',')}:null;
  });
  console.log('できた屋根②', JSON.stringify(made));
  ok('屋根②ができる', !!made);
  ok('境界の頂点が自動で入る（4点の長方形）', made&&made.n===4, made&&made.n+'点 '+made.pts);
  ok('面積が正しい（6×6マス＝0.5m角なので9㎡）', made&&Math.abs(made.area-9)<0.01, made&&made.area+'㎡');

  /* ---- ② 同じ高さなら、境界は両側とも「立上りなし」 ---- */
  const same=await p.evaluate(()=>{
    const A=state.polys[0], B=state.polys[1];
    const iA=A.pts.findIndex((p,i)=>{ const q=A.pts[(i+1)%A.pts.length];
      return (p.x===14&&q.x===14)||(q.x===14&&p.x===14); });
    const iB=B.pts.findIndex((p,i)=>{ const q=B.pts[(i+1)%B.pts.length];
      return (p.x===14&&q.x===14); });
    return {a:iA>=0?A.edges[iA].k:'?', b:iB>=0?B.edges[iB].k:'?',
      aH:iA>=0?A.edges[iA].h:-1, bH:iB>=0?B.edges[iB].h:-1};
  });
  ok('同じ高さ：境界は両側とも立上りなし', same.a==='free'&&same.b==='free'&&same.aH===0&&same.bH===0,
     JSON.stringify(same));

  /* ---- ③ 屋根②を1階（GL 0）／屋根①を2階（GL+4）にすると、低いほうが壁当り ---- */
  const diff=await p.evaluate(()=>{
    state.polys[0].lv=4; nnSyncSharedEdges();
    const A=state.polys[0], B=state.polys[1];
    const iA=A.pts.findIndex((p,i)=>{ const q=A.pts[(i+1)%A.pts.length]; return p.x===14&&q.x===14; });
    const iB=B.pts.findIndex((p,i)=>{ const q=B.pts[(i+1)%B.pts.length]; return p.x===14&&q.x===14; });
    return {high:iA>=0?A.edges[iA].k:'?', low:iB>=0?B.edges[iB].k:'?',
      lowH:iB>=0?B.edges[iB].h:-1};
  });
  ok('★高さが違う：低いほうが壁当り・高いほうはパラペット（立上りは2つにならない）',
     diff.low==='kabe' && diff.high==='para' && diff.lowH>0, JSON.stringify(diff));

  /* ---- ④ 手で境界をなぞって描いた場合も、種別がそろう ---- */
  const manual=await p.evaluate(()=>{
    state.polys=[]; drawPts=[];
    const a=[{x:4,y:4},{x:14,y:4},{x:14,y:10},{x:4,y:10}];
    const c=[{x:14,y:4},{x:20,y:4},{x:20,y:10},{x:14,y:10}];   /* 境界を手で引いた形 */
    state.polys.push({name:'屋根①',lv:2,pts:a,edges:a.map(()=>({h:300,w:250,k:'para'}))});
    state.polys.push({name:'屋根②',lv:0,pts:c,edges:c.map(()=>({h:300,w:250,k:'para'}))});
    const n=nnSyncSharedEdges();
    const A=state.polys[0], B=state.polys[1];
    const iA=A.pts.findIndex((p,i)=>{ const q=A.pts[(i+1)%A.pts.length]; return p.x===14&&q.x===14; });
    const iB=B.pts.findIndex((p,i)=>{ const q=B.pts[(i+1)%B.pts.length]; return p.x===14&&q.x===14; });
    return {n:n, high:A.edges[iA].k, low:B.edges[iB].k};
  });
  ok('手で引いた境界も、立上りが二重にならない', manual.n>0 && manual.low==='kabe' && manual.high==='para',
     JSON.stringify(manual));

  /* ---- ⑤ 隣に接していないときは、今までどおり（自動で閉じない） ---- */
  const far=await p.evaluate(()=>{
    /* ★setTool は drawPts を空にするので、必ず先に呼ぶこと（ここで1回ハマった） */
    setTool('draw');
    state.polys=[state.polys[0]]; drawPts=[{x:30,y:30},{x:34,y:30},{x:34,y:34}];
    const r=nnResolvePoint(31,34);
    return {close:r.close, adj:!!r.adj};
  });
  ok('離れた場所では今までどおり（勝手に閉じない）', !far.close && !far.adj, JSON.stringify(far));

  /* ---- ⑥ 始点タップの「ふつうの閉じる」は今までどおり ---- */
  const norm=await p.evaluate(()=>{
    setTool('draw');
    state.polys=[]; drawPts=[{x:30,y:30},{x:34,y:30},{x:34,y:34}];
    const r=nnResolvePoint(30.05,30.05);
    return {close:r.close, adj:!!r.adj};
  });
  ok('始点をタップすれば今までどおり閉じる', norm.close && !norm.adj, JSON.stringify(norm));

  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
