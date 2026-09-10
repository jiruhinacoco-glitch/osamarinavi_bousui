/* ★2026-09-10 本人の指摘②「たくさん打点して戻るボタンを押しても、
   なぜか打点した順番で打点が消えていかない。崩壊しているのでは？」

   ■ 何を見ているか
   打点は2つの配列に入る：内部の2D座標 DS.pts と、**実際にさわった3Dの点 DS.w**（§348）。
   「1点戻す」が pts しか減らさないと、この2本の数が食い違う。
   食い違うと、あちこちの処理が「DS.w は使えない」と判断して**平面に落とした点**に
   すり替わる（寸法・予告線・貼り物の形）ので、残った点の位置が動いて見える
   ＝「打った順に消えていかない」。さらに、予告線の始まりは
   DS.w の最後（＝**消したはずの点**）のままになる。

   ■ 測り方は現実と同じ
   打った点の3Dの位置を控えておき、1点ずつ戻して
   ①残った点が動かないこと ②予告線が「新しい最後の点」から出ること を測る。
   使い方: node _check/modoru.js  ／ node _check/modoru.js _before.html */
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
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250,ch:30})),lv:0,name:'屋根①'}];
    state.parts=[];state.d3sol=[];state.d3sheet=[]; saveState(); setTab('d3'); });
  await p.waitForTimeout(2400);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnFocusBtn,#nnQuickBar{display:none!important}'});
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.25, phi:0.85, tx:5.0, tz:5.0, r:3.4}); T.rev=(T.rev|0)+1; });
  await p.waitForFunction(()=>{ try{ const q=T.camera.getWorldPosition(new THREE.Vector3()).toArray().map(v=>v.toFixed(4)).join(',');
    if(window.__q===q){ window.__n=(window.__n|0)+1; } else { window.__q=q; window.__n=0; }
    return (window.__n|0)>=8; }catch(_){ return false; } },{timeout:20000,polling:60});

  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  const dbg=()=>p.evaluate(()=>{ const d=window.nnD3DrawDbg?nnD3DrawDbg():null;
    return {n:d?d.pts.length:0, ws:window.nnD3DrawWs?nnD3DrawWs():null}; });

  await p.evaluate(()=>{ try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
    state.d3sheet=[]; nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(260);

  /* 平場に5点打つ（1辺50cmの階段状。どれも平場の上） */
  const taps=[[4.00,0.012,6.50],[4.50,0.012,6.50],[4.50,0.012,6.00],[5.00,0.012,6.00],[5.00,0.012,5.50]];
  for(const t of taps){ const s=await SCR(t); await p.mouse.click(s.x,s.y); await p.waitForTimeout(260); }
  let D=await dbg();
  ok(D.n===taps.length,'5点 打てた',{n:D.n});
  if(D.n!==taps.length){ console.log('★NG 打点できないので以降は測れない'); await b.close(); process.exit(1); }
  ok(!!D.ws && D.ws.length===D.n,'打ったあと：2Dの点と3Dの点の数が合っている',
     {点:D.n, 三次元の点:D.ws?D.ws.length:null});
  const before=D.ws.map(w=>w.slice());

  /* 1点ずつ戻す */
  for(let k=taps.length-1;k>=1;k--){
    await p.evaluate(()=>{ try{ nnD3PolyUndo(); }catch(_){} });
    await p.waitForTimeout(220);
    D=await dbg();
    ok(D.n===k,'戻る'+(taps.length-k)+'回目：点が1つ減って '+k+'点',{n:D.n});
    ok(!!D.ws && D.ws.length===k,'戻る'+(taps.length-k)+'回目：3Dの点も1つ減る（数が合う）',
       {点:D.n, 三次元の点:D.ws?D.ws.length:null});
    /* ★★2026-09-10 §385 本人の指摘「1点戻すを押しても打点が残っている」。
       画面に出ている赤い四角（nnPvDot）そのものを数える。 */
    const dots=await p.evaluate(()=>{ let n=0; T.scene.traverse(o=>{ if(o.name==='nnPvDot' && o.visible!==false) n++; }); return n; });
    ok(dots===k,'戻る'+(taps.length-k)+'回目：画面の打点（赤い四角）も '+k+'個になる',
       {画面の打点:dots, 点:D.n});
    /* 残った点が動いていないこと（＝消えたのは最後の1点だけ） */
    let move=0;
    if(D.ws) for(let i=0;i<Math.min(k,D.ws.length);i++)
      move=Math.max(move, Math.hypot(D.ws[i][0]-before[i][0], D.ws[i][1]-before[i][1], D.ws[i][2]-before[i][2]));
    ok(move<=0.005,'戻る'+(taps.length-k)+'回目：残った点が動かない（5mm以内）',{動いた_mm:Math.round(move*1000)});

    /* 予告線は「新しい最後の点」から出る（消した点から出ていないか） */
    const now=taps[k-1], gone=taps[k];
    const sv=await SCR([5.60,0.012,5.20]); await p.mouse.move(sv.x,sv.y); await p.waitForTimeout(200);
    const st=await p.evaluate(()=>{ let gr=null; T.scene.traverse(o=>{ if(o.name==='nnPvLine2') gr=o; });
      if(!gr) return null; let best=null;
      gr.children.forEach(o=>{ if(!o.isLine||!o.geometry||!o.geometry.attributes.position) return;
        const a=o.geometry.attributes.position;
        for(let i=0;i<a.count;i++){ const q=[a.getX(i),a.getY(i),a.getZ(i)];
          if(!best) best=q; } });
      return best; });
    if(st){
      const dNow=Math.hypot(st[0]-now[0], st[2]-now[2]);
      const dGone=Math.hypot(st[0]-gone[0], st[2]-gone[2]);
      ok(dNow<=dGone+1e-6,'戻る'+(taps.length-k)+'回目：予告線が「消した点」から出ていない',
         {いまの最後まで_mm:Math.round(dNow*1000), 消した点まで_mm:Math.round(dGone*1000)});
    }
  }
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 戻るを押すと、打った順に1点ずつ消える');
  await b.close(); process.exit(ng?1:0);
})();
