/* ★2026-08-29n 3Dの描画＝「自由な形を点でかく→閉じたら即3D＋平面図に反映」（本人の指示・添付1〜4）
   ・平場にかいて閉じる→カードを出さず、そのまま部位（屋根の区画）になる
   ・部位なので 平面図・積算・屋根の表・戻る（undo）・保存 に全部入る
   ・壁の面にかいたときは従来どおりカード（押出し・引込み・円柱）
   使い方: node _check/deckdraw.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:850}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; saveState(); setTab('d3');
  });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} });
  await p.waitForTimeout(900);
  await p.evaluate(()=>setTool('draw'));
  const cam0=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4)));
  const area0=await p.evaluate(()=>{ let a=0; state.polys.forEach(pp=>a+=polyAreaM(pp.pts,state.scaleM)); return a; });
  const SCR=(gx,gy)=>`(function(){ const el=T.renderer.domElement, r=el.getBoundingClientRect();
      const s=state.scaleM; const q=new THREE.Vector3(${gx}*s,0.03,${gy}*s).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; })()`;
  /* L字（6点）をかく */
  const pts=[[4,3],[9,3],[9,4.5],[6,4.5],[6,6],[4,6]];
  for(const [gx,gy] of pts){
    const c=await p.evaluate(SCR(gx,gy));
    await p.mouse.click(c.x,c.y); await p.waitForTimeout(180);
  }
  ok(await p.evaluate(()=>{ let n=0; T.scene.traverse(o=>{ if(o.name==='nnPvDot')n++; }); return n; })===6,
     'タップのたびに点が増える（6点）');
  ok(await p.evaluate(()=>/自由な形/.test((document.querySelector('#nnD3Card .tt')||{}).textContent||'')),
     'かいている間のカードは「自由な形」（長方形限定ではない）');
  /* 始点タップ＝閉じる → そのまま部位 */
  const c0=await p.evaluate(SCR(4,3));
  await p.mouse.click(c0.x,c0.y); await p.waitForTimeout(900);
  const r=await p.evaluate(()=>({
    n:state.polys.length,
    lv:state.polys[1]&&state.polys[1].lv,
    pts:state.polys[1]&&state.polys[1].pts.length,
    free:state.polys[1]&&state.polys[1].edges.every(e=>(e.k||'para')==='free'),
    sol:(state.d3sol||[]).length,
    card:document.getElementById('nnD3Card').classList.contains('on'),
    area:state.polys[1]?+polyAreaM(state.polys[1].pts,state.scaleM).toFixed(1):0,
  }));
  ok(r.n===2,'閉じるとそのまま部位（屋根②）になる',r.n);
  ok(!r.card && r.sol===0,'カードは出ない・立体（d3sol）ではない',{card:r.card,sol:r.sol});
  ok(Math.abs(r.lv-0.3)<0.01,'高さ＝屋根＋300mm',r.lv);
  ok(r.free && r.pts===6,'辺は立上りなし・6点のまま',{free:r.free,pts:r.pts});
  ok(r.area>8 && r.area<14,'面積が図形どおり（L字 約10.5㎡）',r.area);
  ok(JSON.stringify(await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4))))===JSON.stringify(cam0),
     'かいてもカメラは動かない（§152）');
  /* 3D：立ち上がって四方に壁がある（光線で実測） */
  const solid=await p.evaluate(()=>{
    T.group.updateMatrixWorld(true);
    const rc=new THREE.Raycaster();
    const objs=[]; T.group.traverse(o=>{ if(o.isMesh&&o.visible)objs.push(o); });
    const shoot=(o,d)=>{ rc.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize()); rc.far=3;
      const h=rc.intersectObjects(objs,false); return h.length?+h[0].point.y.toFixed(3):null; };
    return { top:shoot([5,2,3.5],[0,-1,0]),
      wS:shoot([5,0.15,2.2],[0,0,1])!==null, wN:shoot([5,0.15,6.8],[0,0,-1])!==null,
      wW:shoot([3.2,0.15,3.5],[1,0,0])!==null, wE:shoot([9.8,0.15,3.8],[-1,0,0])!==null };
  });
  ok(solid.top!==null&&Math.abs(solid.top-0.312)<0.01,'3D：天板が＋300mmに上がる',solid.top);
  ok(solid.wS&&solid.wN&&solid.wW&&solid.wE,'3D：四方に壁（躯体）が立つ',solid);
  /* 平面図・積算・屋根の表に入る */
  await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(500);
  const plan=await p.evaluate(()=>{
    const a=[]; state.polys.forEach(pp=>a.push(pp.name));
    let area=0; state.polys.forEach(pp=>area+=polyAreaM(pp.pts,state.scaleM));
    const tbl=document.getElementById('nnRoofTbl');
    const rows=tbl?tbl.querySelectorAll('tbody tr').length:0;
    return {names:a, area:+area.toFixed(1), rows, err:0};
  });
  ok(plan.names.length===2,'平面図に部位として入る',plan.names);
  ok(plan.area>200+8,'積算の面積が増える（200㎡＋L字）',plan.area);
  ok(plan.rows>=2,'屋根の表にも行が増える',plan.rows);
  /* 戻る＝部位ごと消える（undo に入っている） */
  await p.evaluate(()=>undoStep());
  await p.waitForTimeout(400);
  ok(await p.evaluate(()=>state.polys.length)===1,'↩戻る で部位ごと戻せる');
  await p.evaluate(()=>redoStep()); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>state.polys.length)===2,'↪進む で復活する');
  /* 保存して開き直しても残る */
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1300);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  ok(await p.evaluate(()=>state.polys.length)===2,'開き直しても残る（保存される）');
  ok(errs.length===0,'JSエラーなし',errs.slice(0,3).join('|')||'');
  console.log('★NG '+ng+'件');
  await b.close(); process.exit(ng?1:0);
})();
