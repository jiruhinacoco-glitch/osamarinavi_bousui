/* ★2026-09-08 §325 ①3Dは道具なしで始まる ②「防水層を設置」の小窓を小さく
   ③出隅で「さわっている面」に線が行く ④置いた防水層の寸法
   node _check/sheetui.js  [ファイル名]   前提： python3 -m http.server 8899 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); };
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
  state.d3sheet=[]; saveState(); setTool('sel',1); setTab('d3');
});
await p.waitForTimeout(2200);

/* ── ① 3D投影モードは道具なしで始まる ── */
const t1=await p.evaluate(()=>({tool, on:document.getElementById('tl_sel').classList.contains('on')}));
ok(t1.tool!=='sel'&&t1.tool!=='select','① 3Dに移っても「選択」は押されていない',t1);
ok(t1.on===false,'① ツールバーの「選択」が点灯していない',t1.on);
await p.evaluate(()=>{ setTool('sel',1); });
const t2=await p.evaluate(()=>({tool, on:document.getElementById('tl_sel').classList.contains('on')}));
ok(t2.tool==='sel'&&t2.on,'① 自分で「選択」を押せば今までどおり効く',t2);
await p.evaluate(()=>{ setTool('none'); });

/* ── ② 小窓 ── */
await p.evaluate(()=>{ try{ nnCond.open('sheet'); }catch(_){} });
await p.waitForTimeout(400);
const box=await p.evaluate(()=>{
  const d=document.getElementById('nnCondBox'), w=document.getElementById('three-wrap');
  const r=d.getBoundingClientRect(), R=w.getBoundingClientRect();
  const bt=[...document.querySelectorAll('#nnCondBar button')].map(x=>(x.title||x.textContent||'').trim());
  return {ratio:(r.width*r.height)/(R.width*R.height), h:Math.round(r.height),
    title:(d.querySelector('h5 b')||{}).textContent||'', note:d.querySelectorAll('.cnote').length,
    folds:[...d.querySelectorAll('.sfb')].map(x=>x.textContent.trim()), bar:bt};
});
ok(/防水層を設置/.test(box.title),'② 名前は「防水層を設置」',box.title);
ok(box.bar.some(t=>/防水層を設置/.test(t)),'② 条件ボタンも「防水層を設置」',box.bar);
ok(box.note===0,'② 長い説明文（.cnote）は出さない',box.note);
ok(box.folds.length===2 && /材料名を検索/.test(box.folds[0]) && /材料選択/.test(box.folds[1]),
   '② 「材料名を検索」「材料選択」は折りたたみ',box.folds);
ok(box.ratio<=0.12,'② 小窓は3D画面の12%以下（1/4を占めていた・本人の指摘）',+(box.ratio*100).toFixed(1)+'%');
/* 折りたためる */
const fold=await p.evaluate(async()=>{ const bt=document.querySelector('#nnCondBox .sfb[data-fold="l"]');
  const h0=document.getElementById('nnCondBox').getBoundingClientRect().height;
  bt.click(); await new Promise(r=>setTimeout(r,200));
  return {h0:Math.round(h0), h1:Math.round(document.getElementById('nnCondBox').getBoundingClientRect().height)};});
ok(fold.h1<fold.h0-30,'② 折りたたむとさらに小さくなる',fold);
await p.evaluate(()=>{ document.querySelector('#nnCondBox .sfb[data-fold="l"]').click(); });

/* ── ③ 出隅：さわっている面の辺に線が行く ── */
const corner=await p.evaluate(()=>{
  const P=nnSheetPathAt(new THREE.Vector3(2,0.312,0.12), new THREE.Vector3(0,1,0));  /* 辺0の天端 */
  if(!P) return null;
  function back(x,y,z){
    const q=nnSheetPathUS(P,new THREE.Vector3(x,y,z),new THREE.Vector3(0,1,0));
    if(!q) return null; const w=nnSheetPathWorld(P,q[0],q[1]);
    return {d:+Math.hypot(w.x-x,w.y-y,w.z-z).toFixed(3)};
  }
  return {onBase:back(2,0.312,0.12), c1:back(0.12,0.312,0.30), c2:back(0.12,0.312,0.60),
    /* ★平場は角の二等分線（留め継ぎ）で分かれる。ここは辺0の側（z=2 < x=4）*/
    deck:(function(){ const q=nnSheetPathUS(P,new THREE.Vector3(4,0.012,2),new THREE.Vector3(0,1,0));
      return q?+q[0].toFixed(2):null; })()};
});
ok(corner&&corner.onBase&&corner.onBase.d<0.02,'③ 基準の辺の天端は今までどおり',corner&&corner.onBase);
ok(corner&&corner.c1&&corner.c1.d<0.02,'③ 出隅の向こうの天端＝さわった場所に線が行く（0.3m）',corner&&corner.c1);
ok(corner&&corner.c2&&corner.c2.d<0.02,'③ 出隅の向こうの天端＝さわった場所に線が行く（0.6m）',corner&&corner.c2);
ok(corner&&corner.deck!=null&&Math.abs(corner.deck-4)<0.05,'③ 平場は基準の辺のまま（§318を壊さない）',corner&&corner.deck);

