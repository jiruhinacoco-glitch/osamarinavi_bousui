/* ★2026-09-07i スマホの3D：かいている途中のカードは左端のたて1列／長方形ツールは3Dでも2タップ（§323）
   使い方： node _check/box3d.js   前提：python3 -m http.server 8899 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; function ok(c,m,v){ console.log((c?'  ○ ':'  ★NG ')+m+(v!==undefined?'  '+JSON.stringify(v):'')); if(!c)ng++; }
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const c=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await c.newPage(); await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ localStorage.removeItem('nn_zumen_v1'); });
await p.evaluate(()=>{ state.polys=[{name:'屋根①',pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,holes:[]}]; saveState(); renderPolyList(); draw(); setTab('d3'); });
await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.renderer,null,{timeout:20000});
await p.evaluate(()=>{ try{d3ViewPlan();}catch(_){} });
await p.waitForFunction(()=>getComputedStyle(document.getElementById('nav')).transform!=='none'||document.getElementById('nav').classList.contains('hide')||true,null,{timeout:8000});
await p.waitForTimeout(6500);
await p.evaluate(()=>{ setTool('box'); });
const n0=await p.evaluate(()=>state.polys.length);
const tabAfter=await p.evaluate(()=>tab);
// 平場の画面座標：屋根の中心近くの2点を投影
const pts=await p.evaluate(()=>{ const sM=state.scaleM||0.5; function sc(gx,gy){ const v=new THREE.Vector3(gx*sM,0.02,gy*sM).project(T.camera); const r=T.renderer.domElement.getBoundingClientRect(); return [ (v.x+1)/2*r.width+r.left, (-v.y+1)/2*r.height+r.top ]; } return [sc(6,5), sc(12,10)]; });
// synthetic touch aim: down, move, up (照準 +36,-52 → 逆算)
async function tap(x,y){ const el=await p.$('#three-wrap canvas'); const cnv=await p.evaluate(()=>{const c=T.renderer.domElement; c.id='__cv'; return 1;});
  await p.evaluate(([x,y])=>{ const el=T.renderer.domElement; const ev=t=>new PointerEvent(t,{pointerId:7,pointerType:'touch',isPrimary:true,clientX:x-36,clientY:y+52,bubbles:true,cancelable:true}); el.dispatchEvent(ev('pointerdown')); },[x,y]);
  await p.waitForTimeout(150);
  await p.evaluate(([x,y])=>{ const el=T.renderer.domElement; const ev=t=>new PointerEvent(t,{pointerId:7,pointerType:'touch',isPrimary:true,clientX:x-36+1,clientY:y+52,bubbles:true,cancelable:true}); el.dispatchEvent(ev('pointermove')); },[x,y]);
  await p.waitForTimeout(150);
  await p.evaluate(([x,y])=>{ const el=T.renderer.domElement; const ev=t=>new PointerEvent(t,{pointerId:7,pointerType:'touch',isPrimary:true,clientX:x-36+1,clientY:y+52,bubbles:true,cancelable:true}); el.dispatchEvent(ev('pointerup')); },[x,y]);
  await p.waitForTimeout(400); }
await tap(pts[0][0],pts[0][1]);
const s1=await p.evaluate(()=>({d:nnD3DrawDbg(), card:document.getElementById('nnD3Card')?{on:document.getElementById('nnD3Card').classList.contains('on'),draw:document.getElementById('nnD3Card').classList.contains('drawing'),r:document.getElementById('nnD3Card').getBoundingClientRect().toJSON()}:null}));
await tap(pts[1][0],pts[1][1]);
const s2=await p.evaluate(()=>({n:state.polys.length, d:nnD3DrawDbg(), last:state.polys[state.polys.length-1]&&state.polys[state.polys.length-1].pts, tab}));
// 自由な形のカードの位置
await p.evaluate(()=>{ setTool('draw'); });
await tap(pts[0][0],pts[0][1]); await tap(pts[1][0],pts[0][1]);
const s3=await p.evaluate(()=>{const d=document.getElementById('nnD3Card'); return {on:d.classList.contains('on'),draw:d.classList.contains('drawing'),r:d.getBoundingClientRect().toJSON(),btn:[...d.querySelectorAll('button')].map(b=>b.textContent)}});
ok(tabAfter==='d3','長方形ツールを押しても3Dのまま（平面図へ弾き出さない）',tabAfter);
ok(s1.d&&s1.d.pts.length===1&&!s1.card,'1回目のタップ＝角が1つ・カードは出ない',s1);
ok(s2.n===n0+1&&!s2.d,'2回目のタップで長方形が閉じて部位になる',{n:s2.n,tab:s2.tab});
const L=s2.last||[]; const w=L.length===4?Math.abs(L[1].x-L[0].x):0, h=L.length===4?Math.abs(L[2].y-L[1].y):0;
ok(L.length===4&&Math.abs(w-6)<0.2&&Math.abs(h-5)<0.2&&L[0].y===L[1].y&&L[1].x===L[2].x,'長方形（4点・約6×5マス・辺は直角）',L);
ok(s3.on&&s3.draw,'自由な形でかいている途中のカードは drawing',{on:s3.on,draw:s3.draw});
ok(s3.r.left<12&&s3.r.right<70,'カードは左端（まん中をふさがない）',{l:s3.r.left,r:s3.r.right});
ok(s3.r.height>s3.r.width,'たて1列',{w:s3.r.width,h:s3.r.height});
ok(s3.btn.length===3&&s3.btn.every(t=>t.length<=1),'ボタンは記号だけ（◜ ↩ ✕）',s3.btn);
ok(s3.r.bottom<393-40,'下部の「積算・設定」にかからない',s3.r.bottom);
ok(errs.length===0,'JSエラーなし',errs);
console.log(ng?('★NG '+ng+'件'):'全部○');
await b.close();})();
