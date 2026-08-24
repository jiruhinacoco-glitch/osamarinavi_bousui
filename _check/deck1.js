/* ★2026-08-23u 平場（屋根の面）も他の面と同じ扱いに／選択モードの解除／端部の面（§164）
   node _check/deck1.js
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.parts=[];state.d3sol=[];state.scaleM=0.5;state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]; closePoly(); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4500);
await p.evaluate(()=>{ setTool('sel'); try{nnRoofFold(true);}catch(_){} T.theta=-0.7;T.phi=0.9;T.rev++; });
await p.waitForTimeout(900);
const pt=await p.evaluate(()=>{const s=state.scaleM,pp=state.polys[0];let cx=0,cy=0;pp.pts.forEach(q=>{cx+=q.x;cy+=q.y;});
  cx=cx/pp.pts.length*s;cy=cy/pp.pts.length*s;
  const v=new THREE.Vector3(cx,(+pp.lv||0)+0.02,cy).project(T.camera);
  const r=T.renderer.domElement.getBoundingClientRect();
  return {x:Math.round(r.left+(v.x+1)/2*r.width),y:Math.round(r.top+(-v.y+1)/2*r.height)};});
/* ③平場を選ぶ */
await p.mouse.click(pt.x,pt.y); await p.waitForTimeout(600);
let a=await p.evaluate(()=>({sel:sel&&sel.f,red:(()=>{let n=0;T.scene.traverse(o=>{if(o.userData&&o.userData.face==='deck')n++;});return n;})()}));
ok(a.sel==='deck'&&a.red>0,'③平場をクリックすると赤くなる',a);
/* 平場だけ動く（躯体は不動） */
/* ★2026-08-24p ドラッグの効きは §176 で1/3に細かくしたので、同じ量を動かすには長く引く */
await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.move(pt.x,pt.y-320,{steps:10});await p.mouse.up();
await p.waitForTimeout(700);
let c=await p.evaluate(()=>({lv:state.polys[0].lv,bl:state.polys[0].bodyLv||0}));
/* ★躯体は平場と一緒に上がるのが正しい（本人の指示・§174）。ここで見るのは
   「bodyLv（古い建物高さ）が勝手に動かないこと」＝平場のドラッグが余計な物を触らないこと。 */
ok(c.lv>0.5&&c.bl===0,'平場が上がる／bodyLvは触らない',c);
/* ①もう一度クリックで選択解除 */
const pt2=await p.evaluate(()=>{const s=state.scaleM,pp=state.polys[0];let cx=0,cy=0;pp.pts.forEach(q=>{cx+=q.x;cy+=q.y;});
  cx=cx/pp.pts.length*s;cy=cy/pp.pts.length*s;
  const v=new THREE.Vector3(cx,(+pp.lv||0)+0.02,cy).project(T.camera);
  const r=T.renderer.domElement.getBoundingClientRect();
  return {x:Math.round(r.left+(v.x+1)/2*r.width),y:Math.round(r.top+(-v.y+1)/2*r.height)};});
await p.mouse.click(pt2.x,pt2.y); await p.waitForTimeout(600);
ok(await p.evaluate(()=>sel)===null,'①選んでいる面をもう一度押すと外れる');
await p.mouse.click(pt2.x,pt2.y); await p.waitForTimeout(600);
ok(await p.evaluate(()=>sel&&sel.f)==='deck','①もう一度押すと選び直せる');
await p.mouse.click(pt2.x,pt2.y); await p.waitForTimeout(600);
ok(await p.evaluate(()=>sel)===null,'①同じ面をもう一度押すと選択が外れる');
/* ①選択ツール以外では発動しない */
await p.evaluate(()=>setTool('draw')); await p.waitForTimeout(300);
const lv0=await p.evaluate(()=>state.polys[0].lv);
await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.move(pt.x,pt.y-100,{steps:6});await p.mouse.up();
await p.waitForTimeout(500);
ok(await p.evaluate(()=>sel)===null && await p.evaluate(()=>state.polys[0].lv)===lv0,'①選択ツール以外では面の選択・ドラッグが起きない');
await p.evaluate(()=>setTool('sel')); await p.waitForTimeout(300);
/* ②端部の面（新しく出てくる面） */
const nf=await p.evaluate(()=>{let e=0;(function w(o){ (o.children||[]).forEach(c=>{ if(c.userData&&c.userData.pick&&/^end/.test(c.userData.pick.f||''))e++; w(c);});})(T.scene);return e;});
ok(nf>=8,'②端部（新しく出てくる面）にも当たり判定がある',nf);
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
