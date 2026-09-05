/* 押し出しの「向き（軸）」（§299）
   本人の指示「押し出したりする一律した機能が必要。例えばShift＋マウスで垂直方向に延びる」
   使い方： node _check/axis1.js  ／ スマホ： node _check/axis1.js ph */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
            :{viewport:{width:1400,height:900}};
const p=await b.newPage(ctx);
if(PH) await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/zumen_sekisan.html');
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(700);
await p.evaluate(()=>{
  state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
    edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}];
  saveState(); setTab('d3');
});
await p.waitForTimeout(2500);

/* 面を選ぶ前は出ない */
ok(await p.evaluate(()=>{ const d=document.getElementById('nnAxisBar'); return !d||!d.classList.contains('on'); }),
   '面を選んでいないときは向きのバーを出さない');

/* 外壁の面を選ぶ */
await p.evaluate(()=>{ pick3({p:0,r:-1,e:0,f:'out'}); });
await p.waitForTimeout(400);
const bar=await p.evaluate(()=>{ const d=document.getElementById('nnAxisBar');
  if(!d)return null; const bs=[].map.call(d.querySelectorAll('button[data-ax]'),b=>({ax:b.getAttribute('data-ax'),on:b.classList.contains('on'),h:Math.round(b.getBoundingClientRect().height)}));
  const r=d.getBoundingClientRect(), w=document.getElementById('canvaswrap').getBoundingClientRect();
  return {on:d.classList.contains('on'), bs:bs, inside:(r.left>=w.left-1&&r.right<=w.right+1&&r.bottom<=w.bottom+1)}; });
ok(bar&&bar.on, '面を選ぶと向きのバーが出る');
ok(bar&&bar.bs.length===3, '向きは3つ（面に直角・たて・よこ）', bar&&bar.bs.map(x=>x.ax));
ok(bar&&bar.bs[0].on, '既定は「面に直角」');
ok(bar&&bar.inside, 'バーは作図面の中に収まる');
ok(bar&&bar.bs.every(x=>x.h>=22), 'ボタンは指で押せる大きさ（22px以上）', bar&&bar.bs.map(x=>x.h));

/* 平場を選んだら出さない（上下しか無いので） */
await p.evaluate(()=>{ pick3({p:0,r:-1,e:-1,f:'deck'}); });
await p.waitForTimeout(400);
ok(await p.evaluate(()=>!document.getElementById('nnAxisBar').classList.contains('on')),
   '平場を選んだときは出さない（上下しか無い）');

