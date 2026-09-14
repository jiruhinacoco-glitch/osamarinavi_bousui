/* 角度の内側弧と、点選択の2D／3D頂点移動。
   使い方: node _check/anglepoint.js [調べるHTML] */
const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=process.argv[2]||'zumen_sekisan.html',root=process.cwd();let bad=0;
const ok=(n,c,v)=>{console.log((c?'○':'★NG')+' '+n+' '+JSON.stringify(v));if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const p=await b.newPage({viewport:{width:1500,height:900}}),errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://ap.test/**',async r=>{let f=decodeURIComponent(new URL(r.request().url()).pathname.slice(1));if(f==='zumen_sekisan.html')f=source;const q=path.join(root,f);fs.existsSync(q)?r.fulfill({path:q}):r.fulfill({status:404,body:''});});
 await p.goto('https://ap.test/zumen_sekisan.html');await p.waitForTimeout(1200);
 const ang=await p.evaluate(()=>{if(typeof nnInteriorArc!=='function')return null;const one=pts=>{const poly={pts,holes:[]};return pts.map((q,i)=>nnInteriorArc(poly,q,pts[(i-1+pts.length)%pts.length],pts[(i+1)%pts.length]).deg);},pts=[{x:0,y:0},{x:6,y:0},{x:6,y:6},{x:3,y:6},{x:3,y:3},{x:0,y:3}],rev=pts.slice().reverse(),hole=[{x:2,y:2},{x:4,y:2},{x:4,y:4},{x:2,y:4}],hp={pts:[{x:0,y:0},{x:8,y:0},{x:8,y:8},{x:0,y:8}],holes:[{pts:hole}]};return {a:one(pts),b:one(rev),h:hole.map((q,i)=>nnInteriorArc(hp,q,hole[(i+3)%4],hole[(i+1)%4]).deg)};});
 ok('角度は建物内側（凹角・逆回り・中抜き）',ang&&ang.a.includes(270)&&ang.b.includes(270)&&ang.h.every(x=>Math.abs(x-270)<1e-6)&&Math.abs(ang.a.reduce((a,x)=>a+x,0)-720)<1e-6&&Math.abs(ang.b.reduce((a,x)=>a+x,0)-720)<1e-6,ang);
 await p.evaluate(()=>{try{nnZMenuClose();}catch{}state.polys=[{name:'L',lv:0,pts:[{x:2,y:2},{x:8,y:2},{x:8,y:8},{x:5,y:8},{x:5,y:5},{x:2,y:5}],edges:Array.from({length:6},()=>({h:300,w:250,k:'para'}))}];state.active=0;cellPx=45;ox=80;oy=180;showAngles=true;setTab('zu');setTool('selpt');draw();});
 const cvpt=async(x,y)=>p.evaluate(([x,y])=>{const r=cv.getBoundingClientRect(),kx=r.width/(cv.width/devicePixelRatio),ky=r.height/(cv.height/devicePixelRatio);return{x:r.left+(ox+x*cellPx)*kx,y:r.top+(oy+y*cellPx)*ky};},[x,y]);
 let a=await cvpt(8,2),z=await cvpt(9.2,3.1);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(z.x,z.y,{steps:5});await p.mouse.up();
 let st=await p.evaluate(()=>({q:state.polys[0].pts[1],other:state.polys[0].pts[0],sel:rsel}));
 ok('2D点選択は頂点1つだけ移動',st.q.x>9&&st.q.y>3&&st.other.x===2&&st.other.y===2&&st.sel.length===1,st);
 if(process.env.NN_SHOT)await p.screenshot({path:process.env.NN_SHOT});
 await p.evaluate(()=>{state.polys=[{name:'屋根①',lv:1,pts:[{x:1,y:1},{x:8,y:1},{x:8,y:7},{x:1,y:7}],edges:Array.from({length:4},()=>({h:300,w:250,k:'para'}))}];state.active=0;setTool('selpt');setTab('d3');dirty3d=true;build3D();});
 const has3=await p.evaluate(()=>typeof window.nnD3PointDbg==='function');
 if(!has3){ok('3D点選択も頂点1つだけ移動',false,'3D点選択なし');ok('実行エラーなし',errs.length===0,errs);await b.close();process.exitCode=bad?1:0;return;}
 await p.waitForFunction(()=>T&&T.renderer&&nnD3PointDbg().on,{timeout:10000});await p.waitForTimeout(300);
 const pos=await p.evaluate(()=>{const el=T.renderer.domElement,r=el.getBoundingClientRect(),s=state.scaleM,q=state.polys[0].pts[1],y=state.polys[0].lv+.325;function sc(x,z){const v=new THREE.Vector3(x*s,y,z*s).project(T.camera);return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};}return {a:sc(q.x,q.y),b:sc(q.x+1,q.y+1)};});
 await p.mouse.move(pos.a.x,pos.a.y);await p.mouse.down();await p.mouse.move(pos.b.x,pos.b.y,{steps:8});await p.mouse.up();await p.waitForTimeout(450);
 st=await p.evaluate(()=>({q:state.polys[0].pts[1],other:state.polys[0].pts[0],dbg:nnD3PointDbg(),selected:rsel.slice()}));
 ok('3D点選択も頂点1つだけ移動',Math.hypot(st.q.x-8,st.q.y-1)>.5&&st.other.x===1&&st.other.y===1&&st.dbg.hit&&st.dbg.hit.i===1&&st.selected.length===1,st);
 if(process.env.NN_SHOT3)await p.screenshot({path:process.env.NN_SHOT3});
 ok('実行エラーなし',errs.length===0,errs);await b.close();process.exitCode=bad?1:0;
})().catch(e=>{console.error(e);process.exit(1)});
