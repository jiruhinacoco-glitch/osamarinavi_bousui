/* ★2026-08-26a 作図の操作性①〜④の検証
   ①▭長方形（角2回で屋根）②⊕点（辺で追加・頂点タップで削除・つまんで移動）
   　＋選択中の辺のドラッグ ③⧉複製 ④⊡全体表示
   使い方: node _check/uxtool1.js（PC） / node _check/uxtool1.js ph（スマホたて・タッチ） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                           :{viewport:{width:1600,height:900}});
  if(PH)await p.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});
    Object.defineProperty(screen,'height',{get:()=>852});}catch(e){} });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ state.polys=[]; state.parts=[]; state.active=-1; saveState();
    renderPolyList(); draw(); });

  /* 画面座標ヘルパ（マス→client座標） */
  const px=async(gx,gy)=>await p.evaluate(([gx,gy])=>{
    const r=cv.getBoundingClientRect();
    const kx=r.width?(cv.width/devicePixelRatio)/r.width:1;
    const ky=r.height?(cv.height/devicePixelRatio)/r.height:1;
    return {x:r.left+(ox+gx*cellPx)/kx, y:r.top+(oy+gy*cellPx)/ky};
  },[gx,gy]);
  /* タッチのタップ（照準ぶん左下を触る＝離した照準位置が狙いに当たるよう補正） */
  const AIMX=36, AIMY=-52;
  async function touchTap(cx,cy,aim){
    await p.evaluate(([x,y,aim])=>{
      const el=cv;
      const ev=t=>new PointerEvent(t,{pointerId:71,pointerType:'touch',isPrimary:true,
        clientX:x-(aim?36:0), clientY:y-(aim?-52:0), bubbles:true});
      el.dispatchEvent(ev('pointerdown'));
      el.dispatchEvent(ev('pointermove'));
      el.dispatchEvent(ev('pointerup'));
    },[cx,cy,aim]);
    await p.waitForTimeout(120);
  }

  /* --- 新ボタンがある --- */
  const btns=await p.evaluate(()=>['tl_box','tl_addpt','tl_fit'].map(id=>!!document.getElementById(id)));
  ok('▭長方形・⊕点・⊡全体 のボタンがある', btns.every(Boolean), JSON.stringify(btns));

  /* --- ①▭長方形：角2回で屋根 --- */
  await p.evaluate(()=>{ cellPx=34; ox=60; oy=190; setTool('box'); draw(); });
  if(PH){
    const a=await px(2,2), c=await px(8,6);
    await touchTap(a.x,a.y,true); await touchTap(c.x,c.y,true);
  }else{
    const a=await px(2,2), c=await px(8,6);
    await p.mouse.click(a.x,a.y); await p.mouse.click(c.x,c.y);
  }
  await p.waitForTimeout(150);
  let st=await p.evaluate(()=>({n:state.polys.length,
    pts:state.polys[0]&&state.polys[0].pts.map(q=>[q.x,q.y]),
    tool}));
  ok('①角2回で長方形の屋根ができる', st.n===1 &&
    JSON.stringify(st.pts)===JSON.stringify([[2,2],[8,2],[8,6],[2,6]]), JSON.stringify(st));
  ok('①つくったあとも長方形ツールのまま（続けてかける）', st.tool==='box', st.tool);

  /* ①幅0は断る（同じxの2点） */
  if(!PH){
    const a=await px(11,2), c=await px(11,6);
    await p.mouse.click(a.x,a.y); await p.mouse.click(c.x,c.y);
    const z=await p.evaluate(()=>({n:state.polys.length, b:!!boxP1}));
    ok('①幅0の長方形は作らない（角は生きたまま）', z.n===1 && z.b, JSON.stringify(z));
    await p.keyboard.press('Escape');
  }

  /* --- ②⊕点：辺タップで追加 --- */
  await p.evaluate(()=>setTool('addpt'));
  const mid=await px(5,2);                       /* 上の辺の中ほど */
  if(PH){ await touchTap(mid.x,mid.y,false); }
  else await p.mouse.click(mid.x,mid.y);
  await p.waitForTimeout(120);
  /* ★辺0（pts[0]→pts[1]）への追加は pts[1] に入る（edges と同じ番号に同じ数） */
  st=await p.evaluate(()=>{ const pl=state.polys[0];
    return {pts:pl.pts.length, edges:pl.edges.length,
      np:pl.pts[1], onEdge:Math.abs(pl.pts[1].y-2)<1e-6 && pl.pts[1].x>2 && pl.pts[1].x<8}; });
  ok('②辺をタップで点が足せる（辺の上・pts と edges が同数）',
     st.pts===5 && st.edges===5 && st.onEdge, JSON.stringify(st));

  /* ②頂点をタップで削除 */
  const vp=await px(st.np.x, st.np.y);
  if(PH){ await touchTap(vp.x,vp.y,false); }
  else await p.mouse.click(vp.x,vp.y);
  await p.waitForTimeout(120);
  st=await p.evaluate(()=>({pts:state.polys[0].pts.length, edges:state.polys[0].edges.length}));
  ok('②頂点をタップで点が消せる', st.pts===4 && st.edges===4, JSON.stringify(st));

  /* ②3点の部位は削除を断る（部位が壊れない） */
  const tri=await p.evaluate(()=>{ state.polys.push({name:'三角', lv:0,
      pts:[{x:12,y:8},{x:15,y:8},{x:12,y:11}],
      edges:[{h:0,w:0,k:'free'},{h:0,w:0,k:'free'},{h:0,w:0,k:'free'}]});
    renderPolyList(); draw(); return true; });
  const tv=await px(12,8);
  if(PH){ await touchTap(tv.x,tv.y,false); } else await p.mouse.click(tv.x,tv.y);
  st=await p.evaluate(()=>({pts:state.polys[1].pts.length}));
  ok('②3点未満になる削除は断る', st.pts===3, JSON.stringify(st));
  await p.evaluate(()=>{ state.polys.pop(); renderPolyList(); draw(); });

  /* ②頂点をつまんで動かす（マウスのみ。タッチは rdrag と同じ道なので PC で確認） */
  if(!PH){
    const v0=await px(8,2);
    await p.mouse.move(v0.x,v0.y); await p.mouse.down();
    await p.mouse.move(v0.x+68,v0.y,{steps:4}); await p.mouse.up();
    await p.waitForTimeout(120);
    st=await p.evaluate(()=>({x:state.polys[0].pts[1].x, y:state.polys[0].pts[1].y,
      n:state.polys[0].pts.length}));
    ok('②頂点はつまんで動かせる（0.1m単位・数は変わらない）',
       st.n===4 && st.x>8.5 && Math.abs(st.y-2)<1e-6 &&
       Math.abs(st.x*0.5-Math.round(st.x*0.5*10)/10)<1e-6, JSON.stringify(st));
    await p.evaluate(()=>{ state.polys[0].pts[1].x=8; saveState(); draw(); });
  }

  /* --- ②選択中の辺をドラッグで動かす --- */
  await p.evaluate(()=>setTool('sel'));
  const em=await px(5,2);
  if(PH){ await touchTap(em.x,em.y,false); } else await p.mouse.click(em.x,em.y);
  await p.waitForTimeout(120);
  let selSt=await p.evaluate(()=>sel&&{p:sel.p,e:sel.e});
  ok('辺をタップで選べる（今までどおり）', !!selSt && selSt.e===0, JSON.stringify(selSt));
  if(PH){
    /* タッチ：選択中の辺をもう一度つかんで下へ40px */
    await p.evaluate(([x,y])=>{
      const ev=(t,yy)=>new PointerEvent(t,{pointerId:72,pointerType:'touch',isPrimary:true,
        clientX:x, clientY:yy, bubbles:true});
      cv.dispatchEvent(ev('pointerdown',y));
      cv.dispatchEvent(ev('pointermove',y+20));
      cv.dispatchEvent(ev('pointermove',y+40));
      cv.dispatchEvent(ev('pointerup',y+40));
    },[em.x,em.y]);
  }else{
    await p.mouse.move(em.x,em.y); await p.mouse.down();
    await p.mouse.move(em.x,em.y+40,{steps:4}); await p.mouse.up();
  }
  await p.waitForTimeout(150);
  st=await p.evaluate(()=>({a:state.polys[0].pts[0].y, b:state.polys[0].pts[1].y,
    others:[state.polys[0].pts[2].y, state.polys[0].pts[3].y]}));
  ok('選択中の辺はドラッグで法線方向へ動く（両端そろって・0.1m単位）',
     st.a>2.4 && Math.abs(st.a-st.b)<1e-6 &&
     Math.abs(st.a*0.5-Math.round(st.a*0.5*10)/10)<1e-6 &&
     st.others[0]===6 && st.others[1]===6, JSON.stringify(st));
  await p.evaluate(()=>{ state.polys[0].pts[0].y=2; state.polys[0].pts[1].y=2; saveState(); draw(); });

  /* --- ③⧉複製 --- */
  st=await p.evaluate(()=>{ nnPolyDup(0);
    const a=state.polys[0], c=state.polys[1];
    c.edges[0].h=999;                     /* 深い写しか（元に影響しないか） */
    return {n:state.polys.length, nm:c.name,
      w:(c.pts[1].x-c.pts[0].x)===(a.pts[1].x-a.pts[0].x),
      moved:c.pts[0].x>a.pts[1].x-1e-9,
      indep:a.edges[0].h!==999};
  });
  ok('③⧉複製＝同じ形が右どなりにできる・元と独立', st.n===2 && st.w && st.moved && st.indep,
     JSON.stringify(st));
  const dd=await p.evaluate(()=>{ if(typeof PHONE!=='undefined'){}
    try{ nnRoofTbl&&nnRoofTbl(true); }catch(_){}
    return {tbl:!!document.querySelector('#nnRoofTbl .dd'),
      list:!!document.querySelector('#polylist [title="この部位を複製"]')}; });
  ok('③複製ボタンがある（'+(PH?'部位リスト':'屋根の表＋部位リスト')+'）',
     PH? dd.list : (dd.tbl&&dd.list), JSON.stringify(dd));
  await p.evaluate(()=>{ state.polys.pop(); state.active=0; renderPolyList(); saveState(); draw(); });

  /* --- ④⊡全体表示 --- */
  st=await p.evaluate(()=>{
    cellPx=3; ox=1200; oy=700; draw();
    nnFitView();
    const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;
    let bad=0, tbB=0;
    try{ const rc=cv.getBoundingClientRect();
      tbB=Math.max(0,(document.getElementById('toolbar').getBoundingClientRect().bottom-rc.top))*(H/rc.height);
    }catch(_){}
    state.polys.forEach(pl=>pl.pts.forEach(q=>{
      const X=ox+q.x*cellPx, Y=oy+q.y*cellPx;
      if(X<0||X>W||Y<tbB-1||Y>H) bad++;
    }));
    return {bad, cell:cellPx, W,H};
  });
  ok('④⊡全体＝かいたものが全部画面内（ツールバーの下）に入る', st.bad===0 && st.cell>3,
     JSON.stringify(st));
  st=await p.evaluate(()=>{ state.polys=[]; renderPolyList(); nnFitView(); return {cell:cellPx}; });
  ok('④何も無いときは最初の表示に戻る', st.cell===(PH?22:34), JSON.stringify(st));

  /* --- 保存して開き直しても残る（長方形でかいた屋根） --- */
  await p.evaluate(()=>{ setTool('box'); });
  {
    const a=await px(3,3), c=await px(7,5);
    if(PH){ await touchTap(a.x,a.y,true); await touchTap(c.x,c.y,true); }
    else { await p.mouse.click(a.x,a.y); await p.mouse.click(c.x,c.y); }
  }
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  st=await p.evaluate(()=>({n:state.polys.length, pts:state.polys[0]&&state.polys[0].pts.length}));
  ok('長方形でかいた屋根は保存され、開き直しても残る', st.n===1 && st.pts===4, JSON.stringify(st));
  await p.evaluate(()=>{ state.polys=[]; state.active=-1; saveState(); });

  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
