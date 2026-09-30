/* ★2026-09-30s 立上りの高さが違う入隅に「寸法で貼る」増し張り（§572・本人の指摘「挟まった形になっている」）
   高い壁900mm・低い壁300mm の角で、どちらの壁から置いても
   ①角の中央に合う ②両方の壁に巻く ③面積は300×300のまま ④低い壁の面は高い壁の防水層の面で止まる
   node _check/hdiff.js [file] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{console.log((c?'○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(800);
await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){} state.scaleM=1;
  state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],holes:[],edges:[0,1,2,3].map(i=>({k:'para',h:i===0?900:300,w:250}))}];
  state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
await p.waitForFunction(()=>T&&T.group&&T.group.children.length>3,null,{timeout:20000});
await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} T.theta=Math.PI*0.75; T.phi=0.95; T.tx=3.4; T.tz=0.6; T.r=3.0; T.rev++;
  nnSheetStart({n:'増し張り',col:'#3f3b36',src:'t'},'size'); nnSheetMode.w=300; nnSheetMode.d=300; try{nnCond.close();}catch(_){} });
await p.waitForFunction(()=>{const k=T.camera.position.toArray().map(v=>v.toFixed(3)).join();window.__s=window.__l===k?(window.__s||0)+1:0;window.__l=k;return __s>4;},null,{timeout:15000});
const SC=c=>p.evaluate(c=>{const v=new THREE.Vector3(...c).project(T.camera),r=T.renderer.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},c);
for(const [nm,pt] of [['低い壁から',[3.744,0.15,0.40]],['高い壁から',[3.60,0.15,0.256]]]){
  const q=await SC(pt); await p.mouse.click(q.x,q.y); await p.waitForTimeout(500);
  const bar=await p.evaluate(()=>document.querySelector('#nnSheetSizeBar .sbs span').textContent);
  ok(/角から左右 150mm/.test(bar),'①'+nm+'：角の中央に合う',bar);
  await p.evaluate(()=>nnSheetSizeCommit()); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{ const sh=state.d3sheet[state.d3sheet.length-1]; if(!sh) return null;
    const a={}; sh.faces.forEach(f=>{const k=f.id.k+f.id.ei; a[k]=(a[k]||0)+f.am;});
    /* 低い壁（辺2）の面の角側の端（z）を、面の点から自分で出す */
    let zmin=9; sh.faces.forEach(f=>{ if(f.id.k==='wall'&&f.id.ei===1) f.pts.forEach(q=>{ const z=f.p[2]+f.u[2]*q[0]+f.v[2]*q[1]; zmin=Math.min(zmin,z); }); });
    return {w0:+(a.wall0||0).toFixed(4), w1:+(a.wall1||0).toFixed(4), tot:+sh.faces.reduce((s,f)=>s+f.am,0).toFixed(4), zmin:+zmin.toFixed(4)}; });
  ok(r&&r.w0>0.03&&r.w1>0.03,'②'+nm+'：高い壁・低い壁の両方に巻く',r);
  ok(r&&Math.abs(r.tot-0.09)<0.001,'③'+nm+'：面積は 300×300＝0.09㎡',r&&r.tot);
  ok(r&&Math.abs(r.zmin-0.256)<0.001,'④'+nm+'：低い壁の面は高い壁の防水層の面（z=0.256）で止まる（めり込まない）',r&&r.zmin);
  await p.evaluate(()=>{ nnSheetStart({n:'増し張り',col:'#3f3b36',src:'t'},'size'); nnSheetMode.w=300; nnSheetMode.d=300; });
  await p.waitForTimeout(300);
}
ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
await b.close(); process.exit(ng?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
