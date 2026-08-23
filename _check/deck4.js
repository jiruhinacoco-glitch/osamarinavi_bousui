/* ★2026-08-24b 天端の高さは固定・平場は躯体ごと上下／天端のはみ出しアス／GL+0mが最低（§171）
   node _check/deck4.js */
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
  state.polys[0].edges.forEach(e=>{e.h=3000;e.w=250;e.k='para';}); setTool('sel'); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4300);
await p.evaluate(()=>{ dirty3d=true; build3D(); }); await p.waitForTimeout(600);
const TOP=`()=>{ let ptop=0,n=0,body=null;
  T.group.traverse(o=>{ if(o.name==='nnBody'){ o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox; body={top:+o.position.y.toFixed(2), h:+(bb.max.y-bb.min.y).toFixed(2)}; }
    if(o.isMesh&&o.geometry&&o.geometry.type==='ExtrudeGeometry'){ o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox, h=bb.max.y-bb.min.y;
      if(h>0.05&&h<3.2){ n++; ptop=Math.max(ptop,+(o.position.y).toFixed(2)); } } });
  return {ptop, n, body, lv:state.polys[0].lv, h:state.polys[0].edges[0].h}; }`;
const t0=await p.evaluate(`(${TOP})()`);
ok(Math.abs(t0.ptop-2.98)<0.05,'はじめ：天端の上端は GL+2.98m あたり',t0);
/* 平場を0.4m上げる（実ドラッグ） */
const pt=await p.evaluate(()=>{const s=state.scaleM,pp=state.polys[0];let cx=0,cy=0;pp.pts.forEach(q=>{cx+=q.x;cy+=q.y;});
  cx=cx/pp.pts.length*s;cy=cy/pp.pts.length*s;
  const v=new THREE.Vector3(cx,(+pp.lv||0)+0.02,cy).project(T.camera);
  const r=T.renderer.domElement.getBoundingClientRect();
  return {x:Math.round(r.left+(v.x+1)/2*r.width),y:Math.round(r.top+(-v.y+1)/2*r.height)};});
await p.mouse.click(pt.x,pt.y); await p.waitForTimeout(500);
await p.mouse.move(pt.x,pt.y); await p.mouse.down(); await p.mouse.move(pt.x,pt.y-9,{steps:6}); await p.mouse.up();
await p.waitForTimeout(800);
const t1=await p.evaluate(`(${TOP})()`);
ok(t1.lv>0.05,'①平場が上がった',t1.lv);
ok(t1.body && Math.abs(t1.body.top-t1.lv)<0.02,'①躯体も一緒に上がる（天板＝平場）',t1.body);
ok(Math.abs(t1.ptop-t0.ptop)<0.06,'★天端の高さは変わらない（平場が上がった分だけ立上りHが縮む）',{前:t0.ptop,後:t1.ptop,H:t1.h});
ok(t1.h < t0.h-50,'①立上りHが縮んでいる',{前:t0.h,後:t1.h});
/* ② 天端のはみ出しアスがある */
const BD=`()=>{ let n=0; const lv=+state.polys[0].lv||0, hh=state.polys[0].edges[0].h/1000;
  T.group.traverse(o=>{ if(!(o.isMesh&&o.material&&o.material.color&&o.material.color.getHex()===0x14120f))return;
    if(o.name==='nnChamBead'||o.name==='nnBeadBall')return;
    if(Math.abs(o.position.y-(lv+hh+0.012))<0.004) n++; });
  return n; }`;
ok(await p.evaluate(`(${BD})()`)>0,'②天端のはみ出しアスがある');
/* ③ GL+0m より下げられない */
await p.evaluate(()=>{ nnLvLive(0,'-3',1); }); await p.waitForTimeout(500);
ok(await p.evaluate(()=>state.polys[0].lv)>=0,'③GL+0mより下にはできない（地下は対象外）',await p.evaluate(()=>state.polys[0].lv));
await p.evaluate(()=>{ state.polys[0].lv=0.4; dirty3d=true; build3D(); }); await p.waitForTimeout(500);
await p.mouse.move(pt.x,pt.y); await p.mouse.down(); await p.mouse.move(pt.x,pt.y+400,{steps:10}); await p.mouse.up();
await p.waitForTimeout(700);
ok(await p.evaluate(()=>state.polys[0].lv)===0,'③ドラッグで下げてもGL+0mで止まる',await p.evaluate(()=>state.polys[0].lv));
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await p.evaluate(()=>{state.polys[0].lv=0;state.polys[0].edges.forEach(e=>e.h=1000);dirty3d=true;build3D();
  T.theta=-0.9;T.phi=1.0;T.rev++;}); await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/b1.png'});
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
