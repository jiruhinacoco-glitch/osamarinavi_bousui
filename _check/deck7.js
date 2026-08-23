/* ★2026-08-24f 平場の高さ変更を1か所に集約（天端は固定・上げ幅は止めない）（§175）
   node _check/deck7.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.parts=[];state.d3sol=[];state.scaleM=1;state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:30,y:0},{x:30,y:10},{x:0,y:10}]; closePoly();
  state.polys[0].edges.forEach(e=>{e.h=1000;e.w=250;e.k='para';}); setTool('sel'); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4300);
await p.evaluate(()=>{ dirty3d=true; build3D(); }); await p.waitForTimeout(600);
const G=`()=>{ let body=null, mem=null, memW=null, ptop=0;
  T.group.traverse(o=>{
    if(o.name==='nnBody'){ o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      body={top:+o.position.y.toFixed(2), x0:+bb.min.x.toFixed(2), x1:+bb.max.x.toFixed(2)}; }
    if(o.isMesh&&o.userData&&o.userData.polyIdx!=null){ o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox; mem=+o.position.y.toFixed(2);
      memW={x0:+bb.min.x.toFixed(2), x1:+bb.max.x.toFixed(2)}; }
    if(o.isMesh&&o.geometry&&o.geometry.type==='ExtrudeGeometry'){ o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox, h=bb.max.y-bb.min.y;
      if(h>0.03&&h<1.6) ptop=Math.max(ptop,+o.position.y.toFixed(2)); } });
  return {body, mem, memW, ptop, lv:state.polys[0].lv, h:state.polys[0].edges[0].h}; }`;
const g0=await p.evaluate(`(${G})()`);
ok(Math.abs(g0.ptop-0.98)<0.05,'はじめ：天端の上端 GL+0.98m',g0.ptop);
/* ① 表のGL+で0.4m上げる → 天端の上端は変わらない */
await p.evaluate(()=>{ nnLvLive(0,'0.4',1); }); await p.waitForTimeout(900);
const g1=await p.evaluate(`(${G})()`);
ok(Math.abs(g1.lv-0.4)<0.01,'①平場が0.4mに上がる',g1.lv);
ok(Math.abs(g1.h-600)<15,'①立上りHが 1000→600mm に縮む',g1.h);
ok(Math.abs(g1.ptop-g0.ptop)<0.05,'★天端の上端は変わらない（表の入力でも）',{前:g0.ptop,後:g1.ptop});
ok(g1.body && Math.abs(g1.body.top-0.4)<0.02,'①躯体は平場と一緒に上がる（本人の言うとおり）',g1.body);
/* ② 上げすぎても天端は消えない（立上り50mmで止まる） */
await p.evaluate(()=>{ nnLvLive(0,'99',1); }); await p.waitForTimeout(900);
const g2=await p.evaluate(`(${G})()`);
ok(g2.h>=50,'②立上りは50mmより低くならない＝天端が消えない',g2.h);
ok(Math.abs(g2.lv-99)<0.01,'②平場はどこまでも上げられる（止まらない）',g2.lv);
/* ③ 下げると立上りは戻る／GL+0mが最低 */
await p.evaluate(()=>{ nnLvLive(0,'0',1); }); await p.waitForTimeout(900);
const g3=await p.evaluate(`(${G})()`);
ok(Math.abs(g3.lv)<0.001,'③0mに戻せる',g3.lv);
/* 立上り300mm（既定）でもふつうに上げられる */
await p.evaluate(()=>{ state.polys[0].edges.forEach(e=>e.h=300); state.polys[0].lv=0; dirty3d=true; build3D(); });
await p.waitForTimeout(500);
await p.evaluate(()=>{ nnLvLive(0,'2',1); }); await p.waitForTimeout(900);
const g4=await p.evaluate(`(${G})()`);
ok(Math.abs(g4.lv-2)<0.01,'③立上り300mmでも平場を2m上げられる（本人の指摘）',g4.lv);
ok(g4.body && Math.abs(g4.body.top-2)<0.02,'③躯体も2mに上がる',g4.body);
await p.evaluate(()=>{ nnLvLive(0,'-5',1); }); await p.waitForTimeout(600);
ok(await p.evaluate(()=>state.polys[0].lv)>=0,'③GL+0mより下げられない');
/* ④ 平場の選択は天端を含まない */
await p.evaluate(()=>{ pick3({p:0,r:-1,e:-1,f:'deck'}); }); await p.waitForTimeout(500);
const hl=await p.evaluate(()=>{ let r=null; T.scene.traverse(o=>{ if(o.userData&&o.userData.face==='deck'){
  o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
  r={x0:+bb.min.x.toFixed(2), x1:+bb.max.x.toFixed(2)}; } }); return r; });
ok(hl && hl.x0>0.24 && hl.x1<29.76,'④平場の選択に天端は含まれない',hl);
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await p.evaluate(()=>{ nnLvLive(0,'0.4',1); }); await p.waitForTimeout(800);
await p.evaluate(()=>{T.theta=-0.9;T.phi=1.0;T.rev++;}); await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/e1.png'});
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
