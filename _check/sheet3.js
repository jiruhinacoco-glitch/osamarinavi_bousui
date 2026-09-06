/* 3Dの防水層：辺の寸法が出る／立上り→平場の増し張りが作れる（§310・§311）
   使い方： node _check/sheet3.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(700);
await p.evaluate(()=>{
  state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
    edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}];
  saveState(); setTab('d3');
});
await p.waitForTimeout(2500);
await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
await p.evaluate(()=>{ setTool('sel'); T.theta=-Math.PI/2+0.5; T.phi=0.85; T.r=10; T.tx=5; T.tz=3; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(1000);

/* ── ① 立上り→平場の増し張り（入隅・2面） ── */
const inner=await p.evaluate(()=>{
  state.d3sheet=[];
  window.nnSheetMode={kind:'corner', mat:{n:'増し張り材',col:'#3f3b36',src:'t'}, w:400, d:200, t:4};
  /* 壁の内面（z=0.25・屋根側を向く）と 平場（上向き）を続けてタップした形で渡す */
  const A={point:new THREE.Vector3(6,0.15,0.25), n:new THREE.Vector3(0,0,1)};
  const B={point:new THREE.Vector3(6,0.012,0.5), n:new THREE.Vector3(0,1,0)};
  const r1=window.nnSheetCornerTap(A), r2=window.nnSheetCornerTap(B);
  const s=(state.d3sheet||[])[0];
  return {r1:!!r1, r2:!!r2, n:(state.d3sheet||[]).length,
    faces:s?s.faces.length:0, corner:s?s.corner:0, area:s?+nnSheetArea(s).toFixed(3):0};
});
ok(inner.n===1 && inner.faces===2, '① 入隅の増し張り（立上り＋平場の2面）ができる', inner);
ok(Math.abs(inner.area-0.16)<0.01, '① 面積＝幅400×出200×2面＝0.16㎡', inner.area);

/* ★面のドラッグに指を取られないか（これが「作れない」の正体だった） */
const guard=await p.evaluate(()=>{
  window.nnSheetMode={kind:'corner', mat:{n:'x',col:'#333',src:''}, w:400, d:200, t:4};
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,pointerType:'mouse',
    clientX:r.left+r.width/2, clientY:r.top+r.height/2, bubbles:true, cancelable:true}));
  const busy=!!(window.nnFaceBusy&&nnFaceBusy());
  el.dispatchEvent(new PointerEvent('pointerup',{pointerId:9,pointerType:'mouse',
    clientX:r.left+r.width/2, clientY:r.top+r.height/2, bubbles:true, cancelable:true}));
  window.nnSheetMode=null;
  return busy;
});
ok(guard===false, '① 「防水層を置く」の間は面のドラッグが指を取らない');

/* ── ② かいている辺の寸法が出る ── */
const dims=await p.evaluate(()=>{
  state.d3sheet=[];
  window.nnSheetMode={kind:'draw', mat:{n:'テスト',col:'#3a7',src:''}, t:4};
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  /* 平場の上に3点かく（画面から平場をさがす） */
  function pick(x,y){
    const v=new THREE.Vector2(((x-r.left)/r.width)*2-1, -((y-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(v,T.camera);
    const h=rc.intersectObjects(T.group.children,true)||[];
    return h.length?h[0]:null;
  }
  let base=null;
  for(let y=r.top+r.height*0.55; y<r.top+r.height*0.9 && !base; y+=12)
    for(let x=r.left+r.width*0.3; x<r.left+r.width*0.7; x+=24){
      const h=pick(x,y); if(h && h.face && h.face.normal && Math.abs(h.point.y-0.012)<0.05){ base={x,y}; break; } }
  if(!base) return {no:'平場が見つからない'};
  window.nnD3DrawStartAt ? nnD3DrawStartAt(base.x,base.y) : null;
  return {base:!!base};
});
if(dims.no){ console.log('  （平場の走査ができなかったので、寸法は直接 DS を作って確かめる）'); }
const dim2=await p.evaluate(()=>{
  /* 直接かいた状態を作る（DS は閉包の中なので、公開の口から） */
  if(!window.nnD3DS) return {skip:1};
  const DS=nnD3DS(); if(!DS) return {skip:1};
  return {skip:1};
});
/* 公開の口が無いので、実際のタップでかく */
const drawn=await p.evaluate(async()=>{
  window.nnSheetMode={kind:'draw', mat:{n:'テスト',col:'#3a7',src:''}, t:4};
  setTool('draw');                       /* ★「面にかく」は描画ツール（パネルが自動でこうする） */
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  function pick(x,y){
    const v=new THREE.Vector2(((x-r.left)/r.width)*2-1, -((y-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(v,T.camera);
    const h=rc.intersectObjects(T.group.children,true)||[];
    return h.length?h[0]:null;
  }
  const pts=[];
  for(let y=r.top+r.height*0.6; y<r.top+r.height*0.92 && pts.length<3; y+=26)
    for(let x=r.left+r.width*0.35; x<r.left+r.width*0.65 && pts.length<3; x+=60){
      const h=pick(x,y); if(h && Math.abs(h.point.y-0.012)<0.06) pts.push({x,y});
    }
  if(pts.length<3) return {no:1};
  function tap(q){ ['pointerdown','pointerup'].forEach(t=>el.dispatchEvent(
    new PointerEvent(t,{pointerId:11,pointerType:'mouse',clientX:q.x,clientY:q.y,bubbles:true,cancelable:true}))); }
  tap(pts[0]);
  el.dispatchEvent(new PointerEvent('pointermove',{pointerId:11,pointerType:'mouse',clientX:pts[1].x,clientY:pts[1].y,bubbles:true}));
  tap(pts[1]);
  el.dispatchEvent(new PointerEvent('pointermove',{pointerId:11,pointerType:'mouse',clientX:pts[2].x,clientY:pts[2].y,bubbles:true}));
  tap(pts[2]);
  await new Promise(r2=>setTimeout(r2,300));
  const d=document.getElementById('nnD3Dims');
  /* ★2026-09-06j 角度の札（.dm.ag）が増えたので、寸法の札だけを見る（§313） */
  return {n:d?d.querySelectorAll('.dm:not(.ag)').length:0,
    txt:d?[].map.call(d.querySelectorAll('.dm:not(.ag)'),x=>x.textContent):[],
    ag:d?[].map.call(d.querySelectorAll('.dm.ag'),x=>x.textContent):[]};
});
ok(drawn && !drawn.no && drawn.n>=2, '② かいた辺のまん中に寸法の札が出る', drawn);
ok(drawn && drawn.txt && drawn.txt.length>0 && drawn.txt.every(t=>/^[0-9.]+ m$/.test(t)), '② 札は「◯.◯◯ m」', drawn&&drawn.txt);
ok(drawn && drawn.ag && drawn.ag.every(t=>/^\d+°$/.test(t)), '② 角度の札は「◯°」', drawn&&drawn.ag);
await p.evaluate(()=>{ try{ nnD3DrawCancel(); }catch(_){} window.nnSheetMode=null; });

ok(errs.length===0, 'JSエラーなし', errs);
console.log(ng?('★NG '+ng+'件'):'すべて○');
await b.close();
process.exit(ng?1:0);
})();
