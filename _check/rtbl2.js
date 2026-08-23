/* 2026-08-23i の検証：
   ①浮かぶ屋根の表をマウスのドラッグで移動・拡大縮小できる（次回も同じ場所・↺で戻る）
   ②選んだ面と対になる「躯体（立体）」の高さも調整できる（青い面は動かない）
   node _check/rtbl2.js
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL='http://localhost:8899/zumen_sekisan.html';
let okN=0,ngN=0;
const chk=(n,c,i)=>{ console.log((c?'○ ':'★NG ')+n+(i!==undefined?('  '+JSON.stringify(i)):'')); c?okN++:ngN++; };

(async()=>{
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await br.newContext({viewport:{width:1600,height:900}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{ if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(600);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){} localStorage.removeItem('nn_zumen_rtblpos'); });
  await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){}});

  await p.evaluate(()=>{
    const E=n=>Array.from({length:n},()=>({h:300,w:250,k:'para'}));
    state.polys=[
      {name:'屋根①',lv:0,bodyLv:0,pts:[{x:2,y:2},{x:12,y:2},{x:12,y:10},{x:2,y:10}],edges:E(4)},
      {name:'屋根②',lv:0,bodyLv:0,pts:[{x:14,y:2},{x:22,y:2},{x:22,y:10},{x:14,y:10}],edges:E(4)}
    ];
    state.active=0; saveState(); renderPolyList(); recalc(); draw();
  });
  await p.waitForTimeout(400);

  /* ---- ① 表の見た目 ---- */
  const t0=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    const Z=window.nnPZ||1, r=t.getBoundingClientRect(), mr=t.parentNode.getBoundingClientRect();
    return {grip:!!t.querySelector('.rgrip'), rst:!!t.querySelector('.rrst'), sz:!!t.querySelector('.rsz'),
      lv:t.querySelectorAll('.rlv').length, bl:t.querySelectorAll('.rbl').length,
      th:[...t.querySelectorAll('th')].map(x=>x.textContent),
      x:(r.left-mr.left)/Z, y:(r.top-mr.top)/Z, w:r.width/Z};
  });
  chk('表に移動のつまみ（✥）がある', t0.grip);
  chk('表に「↺ 位置」がある', t0.rst);
  chk('表の右下に大きさのつまみがある', t0.sz);
  chk('面GL+の欄が屋根ごと（2個）', t0.lv===2, t0.lv);
  chk('躯体GL+の欄が屋根ごと（2個）', t0.bl===2, t0.bl);
  chk('見出しが 屋根/下地/面GL+/躯体GL+/面積/仕様', /面GL/.test(t0.th[2])&&/躯体GL/.test(t0.th[3]), t0.th.join('|'));

  /* ---- ① ドラッグで移動 ---- */
  const grip=await p.evaluate(()=>{ const g=document.getElementById('nnRoofTbl').querySelector('.rgrip');
    const r=g.getBoundingClientRect(); return {x:r.left+30, y:r.top+r.height/2}; });
  await p.mouse.move(grip.x,grip.y); await p.mouse.down();
  await p.mouse.move(grip.x-320, grip.y+180, {steps:8}); await p.mouse.up();
  await p.waitForTimeout(300);
  const t1=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    const Z=window.nnPZ||1, r=t.getBoundingClientRect(), mr=t.parentNode.getBoundingClientRect();
    let sv=null; try{ sv=JSON.parse(localStorage.getItem('nn_zumen_rtblpos')||'null'); }catch(_){}
    return {x:(r.left-mr.left)/Z, y:(r.top-mr.top)/Z, sv};
  });
  chk('つまみのドラッグで表が動く（左へ約320px）', Math.abs((t0.x-t1.x)-320)<26, {前:Math.round(t0.x),後:Math.round(t1.x)});
  chk('下へも動く（約180px）', Math.abs((t1.y-t0.y)-180)<26, {前:Math.round(t0.y),後:Math.round(t1.y)});
  chk('置き場所が保存される', !!(t1.sv&&t1.sv.x!=null), t1.sv);

  /* ---- ① つまみで拡大 ---- */
  const sz=await p.evaluate(()=>{ const s=document.getElementById('nnRoofTbl').querySelector('.rsz');
    const r=s.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; });
  await p.mouse.move(sz.x,sz.y); await p.mouse.down();
  await p.mouse.move(sz.x+120, sz.y+120, {steps:8}); await p.mouse.up();
  await p.waitForTimeout(300);
  const t2=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    let sv=null; try{ sv=JSON.parse(localStorage.getItem('nn_zumen_rtblpos')||'null'); }catch(_){}
    return {tr:t.style.transform, s:sv&&sv.s, w:t.getBoundingClientRect().width/(window.nnPZ||1)};
  });
  chk('つまみのドラッグで大きくなる', t2.s>1.2, t2.s);
  chk('見た目の幅も大きくなる', t2.w>t0.w*1.15, {前:Math.round(t0.w),後:Math.round(t2.w)});

  /* ---- ① 再読み込みで残る ---- */
  await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){}});
  const t3=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    const Z=window.nnPZ||1, r=t.getBoundingClientRect(), mr=t.parentNode.getBoundingClientRect();
    return {x:(r.left-mr.left)/Z, y:(r.top-mr.top)/Z, tr:t.style.transform};
  });
  chk('再読み込みしても同じ場所・同じ大きさ',
      Math.abs(t3.x-t1.x)<4 && /scale\(1\.[2-9]/.test(t3.tr), {x:Math.round(t3.x), tr:t3.tr});

  /* ---- ① ↺ で元に戻る ---- */
  await p.click('#nnRoofTbl .rrst'); await p.waitForTimeout(300);
  const t4=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    const Z=window.nnPZ||1, r=t.getBoundingClientRect(), mr=t.parentNode.getBoundingClientRect();
    let sv=null; try{ sv=JSON.parse(localStorage.getItem('nn_zumen_rtblpos')||'null'); }catch(_){}
    return {x:(r.left-mr.left)/Z, tr:t.style.transform, sv, right:getComputedStyle(t).right};
  });
  chk('↺で元の場所（右上）に戻る', Math.abs(t4.x-t0.x)<8, {戻り:Math.round(t4.x), 元:Math.round(t0.x)});
  chk('↺で大きさも元に戻る', !/scale\(1\.[2-9]/.test(t4.tr), t4.tr);
  chk('↺で保存も消える', t4.sv===null, t4.sv);

  /* ---- ② 躯体の高さ ---- */
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:15000});
  await p.waitForTimeout(500);
  const snap=await p.evaluate(()=>{
    const r={cam:{th:T.theta,ph:T.phi,r:T.r,tx:T.tx,tz:T.tz,voX:T.voX||0,voY:T.voY||0},body:{},mem:{}};
    T.group.children.forEach(o=>{
      if(o.name==='nnBody') r.body[o.userData.bodyIdx]=+o.position.y.toFixed(3);
      if(o.userData&&o.userData.polyIdx!=null) r.mem[o.userData.polyIdx]=+o.position.y.toFixed(3);
    });
    return r;
  });
  await p.evaluate(()=>nnBlLive(0, 3, 1));
  await p.waitForTimeout(700);
  const b1=await p.evaluate(()=>{
    const r={cam:{th:T.theta,ph:T.phi,r:T.r,tx:T.tx,tz:T.tz,voX:T.voX||0,voY:T.voY||0},body:{},mem:{},
      lv:state.polys[0].lv, bl:state.polys[0].bodyLv, h:0};
    T.group.children.forEach(o=>{
      if(o.name==='nnBody') r.body[o.userData.bodyIdx]=+o.position.y.toFixed(3);
      if(o.userData&&o.userData.polyIdx!=null) r.mem[o.userData.polyIdx]=+o.position.y.toFixed(3);
    });
    return r;
  });
  chk('躯体GL+3で躯体（立体）が3mに立ち上がる', b1.body[0]===3, b1.body[0]);
  chk('青い防水面は動かない（0.012のまま）', b1.mem[0]===snap.mem[0], {前:snap.mem[0],後:b1.mem[0]});
  chk('面の高さ（lv）は0のまま', b1.lv===0, b1.lv);
  chk('となりの屋根の躯体は動かない', b1.body[1]===snap.body[1], {前:snap.body[1],後:b1.body[1]});
  chk('カメラは1つも動かない', JSON.stringify(b1.cam)===JSON.stringify(snap.cam));

  /* カードに躯体の欄 */
  const cd=await p.evaluate(()=>{
    state.active=0; if(window.nnPolySync)nnPolySync();
    const d=document.getElementById('nnPolyCard');
    return {on:d&&d.classList.contains('on'), bl:!!document.getElementById('nnPvBl'),
      lv:!!document.getElementById('nnPvLv'), follow:/躯体も合わせる/.test(d?d.innerHTML:''),
      blv:(document.getElementById('nnPvBl')||{}).value};
  });
  chk('青い面のカードに「躯体GL+」の欄がある', cd.bl&&cd.lv, cd);
  chk('カードの躯体の欄がいまの値（3）', cd.blv==='3', cd.blv);
  chk('「⬆ 躯体も合わせる」も残っている', cd.follow);

  /* 面だけ動かす回帰 */
  await p.evaluate(()=>nnLvLive(0, 5, 1)); await p.waitForTimeout(700);
  const b2=await p.evaluate(()=>{ const r={body:{},mem:{}};
    T.group.children.forEach(o=>{
      if(o.name==='nnBody') r.body[o.userData.bodyIdx]=+o.position.y.toFixed(3);
      if(o.userData&&o.userData.polyIdx!=null) r.mem[o.userData.polyIdx]=+o.position.y.toFixed(3); });
    r.bl=state.polys[0].bodyLv; return r; });
  chk('面GL+5で青い面だけ5.012に上がる', b2.mem[0]===5.012, b2.mem[0]);
  chk('躯体は3のまま（面につられない）', b2.body[0]===3 && b2.bl===3, {body:b2.body[0],bodyLv:b2.bl});

  /* 表の欄からも躯体を動かせる */
  await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(400);
  const tv=await p.evaluate(()=>{
    nnRoofTbl(true);
    const el=document.querySelector('#nnRoofTbl tr.rrow[data-pi="1"] .rbl');
    el.value='2'; el.dispatchEvent(new Event('change',{bubbles:true}));
    return {bl:state.polys[1].bodyLv, lv:state.polys[1].lv};
  });
  await p.waitForTimeout(400);
  chk('表の躯体の欄からも変えられる', tv.bl===2 && tv.lv===0, tv);

  /* 再読み込みで残る */
  await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){}});
  const pv=await p.evaluate(()=>({lv:state.polys[0].lv, bl:state.polys[0].bodyLv, bl1:state.polys[1].bodyLv}));
  chk('再読み込みしても面と躯体の高さが残る', pv.lv===5&&pv.bl===3&&pv.bl1===2, pv);

  chk('JSエラーなし', errs.length===0, errs.slice(0,3));
  console.log('○'+okN+' ★NG'+ngN);
  await br.close(); process.exit(ngN?1:0);
})();
