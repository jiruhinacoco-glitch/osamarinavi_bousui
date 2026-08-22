/* 断面作図の操作性 大改修（2026-08-19b）＋タップ演出 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(2600); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(900);

  /* ① 道具がそろっている */
  const ids=['sd_draw','sd_edit','sd_pan','sd_pt','sd_wp','sd_undo','sd_redo','sd_zin','sd_zout','sd_fit','sd_cell','sd_dim','sd_sample','sd_clear','sd_depth'];
  const have=await p.evaluate(l=>l.filter(i=>!document.getElementById(i)), ids);
  ok('道具15個がそろっている', have.length===0, have);

  /* ② 見本の断面が入る */
  await p.evaluate(()=>document.getElementById('sd_sample').click()); await p.waitForTimeout(500);
  const sm=await p.evaluate(()=>({n:state.sect.pts.length, closed:state.sect.closed, wp:state.sect.wp.length}));
  ok('見本の断面が一発で入る（6点・閉じている・防水層3辺）', sm.n===6&&sm.closed&&sm.wp===3, sm);
  await p.screenshot({path:'out/chk_sd2_sample.png'});

  const w2s=async(x,y)=>await p.evaluate(([X,Y])=>{const q=nnSdXY(X,Y), r=document.getElementById('sdCv').getBoundingClientRect();
    return {x:r.x+q.x, y:r.y+q.y};},[x,y]);

  /* ③ 移動（パン）：PCでもスマホでも図が動く */
  await p.evaluate(()=>document.getElementById('sd_pan').click()); await p.waitForTimeout(200);
  const before=await w2s(0,0);
  await p.touchscreen.tap(before.x,before.y);
  await p.mouse.move(before.x,before.y); await p.mouse.down();
  await p.mouse.move(before.x+120,before.y+60,{steps:6}); await p.mouse.up(); await p.waitForTimeout(300);
  const after=await w2s(0,0);
  ok('✥移動：ドラッグで図が動く', Math.abs(after.x-before.x-120)<6 && Math.abs(after.y-before.y-60)<6,
     {dx:Math.round(after.x-before.x), dy:Math.round(after.y-before.y)});

  /* ④ ズームボタン */
  const pxBefore=await p.evaluate(()=>nnSdXY(1,0).x-nnSdXY(0,0).x);
  await p.evaluate(()=>document.getElementById('sd_zin').click()); await p.waitForTimeout(250);
  const pxAfter=await p.evaluate(()=>nnSdXY(1,0).x-nnSdXY(0,0).x);
  ok('＋で拡大する', pxAfter>pxBefore*1.15, {前:Math.round(pxBefore), 後:Math.round(pxAfter)});
  await p.evaluate(()=>document.getElementById('sd_zout').click()); await p.waitForTimeout(250);
  await p.evaluate(()=>document.getElementById('sd_fit').click()); await p.waitForTimeout(300);

  /* ⑤ 修正：頂点をつかんで動かせる */
  await p.evaluate(()=>document.getElementById('sd_edit').click()); await p.waitForTimeout(200);
  const v0=await p.evaluate(()=>({...state.sect.pts[2]}));
  const sv=await w2s(v0.x,v0.y);
  await p.mouse.move(sv.x,sv.y); await p.mouse.down();
  await p.mouse.move(sv.x+40,sv.y-30,{steps:6}); await p.mouse.up(); await p.waitForTimeout(300);
  const v1=await p.evaluate(()=>({...state.sect.pts[2]}));
  ok('⇱修正：頂点をつまんで動かせる', Math.abs(v1.x-v0.x)>0.02 && Math.abs(v1.y-v0.y)>0.02, {前:v0, 後:v1});
  await p.evaluate(()=>document.getElementById('sd_undo').click()); await p.waitForTimeout(250);
  ok('戻るで頂点の移動が戻る', await p.evaluate(()=>Math.abs(state.sect.pts[2].x-0.9)<1e-6));

  /* ⑥ 寸法の札をタップ → 長さを数値で入れる */
  const lab=await p.evaluate(()=>{ nnSdDraw();
    const b=[...document.querySelectorAll('canvas')].length; return true; });
  const lp=await p.evaluate(()=>{ /* 辺2（立上り300）の札の位置を内部から取る */
    const s=state.sect, a=s.pts[2], b=s.pts[3];
    const q=nnSdXY((a.x+b.x)/2,(a.y+b.y)/2), r=document.getElementById('sdCv').getBoundingClientRect();
    return {x:r.x+q.x, y:r.y+q.y}; });
  /* nnNumAsk を横取りして 500 を入れる */
  await p.evaluate(()=>{ window.__ask=null; const o=window.nnNumAsk;
    window.nnNumAsk=(t,v,cb)=>{ window.__ask={t,v}; cb('500'); }; window.__oask=o; });
  const e1=await p.evaluate(()=>{ const s=state.sect,a=s.pts[1],b=s.pts[2];
    const q=nnSdXY((a.x+b.x)/2,(a.y+b.y)/2), r=document.getElementById('sdCv').getBoundingClientRect();
    return {x:r.x+q.x, y:r.y+q.y}; });
  /* 札は辺の法線方向に13pxずれた所にある。少し探して当てる */
  let hit=false;
  for(const [dx,dy] of [[13,0],[-13,0],[0,13],[0,-13],[9,9],[-9,-9]]){
    await p.mouse.click(e1.x+dx, e1.y+dy); await p.waitForTimeout(200);
    if(await p.evaluate(()=>!!window.__ask)){ hit=true; break; }
  }
  const len=await p.evaluate(()=>{ const s=state.sect,a=s.pts[1],b=s.pts[2];
    return Math.round(Math.hypot(b.x-a.x,b.y-a.y)*1000); });
  ok('📏 寸法の札をタップ → 長さを数値入力（300→500）', hit&&len===500, {札:hit, 長さ:len});
  await p.evaluate(()=>{ if(window.__oask) window.nnNumAsk=window.__oask; });

  /* ⑦ 点の追加・削除 */
  await p.evaluate(()=>document.getElementById('sd_pt').click()); await p.waitForTimeout(200);
  const n0=await p.evaluate(()=>state.sect.pts.length);
  const em=await p.evaluate(()=>{ const s=state.sect,a=s.pts[0],b=s.pts[1];
    const q=nnSdXY((a.x+b.x)/2,(a.y+b.y)/2), r=document.getElementById('sdCv').getBoundingClientRect();
    return {x:r.x+q.x, y:r.y+q.y}; });
  await p.mouse.click(em.x,em.y); await p.waitForTimeout(300);
  const n1=await p.evaluate(()=>state.sect.pts.length);
  ok('⊕点：辺をタップで点が増える', n1===n0+1, {前:n0, 後:n1});
  const vp=await p.evaluate(()=>{ const q=nnSdXY(state.sect.pts[1].x,state.sect.pts[1].y),
    r=document.getElementById('sdCv').getBoundingClientRect(); return {x:r.x+q.x, y:r.y+q.y}; });
  await p.mouse.click(vp.x,vp.y); await p.waitForTimeout(300);
  ok('⊕点：頂点をタップで点が減る', await p.evaluate(()=>state.sect.pts.length)===n0, n0);

  /* ⑧ 寸法の表示切替 */
  await p.evaluate(()=>document.getElementById('sd_dim').click()); await p.waitForTimeout(250);
  const noDim=await p.evaluate(()=>{ const cv=document.getElementById('sdCv'), c=cv.getContext('2d');
    const d=c.getImageData(0,0,cv.width,cv.height).data; let blue=0;
    for(let i=0;i<d.length;i+=16){ if(d[i+2]>140&&d[i]<90)blue++; } return blue; });
  await p.evaluate(()=>document.getElementById('sd_dim').click()); await p.waitForTimeout(250);
  const withDim=await p.evaluate(()=>{ const cv=document.getElementById('sdCv'), c=cv.getContext('2d');
    const d=c.getImageData(0,0,cv.width,cv.height).data; let blue=0;
    for(let i=0;i<d.length;i+=16){ if(d[i+2]>140&&d[i]<90)blue++; } return blue; });
  ok('📏 寸法の表示を消せる', withDim>noDim*1.3, {消:noDim, 出:withDim});

  /* ⑨ 案内が道具ごとに変わる */
  const notes={};
  for(const t of ['draw','edit','pan','pt','wp']){
    await p.evaluate(v=>document.getElementById('sd_'+v).click(), t); await p.waitForTimeout(200);
    notes[t]=await p.evaluate(()=>document.getElementById('secNote').textContent.slice(0,12));
  }
  ok('道具ごとに使い方の案内が出る', new Set(Object.values(notes)).size===5, notes);

  /* ⑩ タップ演出：小さくなった・指の光がついてくる */
  await p.evaluate(()=>{ const el=document.createElement('div'); el.className='tapfx';
    el.style.left='100px'; el.style.top='100px'; el.id='__fx'; document.body.appendChild(el); });
  const fx=await p.evaluate(()=>{ const e=document.getElementById('__fx'), cs=getComputedStyle(e);
    return {w:parseFloat(cs.width), ring:getComputedStyle(e,'::after').inset}; });
  ok('タップの光が小さくなった（16px・以前は32px）', fx.w===16, fx);
  const tr=await p.evaluate(async()=>{
    const cv0=!!document.getElementById('nnTrail');
    document.dispatchEvent(new PointerEvent('pointerdown',{clientX:200,clientY:200,bubbles:true,pointerType:'touch',isPrimary:true}));
    document.dispatchEvent(new PointerEvent('pointermove',{clientX:260,clientY:230,bubbles:true,pointerType:'touch',isPrimary:true}));
    await new Promise(r=>setTimeout(r,120));
    const c=document.getElementById('nnTrail');
    if(!c) return {made:false};
    const g=c.getContext('2d'), d=g.getImageData(0,0,c.width,c.height).data;
    let lit=0; for(let i=3;i<d.length;i+=40){ if(d[i]>10)lit++; }
    return {before:cv0, made:true, lit, pe:getComputedStyle(c).pointerEvents};
  });
  ok('指をなぞると光がついてくる', tr.made&&tr.lit>0&&tr.pe==='none', tr);
  await p.evaluate(()=>{ const e=document.getElementById('__fx'); if(e)e.remove(); });

  ok('JSエラーなし', errs.length===0, errs);
  console.log(R.join('\n'));
  await b.close();
})();
