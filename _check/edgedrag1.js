/* ★2026-11-06 スマホ3D「辺選択」：選んでいない辺を1本指でなぞっても図面が変わらない（§1054・本人の報告）
   ① 見本の屋根の上のいろいろな場所を約70pxなぞる → どの屋根の形も変わらない
   ② 辺を1回タップ（選ぶ）→ 同じ辺をもう一度つかんでドラッグ → その辺だけが動く
   使い方: node _check/edgedrag1.js [zumen_sekisan.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{console.log((c?'○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
const PE=([t,i,x,y])=>{ const el=T.renderer.domElement; el.dispatchEvent(new PointerEvent(t,{pointerId:i,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:true})); };
(async()=>{
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();}); await p.waitForTimeout(700);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4500);
await p.waitForFunction(()=>{const n=document.getElementById('nav'); return !n || /translateY/.test(n.style.transform||'');},{timeout:12000}).catch(()=>{});
await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} }); await p.waitForTimeout(1200);
await p.evaluate(()=>setTool('sel',1)); await p.waitForTimeout(300);
const snap=()=>p.evaluate(()=>JSON.stringify(state.polys.map(q=>q.pts)));
const swipe=async(x,y,id)=>{ await p.evaluate(PE,['pointerdown',id,x,y]);
  for(let i=1;i<=5;i++){ await p.evaluate(PE,['pointermove',id,x+i*14,y+i*8]); await p.waitForTimeout(30); }
  await p.evaluate(PE,['pointerup',id,x+70,y+40]); await p.waitForTimeout(250); };
/* ① なぞるだけ */
const s0=await snap(); let changed=null, n=0;
for(let y=300;y<=600 && !changed;y+=30) for(let x=80;x<=320 && !changed;x+=40){
  await p.evaluate(()=>{ d3ViewIso(); }); await p.waitForTimeout(350);   /* なぞるたびに画面が動くので、毎回同じ向きに戻す */
  const under=await p.evaluate(([x,y])=>{const el=T.renderer.domElement,r=el.getBoundingClientRect(); const rc=new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-((y-r.top)/r.height*2-1)),T.camera); const h=(rc.intersectObjects([T.group],true)||[]).find(q=>q.object.visible&&q.object.userData&&q.object.userData.polyIdx!=null); return h?h.object.userData.polyIdx:-1;},[x,y]);
  if(under<0) continue;   /* 屋根の上だけ（指が屋根に乗っているとき） */
  const st=await snap(); await swipe(x,y,41+n); n++;
  if(await snap()!==st) changed={x,y};
  await p.evaluate(()=>{ try{ rsel=[]; }catch(_){} });
}
ok(!changed,'① 選んでいない辺を1本指でなぞっても、どの屋根の形も変わらない（'+n+'か所）',changed);
await p.evaluate(s=>{ state.polys.forEach((q,i)=>{ q.pts=JSON.parse(s)[i]; }); dirty3d=true; build3D(); },s0); await p.waitForTimeout(800);
/* ② 選んでからつかむと動く：見えている辺の真ん中を探す */
const tgt=await p.evaluate(()=>{ const r=T.renderer.domElement.getBoundingClientRect();
  for(let y=r.top+r.height*0.35;y<r.top+r.height*0.75;y+=6) for(let x=r.left+r.width*0.2;x<r.left+r.width*0.8;x+=6){
    const h=nnD3EdgeAt(x,y); if(h&&h.ids&&h.ids.length===2) return {x,y,p:h.p}; } return null; });
ok(!!tgt,'② 見えている辺が見つかる',tgt);
if(tgt){
  const before=await p.evaluate(i=>JSON.stringify(state.polys[i].pts),tgt.p);
  await p.evaluate(PE,['pointerdown',90,tgt.x,tgt.y]); await p.evaluate(PE,['pointerup',90,tgt.x,tgt.y]); await p.waitForTimeout(300);
  ok(await p.evaluate(i=>JSON.stringify(state.polys[i].pts),tgt.p)===before,'② 1回タップでは選ぶだけ（動かない）');
  await p.evaluate(PE,['pointerdown',91,tgt.x,tgt.y]);
  for(let i=1;i<=6;i++){ await p.evaluate(PE,['pointermove',91,tgt.x,tgt.y+i*6]); await p.waitForTimeout(30); }
  await p.evaluate(PE,['pointerup',91,tgt.x,tgt.y+36]); await p.waitForTimeout(400);
  const after=JSON.parse(await p.evaluate(i=>JSON.stringify(state.polys[i].pts),tgt.p)), B=JSON.parse(before);
  const mv=after.map((q,k)=>Math.hypot(q.x-B[k].x,q.y-B[k].y)>1e-6?1:0).reduce((a,c)=>a+c,0);
  ok(mv===2,'② 選んだ辺をもう一度つかんでドラッグ＝その辺の両端（2点）だけが動く',{動いた点:mv});
}
ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
console.log(ng?('★NG '+ng+'件'):'全部○'); await b.close(); process.exit(ng?1:0);
})();
