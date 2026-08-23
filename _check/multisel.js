/* ★2026-08-23z 平場と天端の独立／壁の当たり判定ぜんぶ／Shift＋クリックの複数選択（§169）
   node _check/multisel.js */
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
  drawPts=[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}]; closePoly(); setTool('sel'); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4300);
/* ① 平場と天端は独立 */
await p.evaluate(()=>{ state.polys[0].lv=2; dirty3d=true; build3D(); }); await p.waitForTimeout(700);
const PARA=`()=>{ let n=0,maxy=0; T.group.traverse(o=>{ if(o.isMesh&&o.geometry&&o.geometry.type==='ExtrudeGeometry'){
    o.geometry.computeBoundingBox(); const h=o.geometry.boundingBox.max.y-o.geometry.boundingBox.min.y;
    if(h>0.2&&h<0.4){ n++; maxy=Math.max(maxy,o.position.y); } } }); return {para:n, top:+maxy.toFixed(2)}; }`;
const pa=await p.evaluate(`(${PARA})()`);
ok(pa.para===4 && Math.abs(pa.top-0.28)<0.02,'①平場を2m上げても天端は元の位置（完全に独立）',pa);
/* ② 壁の当たり判定が「見えている壁ぜんぶ」 */
const HB=`()=>{ let best=0; (function w(o){ (o.children||[]).forEach(c=>{
    const pk=c.userData&&c.userData.pick;
    if(pk&&pk.f==='out'&&pk.e===0&&c.geometry&&c.geometry.parameters)
      best=Math.max(best, c.geometry.parameters.height); w(c); }); })(T.scene);
  return +best.toFixed(2); }`;
const hb=await p.evaluate(`(${HB})()`);
ok(hb>=2.3,'②壁の当たり判定が壁ぜんぶ（床スラブ2m＋立上り0.3m）',hb);
/* ③ Shift＋クリックで追加選択 → まとめて動く */
await p.evaluate(()=>{ pick3({p:0,r:-1,e:-1,f:'deck'}); }); await p.waitForTimeout(300);
ok(await p.evaluate(()=>sel&&sel.f)==='deck','③まず平場を選ぶ');
await p.evaluate(()=>{ nnSelAdd({p:0,r:-1,e:0,f:'out'}); }); await p.waitForTimeout(400);
const ms=await p.evaluate(()=>({n:nnSelMulti.length, sel:sel&&sel.f}));
ok(ms.n===1 && ms.sel==='deck','③Shiftで壁の面を追加できる（2面選択）',ms);
const hl=await p.evaluate(()=>{let n=0;T.scene.traverse(o=>{if(o.isMesh&&o.material&&o.material.color
  &&o.material.color.getHex()===0xff4136)n++;});return n;});
ok(hl>=2,'③選んだ2面とも赤くなる',hl);
/* まとめてドラッグ（合成）：平場と天端が同じ量だけ動く */
const before=await p.evaluate(()=>({lv:state.polys[0].lv, bl:state.polys[0].bodyLv||0}));
const pt=await p.evaluate(()=>{const s=state.scaleM,pp=state.polys[0];let cx=0,cy=0;pp.pts.forEach(q=>{cx+=q.x;cy+=q.y;});
  cx=cx/pp.pts.length*s;cy=cy/pp.pts.length*s;
  const v=new THREE.Vector3(cx,(+pp.lv||0)+0.02,cy).project(T.camera);
  const r=T.renderer.domElement.getBoundingClientRect();
  return {x:Math.round(r.left+(v.x+1)/2*r.width),y:Math.round(r.top+(-v.y+1)/2*r.height)};});
await p.mouse.move(pt.x,pt.y); await p.mouse.down(); await p.mouse.move(pt.x,pt.y-100,{steps:8}); await p.mouse.up();
await p.waitForTimeout(700);
const after=await p.evaluate(()=>({lv:state.polys[0].lv, bl:state.polys[0].bodyLv||0}));
const d1=after.lv-before.lv, d2=after.bl-before.bl;
ok(d1>0.3 && Math.abs(d1-d2)<0.06,'③まとめてドラッグ＝平場も天端も同じ量だけ動く',{前:before,後:after});
/* ふつうのクリックに戻すと複数選択は解除 */
await p.evaluate(()=>{ pick3({p:0,r:-1,e:1,f:'out'}); }); await p.waitForTimeout(300);
ok(await p.evaluate(()=>nnSelMulti.length)===0,'③ふつうのクリックで選び直せる（複数選択は解除）');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
