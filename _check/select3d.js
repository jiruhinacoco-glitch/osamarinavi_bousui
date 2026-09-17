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
await reset();ok(await p.locator('#nnQuickBar').isHidden()&&await p.locator('#tl_undo').isVisible(),'戻るはツールバー1つに統一');
await p.locator('#tl_sel_point').click();let a=await sc([.256,.612,.256]),z=await sc([.756,.612,.756]);await drag(a,z);
let pts=await p.evaluate(()=>state.polys[0].pts);ok(Math.abs(pts[0].x-.5)<.11&&Math.abs(pts[0].y-.5)<.11&&pts[1].x===4,'見えている内側の角から頂点だけ移動',pts);
await reset();await p.locator('#tl_sel').click();a=await sc([2,.612,.256]);z=await sc([2.5,.612,.756]);await drag(a,z);pts=await p.evaluate(()=>state.polys[0].pts);ok(Math.abs(pts[0].x-.5)<.11&&Math.abs(pts[1].x-4.5)<.11&&Math.abs(pts[0].y-.5)<.11&&pts[2].x===4,'辺の両端だけを自由な方向へ移動',pts);
await reset();await p.locator('#tl_sel_face').click();a=await sc([2,.61,.125]);await p.mouse.click(a.x,a.y);let sel0=await p.evaluate(()=>sel);ok(sel0?.e===0&&sel0?.f==='top','面選択ボタンで天端を選択',sel0);
await drag(a,{x:a.x,y:a.y-45});let h=await p.evaluate(()=>state.polys[0].edges[0].h);ok(h>600,'選択面を伸ばす',h);
const high=h;a=await sc([2,h/1000+.01,.125]);await drag(a,{x:a.x,y:a.y+25});h=await p.evaluate(()=>state.polys[0].edges[0].h);ok(h<high&&h>600,'選択面を引き込む',h);
await p.evaluate(()=>{state.polys[0].edges[0].h=1200;dirty3d=true;build3D();});
await p.waitForFunction(()=>{let ready=false;T.scene.traverse(o=>{const k=o.userData.pick;if(k?.p===0&&k.e===0&&k.f==='top'&&o.position.y>1.27)ready=true;});return ready;});
a=await sc([4,.95,.12]);await p.mouse.click(a.x,a.y);const end=await p.evaluate(()=>sel);ok(end?.e===0&&end?.f==='endB','高くして現れた小口も面として選択できる',end);
await p.screenshot({path:'.codex-finalizer/select-new-face.png'});
await drag(a,{x:a.x+35,y:a.y});pts=await p.evaluate(()=>state.polys[0].pts);ok(pts[1].x!==4&&pts[2].x!==4,'新しく現れた小口のドラッグで躯体を伸縮',pts);
await reset();await p.locator('#tl_rect').click();a=await sc([0,.625,0]);await drag({x:a.x-20,y:a.y-20},{x:a.x+20,y:a.y+20});let rs=await p.evaluate(()=>rsel);ok(rs.some(q=>q.i===0),'範囲選択で頂点を選べる',rs);
z=await sc([.5,.625,.5]);await drag(a,z);pts=await p.evaluate(()=>state.polys[0].pts);ok(Math.abs(pts[0].x-.5)<.11&&Math.abs(pts[0].y-.5)<.11,'選択範囲のドラッグが完成形に反映',pts);
await p.reload();await p.evaluate(()=>nnZMenuClose());pts=await p.evaluate(()=>state.polys[0].pts);ok(Math.abs(pts[0].x-.5)<.11,'保存して開き直しても移動を維持',pts);
await p.evaluate(()=>setTab('d3'));await p.waitForFunction(()=>T&&T.renderer);await reset();await p.evaluate(()=>{T.r=9;T.tx=2;T.tz=2;T.rev=(T.rev|0)+1;});await p.waitForFunction(()=>{const k=T.camera.position.toArray().join();window.__same=window.__last===k?(window.__same||0)+1:0;window.__last=k;return __same>3;});await p.locator('#tl_rect').click();
const corners=[];for(const q of [[0,.625,0],[4,.625,0],[4,.625,4],[0,.625,4]])corners.push(await sc(q));await drag({x:Math.min(...corners.map(q=>q.x))-15,y:Math.min(...corners.map(q=>q.y))-15},{x:Math.max(...corners.map(q=>q.x))+15,y:Math.max(...corners.map(q=>q.y))+15});
rs=await p.evaluate(()=>rsel);ok(rs.length===4,'範囲内の4頂点をまとめて選択',rs);z=await sc([.5,.625,.5]);await drag(corners[0],z);pts=await p.evaluate(()=>state.polys[0].pts);ok(pts.every((q,i)=>Math.abs(q.x-[.5,4.5,4.5,.5][i])<.11&&Math.abs(q.y-[.5,.5,4.5,4.5][i])<.11),'範囲選択した4頂点を同じ量だけ移動',pts);
ok(errs.length===0,'実行エラーなし',errs);await b.close();process.exitCode=bad?1:0;})().catch(e=>{console.error(e);process.exitCode=1;});
