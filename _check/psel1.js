/* ★2026-08-23f 3Dで屋根の面を選ぶ・高さを直感変更・右パネルすっきり（§158・PDF指示）
   node _check/psel1.js ／ node _check/psel1.js ph
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
const SCR=`(wx,wy,wz)=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=new THREE.Vector3(wx,wy,wz).project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
}`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                               :{viewport:{width:1600,height:900}});
const p=await ctx.newPage();
if(PH)await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393});
  Object.defineProperty(screen,'height',{get:()=>852}); });
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

/* ── ① 右パネルすっきり（空のとき） ── */
const empty=await p.evaluate(()=>({
  poly:(document.getElementById('polylist')||{}).textContent||'',
  edge:(document.getElementById('edgeedit')||{}).textContent||'',
  noimg:!!(document.getElementById('upanel')&&document.getElementById('upanel').classList.contains('noimg'))
}));
ok(/自動で行が増えます/.test(empty.poly),'部位パネル：空のとき「かくと自動で行が増える」と案内');
ok(empty.edge.length<60,'選択中の辺：説明が1行（60字未満）',empty.edge.length);
await p.waitForTimeout(900);
ok(await p.evaluate(()=>document.getElementById('upanel').classList.contains('noimg')),
   '下絵なしのとき、下絵パネルは「画像を読み込む」だけ');
const uvis=await p.evaluate(()=>{
  const u=document.getElementById('upanel');
  const btns=[...u.querySelectorAll('.ubtn')].filter(b=>getComputedStyle(b).display!=='none').length;
  const rows=[...u.querySelectorAll('.urow')].filter(r=>getComputedStyle(r).display!=='none').length;
  return {btns,rows};
});
ok(uvis.btns===1&&uvis.rows===0,'下絵の残りのボタン・スライダーは隠れる',uvis);

/* ── ② 図面をかくと部位の行が自動で増える ── */
await p.evaluate(()=>{
  state.polys=[]; state.parts=[]; state.d3sol=[]; state.scaleM=0.5; state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]; closePoly();
  drawPts=[{x:12,y:0},{x:20,y:0},{x:20,y:6},{x:12,y:6}]; closePoly();
  state.polys[1].lv=3; renderPolyList(); saveState();
});
await p.waitForTimeout(300);
const rows=await p.evaluate(()=>({
  n:document.querySelectorAll('#polylist .brow').length,
  names:[...document.querySelectorAll('#polylist .brow .nm')].map(x=>x.value),
  cnt:document.getElementById('polycount').textContent
}));
ok(rows.n===2,'かいたぶんだけ行が自動で増える',rows.n);
ok(rows.names[0]==='屋根①'&&rows.names[1]==='屋根②','名前は自動（屋根①・屋根②）',rows.names);
ok(rows.cnt==='2面','見出しに面数が出る',rows.cnt);

/* ── ③ 3Dで屋根の面をタップ → 青く選択＋一覧連動 ── */
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4200);
await p.evaluate(()=>d3ViewIso()); await p.waitForTimeout(800);
await p.evaluate(()=>setTool('sel')); await p.waitForTimeout(200);
ok(await p.evaluate(()=>{let n=0; T.group.traverse(o=>{ if(o.userData&&o.userData.polyIdx!=null)n++; }); return n;})===2,
   '平場の防水層に部位番号が付いている');
const cam0=await p.evaluate(()=>[T.tx,T.tz,T.r,T.theta,T.phi].map(v=>+v.toFixed(4)));
const c2=await p.evaluate(`(${SCR})(8.0, 3.02, 1.5)`);      /* 屋根②（lv=3）の平場の上 */
await p.mouse.click(c2.x,c2.y); await p.waitForTimeout(500);
const sel1=await p.evaluate(()=>({
  active:state.active,
  ov:(()=>{let m=null; T.scene.traverse(o=>{ if(o.parent&&o.parent.name==='nnPolySelG')m=o; });
     return m?{y:+m.position.y.toFixed(3), col:m.material.color.getHex()}:null;})(),
  row:!!document.querySelector('.brow[data-pi="1"].on'),
  card:document.getElementById('nnPolyCard')&&document.getElementById('nnPolyCard').classList.contains('on'),
  tt:(document.querySelector('#nnPolyCard .tt')||{}).textContent||''
}));
ok(sel1.active===1,'タップした屋根が選ばれる（屋根②）',sel1.active);
ok(!!sel1.ov && Math.abs(sel1.ov.y-3.022)<0.01,'青い面がその屋根の高さにかぶさる',sel1.ov);
ok(sel1.ov && sel1.ov.col===0x3fb6e8,'色は青（PDFのとおり）');
ok(sel1.row,'右の一覧の行も選択（緑）になる');
ok(sel1.card && /屋根②/.test(sel1.tt),'高さを変えるカードが出る',sel1.tt);
ok(JSON.stringify(await p.evaluate(()=>[T.tx,T.tz,T.r,T.theta,T.phi].map(v=>+v.toFixed(4))))===JSON.stringify(cam0),
   '選んでもカメラは動かない（§152）');

