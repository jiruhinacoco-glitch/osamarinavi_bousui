/* ★2026-08-24c 天端のはみ出しアスを端末まで／平場の選択に天端を含めない（§172）
   node _check/deck5.js */
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
/* ① 天端の継目が端末まで届く */
const BD=`()=>{ const e=state.polys[0].edges[0], th=Math.max((e.w||250)/1000,0.08), hh=e.h/1000;
  const CH=Math.min(0.02, th*0.25, hh*0.25);
  let n=0, cz=0, len=0;
  T.group.traverse(o=>{ if(!(o.isMesh&&o.material&&o.material.color&&o.material.color.getHex()===0x14120f))return;
    if(o.name==='nnChamBead'||o.name==='nnBeadBall')return;
    if(Math.abs(o.position.y-(hh+0.012))>0.004)return;
    if(o.position.z>0.5)return;                      /* 手前の辺（z=0の線）だけ見る */
    o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
    n++; cz=+o.position.z.toFixed(3); len=+(bb.max.x-bb.min.x).toFixed(3); });
  return {n, cz, len, th, CH:+CH.toFixed(3), want:+(th-2*CH).toFixed(3)}; }`;
const bd=await p.evaluate(`(${BD})()`);
ok(bd.n>0,'①天端のはみ出しアスがある',bd.n);
ok(Math.abs(bd.len-bd.want)<0.01,'①長さが「天端幅−面取り×2」＝端末まで届く',{長さ:bd.len, 目標:bd.want});
/* ② 平場を選ぶと「平場だけ」赤くなる（天端は含めない） */
await p.evaluate(()=>{ pick3({p:0,r:-1,e:-1,f:'deck'}); }); await p.waitForTimeout(500);
const HL=`()=>{ let r=null; T.scene.traverse(o=>{ if(o.userData&&o.userData.face==='deck'){
    o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
    r={x0:+bb.min.x.toFixed(3), x1:+bb.max.x.toFixed(3), z0:+bb.min.z.toFixed(3), z1:+bb.max.z.toFixed(3)}; } });
  return r; }`;
const hl=await p.evaluate(`(${HL})()`);
const th=await p.evaluate(()=>Math.max((state.polys[0].edges[0].w||250)/1000,0.08));
ok(!!hl,'②平場が赤くなる');
ok(hl && hl.x0>=th-0.01 && hl.x1<=30-th+0.01,'②赤いのは立上りの内側まで＝天端は含まない',{赤:hl, 壁厚:th});
ok(hl && Math.abs(hl.x0-(th+0.006))<0.02,'②内側の線にぴったり合っている',hl.x0);
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await p.evaluate(()=>{T.theta=-0.9;T.phi=0.95;T.rev++;}); await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/c1.png'});
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
