/* ★2026-08-24d 天端面と平場面を切り分け（躯体は固定・かさ上げは内側の床スラブ）（§173）
   node _check/deck6.js */
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
const G=`()=>{ let body=null, mem=null, memW=null, ptop=0, dk=null;
  T.group.traverse(o=>{
    if(o.name==='nnBody'){ o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      body={top:+o.position.y.toFixed(2), h:+(bb.max.y-bb.min.y).toFixed(2),
            x0:+bb.min.x.toFixed(2), x1:+bb.max.x.toFixed(2)}; }
    if(o.name==='nnDeckBody'){ o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      dk={top:+o.position.y.toFixed(2), h:+(bb.max.y-bb.min.y).toFixed(2),
          x0:+bb.min.x.toFixed(2), x1:+bb.max.x.toFixed(2)}; }
    if(o.isMesh&&o.userData&&o.userData.polyIdx!=null){ o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox; mem=+o.position.y.toFixed(2);
      memW={x0:+bb.min.x.toFixed(2), x1:+bb.max.x.toFixed(2)}; }
    if(o.isMesh&&o.geometry&&o.geometry.type==='ExtrudeGeometry'){ o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox, h=bb.max.y-bb.min.y;
      if(h>0.05&&h<1.6) ptop=Math.max(ptop,+o.position.y.toFixed(2)); } });
  return {body, dk, mem, memW, ptop, lv:state.polys[0].lv, h:state.polys[0].edges[0].h}; }`;
const g0=await p.evaluate(`(${G})()`);
ok(Math.abs(g0.ptop-0.98)<0.05,'はじめ：天端の上端 GL+0.98m',g0.ptop);
ok(g0.memW && g0.memW.x0>0.24,'平場（防水面）は立上りの内側まで＝天端の面積を含まない',g0.memW);
/* 平場を0.4m上げる */
await p.evaluate(()=>{ nnLvLive(0,'0.4',1); }); await p.waitForTimeout(800);
await p.evaluate(()=>{ const pp=state.polys[0];
  pp.edges.forEach(e=>{ e.h=Math.max(0, e.h-400); }); dirty3d=true; build3D(); }); await p.waitForTimeout(700);
const g1=await p.evaluate(`(${G})()`);
ok(g1.body && Math.abs(g1.body.top-0)<0.02,'★躯体の天板は上がらない（平場につられない）',g1.body);
ok(g1.body && Math.abs(g1.body.x0)<0.02 && Math.abs(g1.body.x1-30)<0.02,'躯体は建物の輪郭のまま',{x0:g1.body.x0,x1:g1.body.x1});
ok(g1.dk && Math.abs(g1.dk.top-0.4)<0.02 && Math.abs(g1.dk.h-0.4)<0.03,'★かさ上げ分は「内側だけの床スラブ」',g1.dk);
ok(g1.dk && g1.dk.x0>0.24 && g1.dk.x1<29.76,'★床スラブは立上りの内側だけ＝天端を持ち上げない',{x0:g1.dk.x0,x1:g1.dk.x1});
ok(Math.abs(g1.mem-0.41)<0.03,'平場は0.4mに上がる',g1.mem);
ok(Math.abs(g1.ptop-g0.ptop)<0.06,'天端の上端は変わらない',{前:g0.ptop,後:g1.ptop});
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await p.evaluate(()=>{T.theta=-0.9;T.phi=1.0;T.rev++;}); await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/d1.png'});
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
