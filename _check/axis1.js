/* 3Dの方角ガイド（XYZ）と「真下直角に引ける」か（§333）
   本人の指摘「立上りから平場にかけて真下直角に線が引けない。別のところに引っ張られる」
   「XYZを付けるならBlenderのように右上に赤青緑で分かりやすく」
   使い方: node _check/axis1.js ／ ph ／ node _check/axis1.js _before.html（直す前と比べる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const args=process.argv.slice(2);
const ph=args.includes('ph');
const FILE=args.find(a=>a.endsWith('.html'))||'zumen_sekisan.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(ph?{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{viewport:{width:1200,height:800}});
if(ph) await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});await p.waitForTimeout(700);
await p.evaluate(()=>{ state.scaleM=1; state.polys=[{pts:[{x:0,y:0},{x:12,y:0},{x:12,y:8},{x:0,y:8}],holes:[],
  edges:[0,1,2,3].map(()=>({k:'para',h:600,w:250})),lv:0,name:'屋根①'}]; state.d3sheet=[]; saveState(); setTab('d3'); });
await p.waitForTimeout(2600);
await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
const g=await p.evaluate(()=>{ const e=document.getElementById('nnAxisGiz');
  if(!e) return null; const r=e.getBoundingClientRect(), w=document.getElementById('three-wrap').getBoundingClientRect();
  const pad=document.getElementById('d3pad'), pr=pad?pad.getBoundingClientRect():null;
  return {on:e.classList.contains('on'), w:Math.round(r.width), top:Math.round(r.top-w.top),
    fromRight:Math.round(w.right-r.right), padOverlap:pr?!(r.right<=pr.left+1||r.left>=pr.right-1):false,
    lab:e.querySelector('.lk').textContent}; });
ok(g&&g.on,'① 3Dの右上に方角ガイドが出る',g);
ok(g&&!g.padOverlap,'① 操作パッドと重ならない',g&&g.fromRight);
// 平面図タブでは出さない
await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(500);
ok(!(await p.evaluate(()=>{const e=document.getElementById('nnAxisGiz');return !!(e&&e.classList.contains('on'));})),'① 平面図では出さない');
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(700);
// 絵が描かれている（透明でない画素がある）
const px=await p.evaluate(()=>{ const c=document.querySelector('#nnAxisGiz canvas'); if(!c) return 0;
  const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0;
  for(let i=3;i<d.length;i+=4) if(d[i]>10) n++; return n; });
ok(px>200,'① 3本の軸が描かれている',px);
// 真下：立上りの面から下へ狙う
await p.evaluate(()=>{ try{nnRoofFold(true);}catch(_){}
  nnSheetStart({n:'てすと',col:'#3f3b36',src:'t'},'poly'); T.theta=0.9; T.phi=0.95; T.rev++; });
await p.waitForTimeout(400);
const SCR=async(x,y,z)=>p.evaluate(([X,Y,Z])=>{const el=T.renderer.domElement,R=el.getBoundingClientRect();
  const v=new THREE.Vector3(X,Y,Z).project(T.camera);
  return {x:R.left+(v.x+1)/2*R.width, y:R.top+(1-(v.y+1)/2)*R.height};},[x,y,z]);
const c0=await SCR(6,0.45,0.262); await p.mouse.click(c0.x,c0.y); await p.waitForTimeout(300);
let dbg=await p.evaluate(()=>nnD3DrawDbg());
if(!dbg||!dbg.pts||!dbg.pts.length){
  const info=await p.evaluate(([x,y])=>{ const e=document.elementFromPoint(x,y);
    const gz=document.getElementById('nnAxisGiz').getBoundingClientRect();
    return {el:e?e.id||e.tagName:null, giz:[Math.round(gz.left),Math.round(gz.top),Math.round(gz.right),Math.round(gz.bottom)],
      tool:tool, mode:!!window.nnSheetMode}; },[c0.x,c0.y]);
  console.log('click',Math.round(c0.x),Math.round(c0.y),JSON.stringify(info));
}
const st=(dbg&&dbg.pts&&dbg.pts.length)?dbg.pts[0]:null;
if(!st){ console.log('★NG 始点が置けない'); await b.close(); process.exit(1); }
// 真下を少し外して狙う（4度ほど横にずらす）
const r2=await p.evaluate(([u0,s0])=>{
  const out={};
  // 真下へ 0.30m、横に 0.02m ずらした狙い
  const raw=[u0+0.02, s0-0.30];
  const q=window.nnD3PlaneSnapDbg?nnD3PlaneSnapDbg(raw):null;
  out.free=q?[+(q[0]-u0).toFixed(3),+(q[1]-s0).toFixed(3)]:null;
  if(window.nnAxisSet) nnAxisSet('y');
  const q2=window.nnD3PlaneSnapDbg?nnD3PlaneSnapDbg([u0+0.20, s0-0.30]):null;
  out.lockY=q2?[+(q2[0]-u0).toFixed(3),+(q2[1]-s0).toFixed(3)]:null;
  if(window.nnAxisSet) nnAxisSet(null);
  return out;
},[st[0],st[1]]);
ok(r2.free&&Math.abs(r2.free[0])<1e-6,'② 少し外して狙っても、真下は Δu=0（そろえに引っ張られない）',r2.free);
ok(r2.lockY&&Math.abs(r2.lockY[0])<1e-6,'② Yに固定すれば、横に20cmずらして狙っても Δu=0',r2.lockY);
console.log('errs',errs.length,errs.slice(0,2));
console.log((ng?'★NG ':'○ ')+ng+'件');
await b.close(); process.exit(ng?1:0);})();
