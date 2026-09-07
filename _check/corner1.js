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

/* ── ① 角をまたぐ貼り物（辺0の道で、u が辺の長さ20を越える形をかく） ── */
const cor=await p.evaluate(()=>{
  state.d3sheet=[];
  window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
  /* 辺0（(0,0)→(20,0)・長さ20m）の道を取り、u=19〜21（角をまたぐ）× s=平場〜立上り でかく */
  const P=nnSheetPathAt(new THREE.Vector3(10,0.15,0.256), new THREE.Vector3(0,0,1));
  if(!P) return {noPath:1};
  const s0=nnSheetPathUS(P, new THREE.Vector3(10,0.012,1.0));   /* 平場の s */
  const s1=nnSheetPathUS(P, new THREE.Vector3(10,0.15,0.256));  /* 立上りの s */
  const us=[[19, s0[1]],[21, s0[1]],[21, s1[1]],[19, s1[1]]];
  const f=nnSheetPathFace(P, us);
  nnSheetCommit(f);
  const sh=(state.d3sheet||[])[0];
  const nrm=sh?sh.faces.map(x=>x.n.map(v=>Math.round(v*10)/10).join(',')):[];
  /* 期待する面積＝幅2m × 道のりの高さ（検査側で別に計算する） */
  return {n:(state.d3sheet||[]).length, faces:sh?sh.faces.length:0, nrm,
    area:sh?+nnSheetArea(sh).toFixed(3):0, want:+(2*Math.abs(s1[1]-s0[1])).toFixed(3)};
});
ok(!cor.noPath, '① 辺の道が取れる', cor);
ok(cor.faces>=4, '① 角をまたいだ形が「4面以上」に巻ける（辺0の平場＋立上り／辺1の平場＋立上り）', cor);
const dirs=new Set(cor.nrm||[]);
ok(dirs.size>=3, '① 向きの違う面が3種類以上ある＝2つの壁にまたがっている（片面だけではない）', [...dirs]);
ok(Math.abs(cor.area-cor.want)<0.02, '① 面積＝幅2m×道のりの高さ（角で欠けたり重なったりしない）', {area:cor.area, want:cor.want});
ok(cor.faces>=4 && cor.faces<=6, '① 面の数が増えすぎない（切れはしの重複が無い）', cor.faces);

/* ② 角の向こうの面をタップしても (u,s) が返る（辺0の道のまま、辺1の壁を指す） */
const across=await p.evaluate(()=>{
  const P=nnSheetPathAt(new THREE.Vector3(10,0.15,0.256), new THREE.Vector3(0,0,1));
  const a=nnSheetPathUS(P, new THREE.Vector3(19.744,0.15,3.0));   /* 辺1（x=20の壁）の内面 */
  const b=nnSheetPathUS(P, new THREE.Vector3(10,0.15,0.256));     /* 辺0の内面 */
  return {across:a?[+a[0].toFixed(2),+a[1].toFixed(2)]:null, own:b?[+b[0].toFixed(2),+b[1].toFixed(2)]:null};
});
ok(across.across && across.across[0]>20, '② 角の向こうの壁をタップしても、続きの u（20mより先）として拾える', across);
ok(across.own && across.own[0]>0 && across.own[0]<20, '② 自分の壁は今までどおり', across.own);

/* ③ 角を越えた u が、3Dの正しい場所に戻る（辺1の壁の上） */
const w3=await p.evaluate(()=>{
  const P=nnSheetPathAt(new THREE.Vector3(10,0.15,0.256), new THREE.Vector3(0,0,1));
  const s1=nnSheetPathUS(P, new THREE.Vector3(10,0.15,0.256))[1];
  const v=nnSheetPathWorld(P, 23, s1);       /* 角から3m先＝辺1の壁 */
  return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
});
ok(Math.abs(w3[0]-19.74)<0.1 && Math.abs(w3[2]-3)<0.15, '③ 角を越えた点が、となりの壁（x≒19.74・z≒3）に戻る', w3);

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
