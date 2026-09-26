/* 防水層：出隅・入隅をまたいで巻ける／閉じるところが分かる（§317）
   本人の指摘「出隅入隅に全然適応できていない。片面しか引けない」
   「線を引いたとき、平面図みたいに最後の結びのところがわかりにくい」
   使い方: node _check/corner1.js  ／ node _check/corner1.js _before.html（直す前と比べる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(700);
/* 20×16 の長方形（1マス=1m）。角は (20,0)＝出隅 */
await p.evaluate(()=>{ state.scaleM=1; state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
  edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}]; saveState(); setTab('d3'); });
await p.waitForTimeout(2500);
await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});

/* ── ① 角をまたぐ貼り物 ──
   ★2026-09-26f 以前は内部の「道」（nnSheetPathFace→nnSheetCommit）を直接呼んでいたが、§344/§395 で
   増し張りは「実在する面をつないでかく」方式になり、道から作る口は使われなくなった（呼ぶと何も作らない）。
   本人がする操作そのもの＝**画面をクリックして角をまたいだ形をかいて閉じる**で、出来上がりを測る（§384）。
   辺0の立上り → 角をまたいで辺1の立上り → 平場 → 平場 → 始点で閉じる */
await p.evaluate(()=>{ state.d3sheet=[]; setTool('draw');
  nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw');
  Object.assign(T,{theta:Math.PI*0.75, phi:0.95, r:4.2, tx:19.1, tz:0.9, voX:0, voY:0}); T.rev=(T.rev|0)+1; });
await p.waitForFunction(()=>{ const el=T.renderer.domElement;
  const k=[Math.round(el.clientHeight), T.camera.position.x.toFixed(3), T.camera.position.y.toFixed(3), T.camera.position.z.toFixed(3)].join('|');
  if(window.__c1===k){ window.__c1n=(window.__c1n||0)+1; } else { window.__c1=k; window.__c1n=0; } return window.__c1n>=4; },{timeout:20000});
await p.waitForTimeout(300);
const SC=async(c)=>p.evaluate(c=>{ T.renderer.render(T.scene,T.camera); const el=T.renderer.domElement,r=el.getBoundingClientRect(); const v=new THREE.Vector3(...c).project(T.camera);
  return {x:r.left+(v.x+1)/2*r.width, y:r.top+(1-v.y)/2*r.height}; },c);
const PTS=[[18.6,0.15,0.256],[19.744,0.15,1.4],[19.0,0.012,1.4],[18.6,0.012,1.0]];
for(const c of PTS.concat([PTS[0]])){ const q=await SC(c); await p.mouse.click(q.x,q.y); await p.waitForTimeout(300); }
await p.waitForTimeout(900);
const cor=await p.evaluate(()=>{
  const sh=(state.d3sheet||[])[0]; if(!sh) return {n:0, faces:0, nrm:[]};
  const build=[]; T.scene.traverse(o=>{ if(o.isMesh&&o.visible&&o.name!=='nnSheet'&&!(o.userData&&(o.userData.nnSheetPreview||o.userData.pick))&&o.geometry) build.push(o); });
  const rc=new THREE.Raycaster(); let off=0, area=0;
  const F=nnSheetCurrentFaces(sh);
  F.forEach(f=>{ const P0=new THREE.Vector3(...f.p),U=new THREE.Vector3(...f.u),V=new THREE.Vector3(...f.v),N=new THREE.Vector3(...f.n).normalize(), P=f.pts;
    let t=0; P.forEach((q,i)=>{ const r=P[(i+1)%P.length]; t+=q[0]*r[1]-r[0]*q[1]; }); area+=Math.abs(t)/2;
    const cx=P.reduce((a,q)=>a+q[0],0)/P.length, cy=P.reduce((a,q)=>a+q[1],0)/P.length;
    [[cx,cy]].concat(P.map(q=>[q[0]+(cx-q[0])*0.2,q[1]+(cy-q[1])*0.2])).forEach(q=>{ const w=P0.clone().addScaledVector(U,q[0]).addScaledVector(V,q[1]);
      rc.set(w.clone().addScaledVector(N,0.06),N.clone().negate()); rc.far=0.2; const h=rc.intersectObjects(build,false)[0]; if(!h||Math.abs(h.distance-0.06)>0.012) off++; }); });
  return {n:state.d3sheet.length, faces:F.length, nrm:F.map(x=>x.n.map(v=>Math.round(v*10)/10).join(',')), area:+area.toFixed(3), off,
    pts:(nnD3DrawDbg()||{pts:[]}).pts.length}; });
