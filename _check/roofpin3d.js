/* ★2026-11-27s 3Dの屋根の番号ピン：かいている途中・置いている途中は押せない（下の面へ通す）  §1460
   不具合：3Dで防水層（増張り）の点を打つとき、屋根の真ん中あたりを狙うと番号ピンに当たり、点が打たれずに小窓が開いていた。
   ①ふだん（選択の道具）はピンを押すと小窓が開く ②防水層の打点中は、ピンの真上を押しても点が打たれ、小窓は開かない
   ③打点をやめたら、またピンを押せる
   使い方: node _check/roofpin3d.js ／ node _check/roofpin3d.js _before.html（直す前の版では②が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:850}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){} state.scaleM=1;
    const pts=[{x:0,y:0},{x:12,y:0},{x:12,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:600,w:400,k:'para'}))}];
    state.parts=[]; state.d3sol=[]; state.d3sheet=[]; state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} T.theta=-Math.PI/2+0.35; T.phi=0.8; T.rev=(T.rev|0)+1; setTool('sel',1); });
  /* ピンが置かれるまで待つ（時間ではなく条件で） */
  await p.waitForFunction(()=>{ const e=document.querySelector('#nnRoofPins .rp > b'); return e&&e.getBoundingClientRect().width>0; },{timeout:15000});
  await p.waitForTimeout(600);
  const pin=()=>p.evaluate(()=>{ const r=document.querySelector('#nnRoofPins .rp > b').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; });
  const boxOn=()=>p.evaluate(()=>{ const e=document.getElementById('nnRoofBox'); return !!(e&&e.classList.contains('on')); });
  const dots=()=>p.evaluate(()=>{ let n=0; T.scene.traverse(o=>{ if(o.name==='nnPvDot') n++; }); return n; });
  /* ① ふだんは押すと小窓が開く */
  let c=await pin(); await p.mouse.click(c.x,c.y); await p.waitForTimeout(400);
  ok(await boxOn(),'① 選択の道具では、ピンを押すと小窓が開く');
  await p.evaluate(()=>{ const x=document.querySelector('#nnRoofBox.on .txc'); if(x) x.click(); }); await p.waitForTimeout(300);
  ok(!(await boxOn()),'① ×で小窓が閉じる');
  /* ② 防水層の打点中：ピンの真上を押しても点が打たれる */
  await p.evaluate(()=>{ nnSheetStart({n:'ポリマリット25',col:'#3f3b36',src:'t'},'poly'); });
  await p.waitForFunction(()=>{ const e=document.getElementById('nnRoofPins'); return e&&e.classList.contains('busy'); },{timeout:5000}).catch(()=>{});
  c=await pin(); await p.mouse.click(c.x,c.y); await p.waitForTimeout(400);
  const r2={dots:await dots(), box:await boxOn()};
  ok(r2.dots===1&&!r2.box,'② 防水層の打点中は、ピンの真上を押しても点が1つ打たれ、小窓は開かない',r2);
  /* ③ やめたら、また押せる */
  await p.evaluate(()=>{ nnD3DrawCancel(); try{ nnSheetStop&&nnSheetStop(); }catch(_){} window.nnSheetMode=null; setTool('sel',1); });
  await p.waitForFunction(()=>{ const e=document.getElementById('nnRoofPins'); return e&&!e.classList.contains('busy'); },{timeout:5000}).catch(()=>{});
  c=await pin(); await p.mouse.click(c.x,c.y); await p.waitForTimeout(400);
  ok(await boxOn(),'③ 打点をやめたら、またピンを押すと小窓が開く');
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
