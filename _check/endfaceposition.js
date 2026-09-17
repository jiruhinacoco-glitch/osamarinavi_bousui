/* 3Dの可視頂点・辺・面・範囲を実ドラッグし、完成座標と保存を確認。 */
const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let bad=0;const ok=(c,n,v)=>{console.log((c?'○ ':'★NG ')+n+' '+JSON.stringify(v));if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1500,height:1000}}),errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*',r=>{const u=new URL(r.request().url());let f=path.resolve(decodeURIComponent(u.pathname).slice(1));if(u.pathname==='/zumen_sekisan.html'&&process.argv[2])f=path.resolve(process.argv[2]);return u.hostname==='select.test'&&f.startsWith(process.cwd()+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
await p.goto('https://select.test/zumen_sekisan.html');await p.evaluate(()=>{nnZMenuClose();setTab('d3');});await p.waitForFunction(()=>window.nnD3PointDbg&&T?.renderer&&document.getElementById('nnQuickBar'));
async function reset(){await p.evaluate(()=>{setTool('none');state.scaleM=1;state.polys=[{name:'検査屋根',pts:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],edges:Array.from({length:4},()=>({k:'para',h:600,w:250})),holes:[],lv:0}];state.d3sheet=[];state.parts=[];state.d3sol=[];state.active=0;dirty3d=true;build3D();d3ViewIso();T.theta=Math.PI*.25;T.phi=1.05;T.tx=1;T.tz=1;T.r=6;T.rev=(T.rev|0)+1;saveState();});await p.waitForFunction(()=>{const k=T.camera.position.toArray().join();window.__same=window.__last===k?(window.__same||0)+1:0;window.__last=k;return __same>3;});}
const sc=async(a)=>p.evaluate(a=>{var v=new THREE.Vector3(...a).project(T.camera),r=T.renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},a);
async function drag(a,z){await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(z.x,z.y,{steps:8});await p.mouse.up();await p.waitForFunction(()=>!window.nnD3PointDbg().drag);}

await reset();await p.evaluate(()=>{state.polys[0].pts=[{x:0,y:0},{x:6,y:0},{x:6,y:3},{x:3,y:3},{x:3,y:6},{x:0,y:6}];state.polys[0].edges=Array.from({length:6},(_,i)=>({k:'para',h:i===2?1200:600,w:250}));T.theta=Math.PI*3/4;T.phi=1.1;T.tx=3;T.tz=3;T.r=5;T.rev++;dirty3d=true;build3D();});
await p.waitForFunction(()=>{const k=T.camera.position.toArray().join();window.__same=window.__last===k?(window.__same||0)+1:0;window.__last=k;return __same>3;});
await p.locator('#tl_sel_face').click();let a=await sc([2.75,.95,2.88]);await p.mouse.click(a.x,a.y);
let chosen=await p.evaluate(()=>sel);ok(chosen?.e===2&&chosen?.f==='endB','入隅で250mm延長された実際の端面をクリックして選択',chosen);
// 描画された選択面そのものを測る。判定関数の返り値では検算しない。
const highlight=await p.evaluate(()=>{const list=[];T.scene.updateMatrixWorld(true);T.scene.traverse(o=>{if(o.isMesh&&o.userData.face==='endB'){const b=new THREE.Box3().setFromObject(o);list.push({min:b.min.toArray(),max:b.max.toArray(),depth:o.material.depthTest});}});return list;});
ok(highlight.length===1&&Math.abs(highlight[0].min[0]-2.75)<.0011&&Math.abs(highlight[0].max[0]-2.75)<.0011,'赤い面は内部のx=3ではなく実端面のx=2.75',highlight);
ok(highlight.length===1&&highlight[0].depth,'隣の低い躯体に隠れる部分は透けて表示しない',highlight);
await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.screenshot({path:'.codex-finalizer/cap431.png'});
await drag(a,{x:a.x-25,y:a.y});const moved=await p.evaluate(()=>state.polys[0].pts);ok(moved[3].x!==3&&moved[4].x!==3,'選択した実端面をドラッグして躯体を伸縮',moved);
ok(errs.length===0,'実行エラーなし',errs);await b.close();process.exitCode=bad?1:0;})().catch(e=>{console.error(e);process.exitCode=1;});