ok(cor.n===1, '① クリックで角をまたいだ形をかいて閉じられる', cor);
const dirs=new Set(cor.nrm||[]);
ok(dirs.size>=3, '① 向きの違う面が3種類以上ある＝平場＋2つの壁にまたがっている（片面だけではない）', [...dirs]);
ok(cor.off===0, '① 出来上がった増し張りは全部 建物の面の上（浮いていない）', {面の外:cor.off});
/* かいた形の大きさ（検査側で別に計算）：1点目→2点目は壁に沿って角をまわるので、平場は角の四角ごと囲む。
   平場＝1.144×1.144 − 手前の角を切った三角 0.4×0.4/2 ＝1.229㎡／壁＝2面 × 1.144×(0.15−0.012) ＝0.316㎡ → 1.545㎡ */
const L1=19.744-18.6, H1=0.15-0.012, want1=L1*L1-0.4*0.4/2+2*L1*H1;
ok(Math.abs(cor.area-want1)<0.03, '① 面積＝平場1.229＋壁0.316＝'+want1.toFixed(3)+'㎡（増えない・消えない）', {area:cor.area, want:+want1.toFixed(3)});
ok(cor.faces>=3 && cor.faces<=8, '① 面の数が増えすぎない（切れはしの重複が無い）', cor.faces);
await p.evaluate(()=>{ try{ nnD3DrawCancel&&nnD3DrawCancel(); }catch(_){} state.d3sheet=[]; window.nnSheetMode=null; setTool('sel',1); });

/* ② 角の向こうの面をタップしても (u,s) が返る（辺0の道のまま、辺1の壁を指す） */
const across=await p.evaluate(()=>{
  const P=nnSheetPathAt(new THREE.Vector3(10,0.15,0.256), new THREE.Vector3(0,0,1));
  /* ★実際の使い方と同じく、タップした面の向きも渡す（§318②） */
  const a=nnSheetPathUS(P, new THREE.Vector3(19.744,0.15,3.0), new THREE.Vector3(-1,0,0));  /* 辺1（x=20の壁）の内面 */
  const b=nnSheetPathUS(P, new THREE.Vector3(10,0.15,0.256), new THREE.Vector3(0,0,1));     /* 辺0の内面 */
  /* 平場のまん中（どの辺からも同じ距離）＝いま引いている辺のままであること */
  const c=nnSheetPathUS(P, new THREE.Vector3(10,0.012,6.0), new THREE.Vector3(0,1,0));
  /* ★2026-09-08g 平場は角の二等分線（留め継ぎ）で分かれる。ここは辺0側（z=4 < x=6）*/
  const d=nnSheetPathUS(P, new THREE.Vector3(6,0.012,4.0), new THREE.Vector3(0,1,0));
  return {across:a?[+a[0].toFixed(2),+a[1].toFixed(2)]:null, own:b?[+b[0].toFixed(2),+b[1].toFixed(2)]:null,
    deck:c?[+c[0].toFixed(2),+c[1].toFixed(2)]:null, deck2:d?[+d[0].toFixed(2),+d[1].toFixed(2)]:null};
});
ok(across.across && across.across[0]>20, '② 角の向こうの壁をタップしても、続きの u（20mより先）として拾える', across);
ok(across.own && across.own[0]>0 && across.own[0]<20, '② 自分の壁は今までどおり', across.own);
ok(across.deck && Math.abs(across.deck[0]-10)<0.05, '② 平場のまん中をタップしても、いま引いている辺のまま（u が飛ばない）', across.deck);
ok(across.deck2 && Math.abs(across.deck2[0]-6)<0.05, '② 平場も辺0の側なら いま引いている辺のまま', across.deck2);

/* ③ 角を越えた u が、3Dの正しい場所に戻る（辺1の壁の上） */
const w3=await p.evaluate(()=>{
  const P=nnSheetPathAt(new THREE.Vector3(10,0.15,0.256), new THREE.Vector3(0,0,1));
  const s1=nnSheetPathUS(P, new THREE.Vector3(10,0.15,0.256))[1];
  const v=nnSheetPathWorld(P, 23, s1);       /* 角の留め継ぎ（u=19.75）から3.25m先＝辺1の壁 z=3.5 */
  return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
});
ok(Math.abs(w3[0]-19.74)<0.1 && Math.abs(w3[2]-3.5)<0.15, '③ 角を越えた点が、となりの壁（x≒19.74・z≒3.5＝留め継ぎから3.25m）に戻る', w3);

