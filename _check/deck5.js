/* ★2026-08-24c 天端のはみ出しアスを端末まで／平場の選択に天端を含めない（§172）
   node _check/deck5.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.parts=[];state.d3sol=[];state.scaleM=1;state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:30,y:0},{x:30,y:10},{x:0,y:10}]; closePoly(); setTool('sel',1); });
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
/* ② 平場を選ぶと「平場だけ」赤くなる（天端は含めない）
   ★2026-11-05 §462（面選択を描画済みの実面へ統一）から、赤い板は平場の実面そのもの（壁の下まで続く）を
   奥行き判定つきで重ねる形になった。壁に隠れた部分は画面に出ないので、板の大きさではなく
   **画面に出た色**で測る：選ぶ前と後で、天端の上の点は色が変わらず、平場の点だけ赤くなること。 */
const PX=`(pts)=>{ T.renderer.render(T.scene,T.camera); const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const c=document.createElement('canvas'); c.width=el.width; c.height=el.height; const g=c.getContext('2d'); g.drawImage(el,0,0);
  return pts.map(q=>{ const v=new THREE.Vector3(q[0],q[1],q[2]).project(T.camera);
    const x=Math.round((v.x+1)/2*el.width), y=Math.round((-v.y+1)/2*el.height); const d=g.getImageData(x,y,1,1).data;
    return d[0]-d[1]; }); }`;
const hh=await p.evaluate(()=>state.polys[0].edges[0].h/1000), th=await p.evaluate(()=>Math.max((state.polys[0].edges[0].w||250)/1000,0.08));
const PTS=[[15,hh+0.002,th/2],[15,0.002,5]];      /* [天端の真ん中, 平場の真ん中] */
await p.evaluate(()=>{ T.theta=-0.9;T.phi=0.95;T.rev++; }); await p.waitForTimeout(1200);
const c0=await p.evaluate(`(${PX})(${JSON.stringify(PTS)})`);
await p.evaluate(()=>{ pick3({p:0,r:-1,e:-1,f:'deck'}); }); await p.waitForTimeout(800);
const c1=await p.evaluate(`(${PX})(${JSON.stringify(PTS)})`);
ok(c1[1]-c0[1]>25,'②平場が赤くなる',{前:c0[1],後:c1[1]});
ok(Math.abs(c1[0]-c0[0])<10,'②天端は赤くならない（赤いのは立上りの内側まで）',{前:c0[0],後:c1[0]});
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await p.evaluate(()=>{T.theta=-0.9;T.phi=0.95;T.rev++;}); await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/c1.png'});
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
