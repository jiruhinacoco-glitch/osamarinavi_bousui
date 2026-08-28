/* 弧（アール）が他の機能とかみ合っているか（数量・保存・笠木・3D・中抜き）
   使い方: node _check/arc2.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(700);
await p.addInitScript(()=>{});

// 1) 弧 + 数量: 弓形の面積が加わるか
let r=await p.evaluate(()=>{
  const Q=()=>quantities(state.polys[0], state.scaleM).hira;
  state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}],
    edges:[{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250}],holes:[]}];
  commit(); const a0=Q();
  sel={p:0,r:-1,e:0}; nnEdgeArc(2000);
  commit(); const a1=Q();
  return {a0,a1,pts:state.polys[0].pts.length,edges:state.polys[0].edges.length,
    arcIds:new Set(state.polys[0].edges.filter(e=>e.arc).map(e=>e.arc)).size};
});
ok(Math.abs(r.a0-50)<0.3, '弧なしの平場 50㎡（20×10マス・1マス0.5m）('+r.a0.toFixed(2)+')');
ok(Math.abs(r.a1-63.77)<0.4, '弦10m・矢2m の弓形13.8㎡が加わる（理論63.77）('+r.a1.toFixed(2)+')');
ok(r.pts===19&&r.edges===19, '頂点・辺が16分割で増える (pts'+r.pts+'/edges'+r.edges+')');
ok(r.arcIds===1, '弧16本に同じ印が1つ ('+r.arcIds+')');

// 2) 保存→開き直しても弧が残る
r=await p.evaluate(()=>{saveState(); const raw=localStorage.getItem('nn_zumen_v1');
  const o=JSON.parse(raw); const eds=o.polys[0].edges.filter(e=>e.arc); return {saved:eds.length,id:eds.length?eds[0].arc:0};});
ok(r.saved===16,'保存に弧16本が入る ('+r.saved+')');
await p.reload({waitUntil:'load'}); await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(700);
r=await p.evaluate(()=>{const eds=state.polys[0].edges.filter(e=>e.arc);
  return {n:eds.length, ids:new Set(eds.map(e=>e.arc)).size, area:quantities(state.polys[0],state.scaleM).hira};});
ok(r.n===16&&r.ids===1,'開き直しても弧が残る ('+r.n+'本/'+r.ids+'種)');
ok(Math.abs(r.area-63.77)<0.4,'開き直しても面積が同じ ('+r.area.toFixed(2)+')');

// 3) 弧 + アルミ笠木
r=await p.evaluate(()=>{
  const ring=state.polys[0]; ring.edges.forEach(e=>{e.kasagi=1;});
  commit(); const rows=(typeof nnKasagiRows==='function')?nnKasagiRows():[];
  return {rows:rows.length, txt:rows.map(x=>x.name||x[0]||'').join('|').slice(0,120)};
});
ok(r.rows>0,'弧の辺にも笠木が計上される ('+r.rows+'行)');

// 4) 弧 + 3D（落ちないか・面ができるか）
r=await p.evaluate(async()=>{ setTab('d3'); await new Promise(s=>setTimeout(s,2500));
  let n=0; try{ if(typeof T!=='undefined'&&T&&T.group) T.group.traverse(o=>{if(o.isMesh)n++;}); }catch(e){}
  return {meshes:n};});
ok(r.meshes>50,'弧のある屋根が3Dで組める ('+r.meshes+'個)');

// 5) 中抜き（穴）の辺にも弧が使えるか
await p.evaluate(()=>{setTab('zu');});
r=await p.evaluate(()=>{
  const Q=()=>quantities(state.polys[0], state.scaleM).hira;
  const P=state.polys[0];
  P.holes=[{pts:[{x:5,y:3},{x:12,y:3},{x:12,y:7},{x:5,y:7}],
    edges:[{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250}]}];
  commit(); const before=Q();
  sel={p:0,r:0,e:0}; try{ nnEdgeArc(600); }catch(e){ return {err:String(e).slice(0,80)}; }
  commit();
  return {before, after:Q(), hpts:P.holes[0].pts.length, harc:P.holes[0].edges.filter(e=>e.arc).length};
});
ok(!r.err,'穴の辺に弧を当てても落ちない ('+(r.err||'ok')+')');
ok(r.harc===16,'穴の辺も16分割される ('+r.harc+')');
ok(Math.abs(r.after-r.before)>0.5,'穴の辺の弧が面積に効く ('+r.before.toFixed(2)+'→'+r.after.toFixed(2)+')');

ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng? '\n★NG '+ng+'件' : '\n全部○');
await b.close(); process.exit(ng?1:0);
})();
