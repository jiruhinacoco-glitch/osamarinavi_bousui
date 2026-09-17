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

await reset();await p.waitForFunction(()=>document.getElementById('nnQuickPad'));await p.waitForFunction(()=>document.querySelectorAll('.nn-tool-grip').length===5,null,{timeout:1800}).catch(()=>{});
const count=await p.locator('.nn-tool-grip').count();ok(count===5,'指定5か所につかんで移動するつまみ',count);
if(count===5){const camera=await p.evaluate(()=>[T.tx,T.tz,T.r,T.theta,T.phi]);let expected={};
for(const [i,id]of ['nnCondBar','nnSkyBar','nnAxisGiz','d3pad','nnQuickPad'].entries()){
 const handle=p.locator('[data-move-tool="'+id+'"]');await handle.waitFor({state:'visible'});await p.waitForFunction(id=>{let h=document.querySelector('[data-move-tool="'+id+'"]').getBoundingClientRect(),r=document.getElementById(id).getBoundingClientRect();return Math.abs(h.bottom-r.top)<2;},id);const h=await handle.boundingBox(),r=await p.locator('#'+id).boundingBox(),dx=i<2||i===4?180:-170,dy=i===4?-130:100;
 await p.mouse.move(h.x+14,h.y+8);await p.mouse.down();await p.mouse.move(h.x+14+dx,h.y+8+dy,{steps:8});await p.mouse.up();let q=await p.locator('#'+id).boundingBox();ok(Math.abs(q.x-r.x-dx)<3&&Math.abs(q.y-r.y-dy)<3,id+'を指定距離だけ移動',{from:r,to:q});expected[id]={x:q.x,y:q.y};
}
ok(JSON.stringify(camera)===JSON.stringify(await p.evaluate(()=>[T.tx,T.tz,T.r,T.theta,T.phi])),'配置のドラッグでは図面の視点を動かさない');
await p.locator('#nnSkyBar [data-sky]').last().click();ok(await p.locator('#nnSkyBar [data-sky]').last().evaluate(e=>e.classList.contains('on')),'移動後も光ボタンをクリックできる');
await p.screenshot({path:'.codex-finalizer/floating433.png'});await p.reload();await p.evaluate(()=>{nnZMenuClose();setTab('d3');});await p.waitForFunction(()=>document.querySelectorAll('.nn-tool-grip').length===5);for(const id of Object.keys(expected)){await p.waitForFunction(id=>document.getElementById(id).offsetWidth>0,id);const q=await p.locator('#'+id).boundingBox();ok(Math.abs(q.x-expected[id].x)<3&&Math.abs(q.y-expected[id].y)<3,id+'の配置を開き直しても保持',q);}
await p.setViewportSize({width:1000,height:800});await p.waitForFunction(()=>{let w=document.getElementById('three-wrap').getBoundingClientRect();return ['nnCondBar','nnSkyBar','nnAxisGiz','d3pad','nnQuickPad'].every(id=>{let r=document.getElementById(id).getBoundingClientRect();return r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1;});});ok(true,'画面を狭めても5か所が画面内に収まる');}
ok(errs.length===0,'実行エラーなし',errs);await b.close();process.exitCode=bad?1:0;})().catch(e=>{console.error(e);process.exitCode=1;});