/* ── ④ 高さを直感で変更（打ちながら3Dへ即反映） ── */
await p.evaluate(()=>{ const i=document.getElementById('nnPvLv');
  i.value='6'; i.dispatchEvent(new Event('input',{bubbles:true})); });
await p.waitForTimeout(700);
const h1=await p.evaluate(()=>({
  lv:state.polys[1].lv,
  mem:(()=>{let y=null; T.group.traverse(o=>{ if(o.userData&&o.userData.polyIdx===1)y=+o.position.y.toFixed(3); }); return y;})(),
  ov:(()=>{let y=null; T.scene.traverse(o=>{ if(o.parent&&o.parent.name==='nnPolySelG')y=+o.position.y.toFixed(3); }); return y;})()
}));
ok(h1.lv===6,'GL+ を打つと高さが入る',h1.lv);
ok(h1.mem!==null&&Math.abs(h1.mem-6.012)<0.01,'3Dの屋根がその場で持ち上がる',h1.mem);
ok(h1.ov!==null&&Math.abs(h1.ov-6.022)<0.01,'青い面もついて動く',h1.ov);
/* ▲+0.5 */
await p.evaluate(()=>nnLvStep(0.5)); await p.waitForTimeout(500);
ok(await p.evaluate(()=>state.polys[1].lv)===6.5,'▲+0.5 で一段ずつ上げられる');
/* 一覧の行の GL+ 欄でも打ちながら反映 */
await p.evaluate(()=>{ const i=document.querySelector('.brow[data-pi="0"] .lvin');
  i.value='2'; i.dispatchEvent(new Event('input',{bubbles:true})); });
await p.waitForTimeout(700);
ok(await p.evaluate(()=>{let y=null; T.group.traverse(o=>{ if(o.userData&&o.userData.polyIdx===0)y=o.position.y; });
   return Math.abs(y-2.012)<0.01;}),'一覧の行の GL+ でも3Dが即反映');

/* ── ⑤ 相互排他・解除 ── */
await p.mouse.click(c2.x,c2.y); await p.waitForTimeout(400);   /* 屋根②を選び直す */
/* 何も無い所をタップ → 解除 */
const far=await p.evaluate(()=>{const el=T.renderer.domElement, r=el.getBoundingClientRect();
  return {x:r.left+r.width*0.06, y:r.top+r.height*0.90};});
await p.mouse.click(far.x,far.y); await p.waitForTimeout(400);
const off=await p.evaluate(()=>({
  ov:(()=>{let n=0; T.scene.traverse(o=>{ if(o.parent&&o.parent.name==='nnPolySelG')n++; }); return n;})(),
  card:document.getElementById('nnPolyCard').classList.contains('on')
}));
ok(off.ov===0&&!off.card,'何も無い所をタップ＝青い面もカードも消える',off);
/* 壁（辺）をタップしたら面の選択は外れて辺の編集になる */
await p.mouse.click(c2.x,c2.y); await p.waitForTimeout(400);
const wall=await p.evaluate(()=>{
  /* ★deco は nn-3dedit の閉包の中＝ここからは見えない。T.scene から pick 箱を探し、
     その中心を画面へ投影してクリック位置にする（レイの一番手前がその箱かも確かめる） */
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  T.scene.updateMatrixWorld(true);
  let out=null;
  T.scene.traverse(o=>{
    if(out||!(o.isMesh&&o.userData&&o.userData.pick))return;
    const c=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    const q=c.clone().project(T.camera);
    if(Math.abs(q.x)>0.85||Math.abs(q.y)>0.85)return;
    const rc=new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(q.x,q.y),T.camera);
    const hits=rc.intersectObjects(T.scene.children,true)||[];
    for(const h of hits){
      if(!h.object.isMesh)continue;
      if(h.object.userData&&h.object.userData.pick){
        out={x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; }
      break;
    }
  });
  return out;
});
if(wall){
  await p.mouse.click(wall.x,wall.y); await p.waitForTimeout(500);
  const mx=await p.evaluate(()=>({
    ov:(()=>{let n=0; T.scene.traverse(o=>{ if(o.parent&&o.parent.name==='nnPolySelG')n++; }); return n;})(),
    edge:!!(document.getElementById('d3edit')&&/立上り|種別|パラペット/.test(document.getElementById('d3edit').textContent))
  }));
  ok(mx.ov===0,'壁（辺）をタップ＝面の選択は外れる',mx);
  ok(mx.edge,'辺の編集カードに切り替わる');
}else{ ok(false,'壁の当たり判定が見つからない'); ok(false,'（同上）'); }

ok(errs.length===0,'JSエラーなし  '+errs.slice(0,3).join(' / '));
await p.screenshot({path:PH?'/tmp/psel_ph.png':'/tmp/psel_pc.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