/* ── 本物のドラッグで確かめる（自分の分岐表を写して見比べない・§117s） ── */
await p.waitForFunction(()=>{ try{ return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag); }catch(_){ return false; } }, {timeout:20000});
await p.evaluate(()=>{ setTool('sel'); });   /* ★面のドラッグは「選択」ツールのときだけ */
await p.evaluate(()=>{ /* 辺0（z=0 の壁）の外側が正面に来るようにカメラを置く */
  T.theta=-Math.PI/2; T.phi=1.05; T.r=12; T.tx=5; T.tz=0.5; T.voX=0; T.voY=0; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(1200);
async function pickScreen(F){
  return await p.evaluate((F)=>{
    pick3(null); pick3({p:0,r:-1,e:0,f:F});
    let hl=null; T.scene.traverse(o=>{ if(o.userData&&o.userData.face===F&&o.geometry) hl=o; });
    if(!hl) return null;
    hl.updateMatrixWorld(true);
    const c=new THREE.Vector3(); hl.geometry.computeBoundingBox();
    hl.geometry.boundingBox.getCenter(c); hl.localToWorld(c);
    const v=c.clone().project(T.camera);
    const r=T.renderer.domElement.getBoundingClientRect(), z=(window.nnPZ||1);
    return {x:(r.left+(v.x+1)/2*r.width)/z*z, y:(r.top+(-v.y+1)/2*r.height)/z*z};
  }, F);
}
async function realDrag(F, mod, dy){
  const c=await pickScreen(F); if(!c) return null;
  await p.waitForTimeout(300);
  const b0=await p.evaluate(()=>{ const e=ek(state.polys[0].edges[0]);
    return {h:e.h, w:e.w, x:state.polys[0].pts[0].x, y:state.polys[0].pts[0].y}; });
  await p.mouse.move(c.x,c.y); await p.mouse.down();
  if(mod) await p.keyboard.down(mod);
  await p.mouse.move(c.x, c.y+dy, {steps:6});
  await p.waitForTimeout(300);
  await p.mouse.up();
  if(mod) await p.keyboard.up(mod);
  await p.waitForTimeout(400);
  const b1=await p.evaluate(()=>{ const e=ek(state.polys[0].edges[0]);
    return {h:e.h, w:e.w, x:state.polys[0].pts[0].x, y:state.polys[0].pts[0].y}; });
  return {b0,b1};
}
/* ①ふつうに外壁の面をドラッグ＝押し出し（辺が動く・立上りは変わらない） */
let d1=await realDrag('out', null, -70);
ok(d1 && d1.b1.h===d1.b0.h && (Math.abs(d1.b1.y-d1.b0.y)>0.05||Math.abs(d1.b1.x-d1.b0.x)>0.05),
   '① ふつうのドラッグ＝面に直角（押し出し）', d1&&{h0:d1.b0.h,h1:d1.b1.h,dy:+(d1.b1.y-d1.b0.y).toFixed(2)});
/* ②Shift＋ドラッグ＝たて（立上りHが変わる・辺は動かない） */
let d2=await realDrag('out', 'Shift', -70);
ok(d2 && d2.b1.h!==d2.b0.h && Math.abs(d2.b1.y-d2.b0.y)<0.001 && Math.abs(d2.b1.x-d2.b0.x)<0.001,
   '② Shift＋ドラッグ＝たて（立上りHが変わり、面は動かない）', d2&&{h0:d2.b0.h,h1:d2.b1.h});
ok(d2 && d2.b1.h>d2.b0.h, '② 上へドラッグすると立上りが高くなる', d2&&{h0:d2.b0.h,h1:d2.b1.h});
/* ③Alt＋ドラッグ（天端をつかむ）＝よこ（天端Wが変わる・立上りは変わらない） */
await p.evaluate(()=>{ nnRingsAll(state.polys[0]).forEach(rg=>rg.edges.forEach(e=>{e.h=300;e.w=250;}));
  saveState(); build3D(); T.phi=0.65; T.r=10; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(1500);
let d3=await realDrag('top', 'Alt', -70);
ok(d3 && d3.b1.w!==d3.b0.w && d3.b1.h===d3.b0.h,
   '③ Alt＋ドラッグ＝よこ（天端Wが変わり、立上りは変わらない）', d3&&{w0:d3.b0.w,w1:d3.b1.w,h0:d3.b0.h,h1:d3.b1.h});
/* ④カメラは動かない（§152） */
const cam0=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+(+v).toFixed(4)).join(','));
await realDrag('out','Shift',-40);
const cam1=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+(+v).toFixed(4)).join(','));
ok(cam0===cam1, '④ 向きを変えてドラッグしてもカメラは動かない');

/* チップを押すと覚える */
await p.evaluate(()=>{ pick3(null); pick3({p:0,r:-1,e:0,f:'out'}); });
await p.waitForTimeout(300);
await p.click('#nnAxisBar button[data-ax="v"]');
await p.waitForTimeout(300);
ok(await p.evaluate(()=>window.nnAxis==='v'), 'チップを押すと向きが変わる');
ok(await p.evaluate(()=>{ try{ return localStorage.getItem('nn_zumen_axis')==='v'; }catch(_){ return false; } }),
   '向きは端末に覚える');
await p.reload(); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(1500);
ok(await p.evaluate(()=>window.nnAxis==='v'), '開き直しても覚えている');
await p.evaluate(()=>{ window.nnAxis='auto'; try{localStorage.setItem('nn_zumen_axis','auto');}catch(_){} });

ok(errs.length===0, 'JSエラーなし', errs);
console.log(ng?('★NG '+ng+'件'):'すべて○');
await b.close();
process.exit(ng?1:0);
})();