/* ④ 閉じるところ：始点の輪と札 */
const cl=await p.evaluate(()=>{
  state.d3sheet=[]; setTool('draw');
  window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
  return {hot:typeof ringHotMat, ask:typeof window.nnAskPick};
});
const near=await p.evaluate(()=>{
  /* 3点かいて、狙いを始点の近くに置いた状態を作る */
  T.theta=Math.PI/2+0.35; T.phi=0.95; T.r=7; T.tx=6; T.tz=1.2; T.rev=(T.rev|0)+1;
  return true;
});
ok(cl.ask==='function', '④ 直し方を選ぶ小窓（nnAskPick）がある', cl.ask);
/* ★下部ナビが5秒で隠れると3Dの画面の高さが変わり、カメラが合わせ直される（§274）。
   落ち着く前に画面の位置を計算すると、クリックが別の場所に当たる。安定するまで待つ。 */
await p.waitForFunction(()=>{ const el=T.renderer.domElement;
  const k=[Math.round(el.clientHeight), T.camera.position.x.toFixed(3), T.camera.position.y.toFixed(3), T.camera.position.z.toFixed(3)].join('|');
  if(window.__k===k){ window.__kn=(window.__kn||0)+1; } else { window.__k=k; window.__kn=0; }
  return window.__kn>=4; },{timeout:20000});
await p.waitForTimeout(300);
/* ★狙う画面の位置は「道そのもの」から出す（3Dの座標を手で決めると、壁か天端かを外す）。
   段の境目（nnSheetPathBounds）から 立上りの真ん中の s と、平場の s を作る。 */
const ring=await p.evaluate(()=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const P=nnSheetPathAt(new THREE.Vector3(10,0.15,0.256), new THREE.Vector3(0,0,1));
  const B=nnSheetPathBounds(P);                  /* [平場|立上り, 立上り|面取り, …] */
  const sW=(B[0]+B[1])/2, sD=B[0]-1.0;           /* 立上りの真ん中／平場（壁から1m内側） */
  const sc=(u,s)=>{ const v=nnSheetPathWorld(P,u,s).project(T.camera);
    return {x:r.left+(v.x+1)/2*r.width, y:r.top+(1-v.y)/2*r.height}; };
  return [sc(4,sW), sc(8,sW), sc(8,sD)];
});
for(const q of ring){ await p.mouse.click(q.x,q.y); await p.waitForTimeout(240); }
await p.mouse.move(ring[0].x+2, ring[0].y+2); await p.waitForTimeout(400);   /* 始点のすぐそばに狙いを置く */
const dbg0=await p.evaluate(()=>nnD3DrawDbg());
ok(dbg0 && dbg0.pts.length===3, '④ 3点かけている（狙った場所に打てている）', dbg0&&dbg0.pts.map(q=>q.map(v=>+v.toFixed(2))));
const vis=await p.evaluate(()=>{
  const g=T.scene.getObjectByName('nnPvRing');
  let lines=0; if(g) g.traverse(o=>{ if(o.isLine) lines++; });
  const st=document.querySelector('#nnD3Dims .dm.st');
  return {ring:!!g, lines, label:st?st.textContent:null, on:!!(st&&st.classList.contains('on')), near:!!(window.nnD3DrawDbg&&1)};
});
ok(vis.ring && vis.lines>=2, '④ 始点に二重の輪が出る（小さくても見つかる）', vis);
ok(vis.label && /閉じる/.test(vis.label), '④ 始点に「ここで閉じる」の札が出る', vis.label);
ok(vis.on, '④ 狙いが輪に入ると札が光る（✓ ここで閉じる）', vis.label);
/* ⑤ 実際に閉じられる */
await p.mouse.click(ring[0].x, ring[0].y); await p.waitForTimeout(600);
const done=await p.evaluate(()=>({n:(state.d3sheet||[]).length, dims:document.querySelectorAll('#nnD3Dims .dm.st').length}));
ok(done.n===1 && done.dims===0, '⑤ 始点をタップで閉じられる（札は消える）', done);
ok(errs.length===0, 'JSエラーなし', errs);
await b.close(); console.log((ng?'★NG':'○')+' '+ng+'件'); process.exit(ng?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