/* ── ④ 置いた防水層の寸法 ── */
await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
await p.evaluate(()=>{ T.theta=-Math.PI/2+0.35; T.phi=1.2; T.r=4.0; T.tx=5; T.tz=7.0; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(900);
const d1=await p.evaluate(async()=>{
  window.nnSheetMode={kind:'poly', mat:{n:'テスト材',col:'#3f3b36',src:''}, t:4};
  const f={p:[5,0.012,7.5], n:[0,1,0], u:[1,0,0], v:[0,0,-1], pts:[[-0.5,0],[0.5,0],[0.5,-0.6],[-0.5,-0.6]]};
  window.nnSheetCommit(f);
  await new Promise(r=>setTimeout(r,500));
  const L=[...document.querySelectorAll('#nnSheetDims .sd')];
  const pos=L.map(x=>[parseFloat(x.style.left),parseFloat(x.style.top)]);
  let near=0; for(let i=0;i<pos.length;i++) for(let j=i+1;j<pos.length;j++)
    if(Math.hypot(pos[i][0]-pos[j][0],pos[i][1]-pos[j][1])<20) near++;
  return {n:L.length, txt:L.map(x=>x.textContent), near};
});
ok(d1.n>=4,'④ 置き終わると各辺の寸法が出る',d1.n);
ok(d1.txt.every(t=>/^\d+\.\d\d m$/.test(t)),'④ 札は「◯.◯◯ m」',d1.txt);
ok(d1.near===0,'④ 札どうしが重ならない',d1.near);
const d2=await p.evaluate(async()=>{ setTool('sel',1); await new Promise(r=>setTimeout(r,400));
  return document.querySelectorAll('#nnSheetDims .sd').length; });
ok(d2===0,'④ ほかのボタンを押すと寸法は消える',d2);
const d3=await p.evaluate(async()=>{ nnSheetSelect(0); await new Promise(r=>setTimeout(r,400));
  return {on:!!window.nnDimsOn, n:document.querySelectorAll('#nnSheetDims .sd').length}; });
ok(d3.on&&d3.n>=4,'④ 「選択」で選ぶ＋「寸法表示」が入っていれば出る',d3);
const d4=await p.evaluate(async()=>{ nnToggleDims(); await new Promise(r=>setTimeout(r,400));
  const n=document.querySelectorAll('#nnSheetDims .sd').length; nnToggleDims(); return n; });
ok(d4===0,'④ 「寸法表示」を切ると消える',d4);
const d5=await p.evaluate(async()=>{ nnSheetSelect(-1); await new Promise(r=>setTimeout(r,400));
  return document.querySelectorAll('#nnSheetDims .sd').length; });
ok(d5===0,'④ 選択を外すと消える',d5);
/* ── ③-2 どこをさわっても、その場所に打点される（6つの視点・全画素を走査） ── */
const sw=await p.evaluate(async()=>{
  const cams=[[Math.PI+Math.PI/4,1.0,2.4,0.3,0.3],[Math.PI+Math.PI/4,0.75,4.5,0.6,0.6],
              [Math.PI/4,1.15,3.0,0.5,0.5],[Math.PI*1.35,0.9,3.5,0.2,0.2]];
  let worst=0, n=0, at=null;
  for(const c of cams){
    T.theta=c[0];T.phi=c[1];T.r=c[2];T.tx=c[3];T.tz=c[4];T.voX=0;T.voY=0;T.rev=(T.rev|0)+1;
    setTool('draw'); window.nnSheetStart({n:'テスト材',col:'#3f3b36',src:''},'poly');
    await new Promise(r=>setTimeout(r,500));
    const el=T.renderer.domElement, r0=el.getBoundingClientRect();
    for(let y=r0.top+40;y<r0.top+r0.height-40;y+=18)
     for(let x=r0.left+40;x<r0.left+r0.width-40;x+=18){
      const v=new THREE.Vector2(((x-r0.left)/r0.width)*2-1,-((y-r0.top)/r0.height)*2+1);
      const rc=new THREE.Raycaster(); rc.setFromCamera(v,T.camera);
      const h=nnD3FaceHit(rc); if(!h) continue; n++;
      const pk=nnSheetPathPick(h.point,h.n); if(!pk) continue;
      const d=nnSheetPathWorld(pk.P,pk.us[0],pk.us[1]).distanceTo(h.point);
      if(d>worst){ worst=d; at=[+h.point.x.toFixed(2),+h.point.y.toFixed(2),+h.point.z.toFixed(2)]; }
     }
  }
  try{ nnD3DrawCancel(); nnSheetStop(); }catch(_){}
  return {n, worst:+worst.toFixed(3), at};
});
ok(sw.n>2000,'③ 走査した点の数',sw.n);
ok(sw.worst<=0.03,'③ どこをさわっても、その場所に打点される（ズレ3cm以内）',sw);

ok(errs.length===0,'JSエラーなし',errs);
console.log(ng?('★NG '+ng+' 件'):'--- ★NG 0 件 ---');
await b.close(); process.exit(ng?1:0);})();
