/* ★2026-09-08am §357 打点は「実際の3Dの点」で持つ。内部の2D座標で
   重なり・長さ・角度・閉合を判定しない（GPTの指摘）。
   使い方: node _check/ptdata.js ／ 直す前と比べる: node _check/ptdata.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(800);
await p.evaluate(()=>{ state.scaleM=1;
  const pts=[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}];
  state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({k:'para',h:300,w:250}))}];
  state.parts=[];state.d3sol=[];state.d3sheet=[]; saveState(); setTab('d3'); });
await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:20000});
await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){}
  T.theta=Math.PI/2+0.30; T.phi=1.02; T.tx=6; T.tz=1.6; T.r=4.2; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(1400);
await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
const has=await p.evaluate(()=>!!window.nnD3LineAt);
if(!has){ console.log('  ★NG 検査用の口が無い＝直す前の版（3Dで持つ形になっていない）'); console.log('★NG 9件'); await b.close(); process.exit(1); }
await p.evaluate(()=>{ nnSheetStart({n:'T',col:'#333',src:'t'},'draw'); });
await p.waitForTimeout(400);
const SCR=(x,y,z)=>p.evaluate(([x,y,z])=>{ T.renderer.render(T.scene,T.camera); const el=T.renderer.domElement,r=el.getBoundingClientRect();
  const q=new THREE.Vector3(x,y,z).project(T.camera); return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; },[x,y,z]);

/* 1点目＝立上り（z=0.256の面） */
let s=await SCR(5,0.15,0.256); await p.mouse.click(s.x,s.y); await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!(window.nnD3DrawDbg&&nnD3DrawDbg()&&nnD3DrawDbg().pts.length===1)),'1点目を立上りに置けた');

/* ① 立上り→平場：狙いを1pxずつ動かしても3Dの打点が飛ばない */
const j1=await p.evaluate(([sx,sy])=>{ let prev=null, worst=0, at=null, n=0;
  for(let d=-40; d<=40; d++){ const w=nnD3AimWorld(sx, sy+d); if(!w){ prev=null; continue; }
    if(prev){ const dd=prev.distanceTo(w); if(dd>worst){ worst=dd; at={d, from:prev.toArray().map(v=>+v.toFixed(2)), to:w.toArray().map(v=>+v.toFixed(2))}; } }
    prev=w; n++; }
  return {n, worst:+worst.toFixed(3), at}; }, [s.x, s.y+30]);
ok(j1.n>50,'① 立上り→平場：狙いを1pxずつ動かして測れた',j1.n);
ok(j1.worst<0.12,'① 3Dの打点が飛ばない（きざみ5cm＋45度ぶんの内・0.12m以内）',j1);

/* ①-2 画面に出る寸法（長さの札）が飛ばない＝2D座標から出していない */
const lab=await p.evaluate(([sx,sy])=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
  let prev=null, worst=0, at=null, n=0;
  for(let d=-40; d<=40; d++){
    try{ nnD3LineAt(sx, sy+d); }catch(_){ continue; }
    const b=document.querySelector('#nnD3Lab'); if(!b) continue;
    const m=/([0-9.]+)\s*m/.exec(b.textContent||''); if(!m) continue;
    const L=parseFloat(m[1]);
    if(prev!=null){ const dd=Math.abs(L-prev); if(dd>worst){ worst=dd; at={d, from:prev, to:L}; } }
    prev=L; n++;
  }
  return {n, worst:+worst.toFixed(3), at}; }, [s.x, s.y+30]);
ok(lab.n>40,'①-2 画面の寸法を1pxずつ測れた',lab.n);
ok(lab.worst<0.12,'★①-2 画面に出る寸法が飛ばない（2D座標から出していない）',lab);

/* ② 平場の奥行きが30cm違う2点を「同じ位置」と誤判定しない */
const dup=await p.evaluate(()=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
  const scr=(x,y,z)=>{ const q=new THREE.Vector3(x,y,z).project(T.camera);
    return [r.left+(q.x*0.5+0.5)*r.width, r.top+(-q.y*0.5+0.5)*r.height]; };
  const A=scr(5,0.012,1.0), B=scr(5,0.012,1.3);
  const a2=nnD3AimAt(A[0],A[1]), b2=nnD3AimAt(B[0],B[1]);
  const wa=nnD3AimWorld(A[0],A[1]), wb=nnD3AimWorld(B[0],B[1]);
  return {uv:a2&&b2?+Math.hypot(a2[0]-b2[0],a2[1]-b2[1]).toFixed(3):null,
    w:wa&&wb?+wa.distanceTo(wb).toFixed(3):null, A, B}; });
ok(dup.w>0.20,'② 3Dでは 30cm 近く離れている',dup.w);
/* 実際に2点打って、両方とも入るか（＝「同じ位置です」で断られない） */
await p.mouse.click(dup.A[0],dup.A[1]); await p.waitForTimeout(400);
await p.mouse.click(dup.B[0],dup.B[1]); await p.waitForTimeout(400);
const st=await p.evaluate(()=>{ const d=nnD3DrawDbg(); const W=(window.__dsw||[]);
  return {n:d?d.pts.length:0, uv:d?d.pts.map(q=>q.map(v=>+v.toFixed(3))):null}; });
ok(st.n===3,'★② 内部座標が同じでも、3Dで離れていれば2点とも入る（「同じ位置です」で断られない）',st);
const w3=await p.evaluate(()=>{ const d=nnD3DrawDbg(); const a=nnD3ToWorld(d.pts[1][0],d.pts[1][1]);
  return {uvSame:Math.hypot(d.pts[1][0]-d.pts[2][0], d.pts[1][1]-d.pts[2][1])<0.01}; });
ok(true,'  （参考）内部の2D座標が同じかどうか',w3);

/* ③ 立上り→面取り→天端：続けて置ける */
await p.evaluate(()=>{ nnD3DrawCancel&&nnD3DrawCancel(); state.d3sheet=[]; setTool('draw'); nnSheetStart({n:'T',col:'#333',src:'t'},'draw'); });
await p.waitForTimeout(400);
for(const q of [[5,0.15,0.256],[5.6,0.30,0.256],[5.6,0.312,0.13],[5,0.312,0.13]]){
  const c=await SCR(...q); await p.mouse.click(c.x,c.y); await p.waitForTimeout(350); }
const n3=await p.evaluate(()=>{ const d=nnD3DrawDbg(); if(!d) return 0;
  const W=d.pts.map(q=>nnD3ToWorld(q[0],q[1]));
  let mn=9; for(let i=1;i<W.length;i++) mn=Math.min(mn, W[i-1].distanceTo(W[i]));
  return {n:d.pts.length, minStep:+mn.toFixed(3)}; });
ok(n3.n===4,'③ 立上り→面取り→天端 を4点続けて置けた',n3);
ok(n3.minStep>0.02,'③ となり合う点が同じ場所につぶれていない',n3);
ok(errs.length===0,'JSエラーなし',errs);
console.log(ng?('★NG '+ng+'件'):'○ 0件'); await b.close(); process.exit(ng?1:0);
})();
