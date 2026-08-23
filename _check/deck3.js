/* ★2026-08-24a 建物・平場・パラペットを実物どおりの親子に／立上りHは天端の面をドラッグ（§170）
   node _check/deck3.js */
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
  drawPts=[{x:0,y:0},{x:30,y:0},{x:30,y:10},{x:0,y:10}]; closePoly(); setTool('sel'); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4300);
const GEO=`()=>{
  let body=null, para=0, ptop=0, mem=null, riser=0;
  T.group.traverse(o=>{
    if(o.name==='nnBody'){ o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      body={top:+o.position.y.toFixed(2), h:+(bb.max.y-bb.min.y).toFixed(2)}; }
    if(o.name==='nnDeckBody') riser++;
    if(o.isMesh&&o.userData&&o.userData.polyIdx!=null) mem=+o.position.y.toFixed(2);
    if(o.isMesh&&o.geometry&&o.geometry.type==='ExtrudeGeometry'){
      o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      const h=bb.max.y-bb.min.y; if(h>0.2&&h<0.4){ para++; ptop=Math.max(ptop,+o.position.y.toFixed(2)); } }
  });
  return {body, para, ptop, mem, riser}; }`;
const g0=await p.evaluate(`(${GEO})()`);
ok(g0.riser===0,'床スラブという別部品は無い（躯体1つ）',g0.riser);
ok(g0.para===4,'パラペットが4面ある',g0.para);
/* 平場を2m上げる：建物ごと上がり、パラペットも一緒＝浮かない・埋まらない */
await p.evaluate(()=>{ state.polys[0].lv=2; dirty3d=true; build3D(); }); await p.waitForTimeout(700);
const g1=await p.evaluate(`(${GEO})()`);
ok(g1.body && Math.abs(g1.body.top-2)<0.02 && Math.abs(g1.body.h-2)<0.05,
   '①平場を2m上げると躯体が2mの立体になる（四方に側面）',g1.body);
ok(Math.abs(g1.mem-2.01)<0.03,'①平場（防水面）は躯体の天端にぴったり載る（浮かない）',g1.mem);
ok(g1.para===4 && Math.abs(g1.ptop-2.28)<0.03,'①パラペットも一緒に上がる（埋まらない）',{para:g1.para,top:g1.ptop});
/* ②立上りHは天端の面をドラッグで変えられる（平場は動かない） */
await p.evaluate(()=>{ pick3({p:0,r:-1,e:0,f:'top'}); }); await p.waitForTimeout(300);
const lv0=await p.evaluate(()=>state.polys[0].lv);
const pt=await p.evaluate(()=>{
  const s=state.scaleM, e=state.polys[0].edges[0], th=Math.max((e.w||250)/1000,0.08);
  const v=new THREE.Vector3(15, (+state.polys[0].lv||0)+(e.h/1000)+0.02, th/2).project(T.camera);
  const r=T.renderer.domElement.getBoundingClientRect();
  return {x:Math.round(r.left+(v.x+1)/2*r.width), y:Math.round(r.top+(-v.y+1)/2*r.height)};});
await p.mouse.move(pt.x,pt.y); await p.mouse.down(); await p.mouse.move(pt.x,pt.y-40,{steps:6}); await p.mouse.up();
await p.waitForTimeout(600);
const af=await p.evaluate(()=>({h:state.polys[0].edges[0].h, lv:state.polys[0].lv}));
ok(af.h>320,'②天端の面を上へドラッグ＝立上りHが増える（数字入力に頼らない）',af);
ok(Math.abs(af.lv-lv0)<0.001,'②そのとき平場は1mmも動かない（独立）',{前:lv0,後:af.lv});
/* ③天端の継目は細い */
const TH=`()=>{ let maxr=0; const e=state.polys[0].edges[0], hh=e.h/1000, lv=+state.polys[0].lv||0;
  T.group.traverse(o=>{ if(!(o.isMesh&&o.material&&o.material.color&&o.material.color.getHex()===0x14120f))return;
    if(o.name==='nnChamBead'||o.name==='nnBeadBall')return;   /* 面取りの斜め・玉は別物 */
    if(Math.abs(o.position.y-(lv+hh+0.010))>0.004)return;      /* 天端の面の上のものだけ */
    o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
    maxr=Math.max(maxr, bb.max.y-bb.min.y); });
  return +maxr.toFixed(4); }`;
const thk=await p.evaluate(`(${TH})()`);
ok(thk>0 && thk<=0.006,'③天端のはみ出しアスはある／太さは6mm以下（線に見えない）',thk);
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await p.evaluate(()=>{T.theta=-0.9;T.phi=1.05;T.rev++;}); await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/a1.png'});
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
