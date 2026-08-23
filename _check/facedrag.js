/* ★2026-08-24g 天端のクリックが平場に横取りされていた／ドラッグの効き（§176）
   node _check/facedrag.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
const SCR=`(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(T.camera);
  const r=T.renderer.domElement.getBoundingClientRect();
  return {x:Math.round(r.left+(v.x+1)/2*r.width), y:Math.round(r.top+(-v.y+1)/2*r.height)};}`;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(/SETDECK/.test(m.text()))console.log('>',m.text());});
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.scaleM=1;state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}]; closePoly(); setTool('sel'); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4300);
await p.evaluate(()=>{ try{nnRoofFold(true);}catch(_){} T.theta=-0.8;T.phi=0.85;T.rev++; });
await p.waitForTimeout(900);
/* ① 天端をクリックして選べる */
const ptTop=await p.evaluate(`(${SCR})(10, 0.312, 0.125)`);
await p.mouse.click(ptTop.x,ptTop.y); await p.waitForTimeout(600);
const s1=await p.evaluate(()=>sel&&sel.f);
ok(s1==='top','①天端をクリックすると天端が選べる',s1);
/* ② 天端をドラッグすると立上りHが変わる（平場は動かない） */
await p.evaluate(()=>{ const o=window.nnSetDeckLv; window.nnSetDeckLv=function(a,b2){ console.log('SETDECK '+b2+' stack:'+(new Error().stack.split('\n')[2]||'')); return o.apply(this,arguments); }; });
const h0=await p.evaluate(()=>state.polys[0].edges[0].h), lvA=await p.evaluate(()=>state.polys[0].lv);
await p.mouse.move(ptTop.x,ptTop.y); await p.mouse.down(); await p.mouse.move(ptTop.x,ptTop.y-70,{steps:8}); await p.mouse.up();
await p.waitForTimeout(600);
const h1=await p.evaluate(()=>state.polys[0].edges[0].h), lvB=await p.evaluate(()=>state.polys[0].lv);
ok(h1>h0,'②天端を上へドラッグ＝立上りHが増える',{前:h0,後:h1});
ok(Math.abs(lvB-lvA)<0.001,'②そのとき平場は動かない',{前:lvA,後:lvB});
/* ③ 平場をクリック→ドラッグで上がる */
await p.evaluate(()=>{ state.polys[0].edges.forEach(e=>e.h=300); state.polys[0].lv=0; dirty3d=true; build3D(); pick3(null); });
await p.waitForTimeout(700);
const ptD=await p.evaluate(`(${SCR})(10, 0.02, 6)`);
await p.mouse.click(ptD.x,ptD.y); await p.waitForTimeout(500);
ok(await p.evaluate(()=>sel&&sel.f)==='deck','③平場をクリックすると平場が選べる');
await p.mouse.move(ptD.x,ptD.y); await p.mouse.down(); await p.mouse.move(ptD.x,ptD.y-25,{steps:8}); await p.mouse.up();
await p.waitForTimeout(700);
const r3=await p.evaluate(()=>({lv:state.polys[0].lv, h:state.polys[0].edges[0].h}));
ok(r3.lv>0.05,'③平場がドラッグで上がる',r3);
ok(r3.h>=150,'③立上りは150mmより低くならない＝天端が残る',r3.h);
/* ④ 表の入力でも上がる */
await p.evaluate(()=>{ nnLvLive(0,'2',1); }); await p.waitForTimeout(800);
ok(Math.abs(await p.evaluate(()=>state.polys[0].lv)-2)<0.01,'④表の入力でも2mまで上げられる');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
