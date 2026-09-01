/* 3Dで作った立体（押出し・引込み・自由な形）と階段スタンプが保存・復元・3D表示まで通るか
   使い方: node _check/sol2.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,140))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(700);

// 立体（押出し・引込み・自由な形）を作って保存→開き直し→3Dに出るか
let r=await p.evaluate(async()=>{
  state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}],
    edges:[{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250}],holes:[]}];
  state.d3sol=[
   {p:[2,0.02,2], n:[0,1,0], u:[1,0,0], v:[0,0,1], a:[0,0], b:[2,2], d:0.6, mode:'out'},
   {p:[6,0.02,2], n:[0,1,0], u:[1,0,0], v:[0,0,1], a:[0,0], b:[2,2], d:0.4, mode:'in'},
   {p:[10,0.02,2], n:[0,1,0], u:[1,0,0], v:[0,0,1], a:[0,0], b:[3,3], d:0.5, mode:'out',
    shape:'poly', pts:[[0,0],[3,0],[3,1.5],[1.5,1.5],[1.5,3],[0,3]]}
  ];
  commit(); saveState();
  setTab('d3'); await new Promise(s=>setTimeout(s,2600));
  let n=0; try{ T.scene.traverse(o=>{ if(o.isMesh && o.userData && o.userData.solIdx!=null) n++; }); }catch(e){}
  let grp=0; try{ T.scene.children.forEach(c=>{ if(c.name==='nnSol'||/sol/i.test(c.name||'')) grp++; }); }catch(e){}
  return {n, grp, saved:JSON.parse(localStorage.getItem('nn_zumen_v1')||'{}').d3sol};
});
ok(Array.isArray(r.saved)&&r.saved.length===3,'立体3つが保存に入る ('+(r.saved?r.saved.length:'なし')+')');
ok(r.saved&&r.saved[2]&&r.saved[2].shape==='poly'&&r.saved[2].pts.length===6,'自由な形（L字6点）も保存される');

await p.reload({waitUntil:'load'}); await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(900);
r=await p.evaluate(async()=>{
  const s=(state.d3sol||[]);
  setTab('d3'); await new Promise(t=>setTimeout(t,2800));
  let mesh=0; try{ T.scene.traverse(o=>{ if(o.isMesh) mesh++; }); }catch(e){}
  return {n:s.length, poly:s.filter(x=>x.shape==='poly').length, mesh};
});
ok(r.n===3,'開き直しても立体3つ ('+r.n+')');
ok(r.poly===1,'開き直しても自由な形が残る ('+r.poly+')');
ok(r.mesh>50,'3Dが組める ('+r.mesh+'個)');

// 階段スタンプ
r=await p.evaluate(async()=>{
  setTab('zu');
  /* ★2026-09-02b 鳩小屋・階段は「⚙ 設備」の小窓へ移した（ボタンの id はそのまま） */
  try{ nnSetsubiPanel(); }catch(_){}
  await new Promise(t=>setTimeout(t,200));
  const btn=document.getElementById('tl_p_kaidan');
  if(!btn) return {no:1};
  btn.click(); await new Promise(t=>setTimeout(t,300));
  const placing=(typeof nnPlacingId==='function')?nnPlacingId():null;
  let placed=0;
  if(typeof nnPlaceAtGrid==='function'){ nnPlaceAtGrid(5,5); placed=(state.parts||[]).length; }
  const lib=(typeof nnPartsCount==='function')?nnPartsCount():-1;
  return {no:0, placing:!!placing, placed, lib};
});
ok(!r.no,'階段ボタンがある');
ok(r.placing,'押すと置くモードになる');
ok(r.placed===1,'方眼に1個置ける ('+r.placed+')');

// 3Dで階段が出る
r=await p.evaluate(async()=>{
  setTab('d3'); await new Promise(t=>setTimeout(t,2600));
  let n=0; try{ T.scene.traverse(o=>{ if(o.isMesh && o.userData && o.userData.partIdx!=null) n++; }); }catch(e){}
  return {n};
});
ok(r.n>3,'3Dに階段の部品が出る ('+r.n+'個)');

ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
