const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let bad=0;function ok(c,m,v){console.log((c?'○ ':'★NG ')+m+' '+JSON.stringify(v));if(!c)bad++;}
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const mobile=!!process.env.SHEET_MOBILE;
const p=await b.newPage(mobile?{viewport:{width:420,height:900},isMobile:true,hasTouch:true}:{viewport:{width:1500,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
if(mobile)await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
await p.route('**/*',r=>{const u=new URL(r.request().url());let f=path.resolve(decodeURIComponent(u.pathname).slice(1));if(u.pathname==='/zumen_sekisan.html'&&process.argv[2])f=path.resolve(process.argv[2]);return u.hostname==='sheet.test'&&f.startsWith(process.cwd()+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
await p.goto('https://sheet.test/zumen_sekisan.html');await p.evaluate(()=>{nnZMenuClose();state.scaleM=1;state.polys=[{pts:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],edges:Array.from({length:4},()=>({k:'para',h:600,w:400})),holes:[],lv:0}];state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0;setTab('d3');});
await p.waitForFunction(()=>typeof THREE!=='undefined'&&T&&T.group&&T.group.children.length>3);
await p.evaluate(()=>{d3ViewIso();T.theta=Math.PI*.25;T.phi=1.15;T.tx=1.1;T.tz=1.1;T.r=3;T.rev=(T.rev|0)+1;nnCond.open('sheet');});
let labels=await p.locator('[data-part]').allTextContents();ok(labels.includes('300×300')&&!labels.some(t=>/出入隅|ドレン/.test(t)),'寸法だけの選択肢',labels);
if(!labels.includes('300×300')){await b.close();process.exitCode=1;return;}
await p.locator('[data-part="0"]').click();await p.evaluate(()=>nnCond.close());
await p.waitForFunction(()=>{const k=T.camera.position.toArray().map(x=>x.toFixed(5)).join();window.__stable=window.__cam===k?(window.__stable||0)+1:0;window.__cam=k;return __stable>5;});
// 独立に面積と実寸を測り、実メッシュの平場・立上り・天端・折返しを検算。
const results=await p.evaluate(()=>{
 const V=q=>new THREE.Vector3(...q),area=F=>F.reduce((sum,f)=>sum+Math.abs(f.pts.reduce((s,q,i)=>{const r=f.pts[(i+1)%f.pts.length];return s+q[0]*r[1]-r[0]*q[1];},0))/2,0);
 function sample(name,point,n){const f=nnSheetSizeFaces({point:V(point),n:V(n)},300,300,0);return {name,area:area(f),count:f.length,normals:[...new Set(f.map(f=>f.n.map(v=>v.toFixed(2)).join()))]};}
 return [sample('平場',[1,.012,1],[0,1,0]),sample('立上り',[1,.3,.4],[0,0,1]),sample('天端',[1,.6,.2],[0,1,0]),sample('壁から天端',[1,.55,.4],[0,0,1]),sample('入隅の左右壁',[.45,.3,.4],[0,0,1])];
});results.forEach(r=>ok(Math.abs(r.area-.09)<.0001&&(r.name==='壁から天端'||r.name==='入隅の左右壁'?r.normals.length>=2:true),r.name+' 300×300＝0.09㎡',r));
const point=async(x,y,z)=>p.evaluate(([x,y,z])=>{const q=new THREE.Vector3(x,y,z).project(T.camera),r=T.renderer.domElement.getBoundingClientRect();return {x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2};},[x,y,z]);
let a=await point(.9,.32,.4),c=await point(1.4,.32,.4);
await p.mouse.click(a.x,a.y);let before=await p.evaluate(()=>({count:state.d3sheet.length,ghost:T.scene.getObjectByName('nnSheetCornerPreview').children.length}));
ok(before.count===0&&before.ghost>0,'クリックはプレビューのみ',before);
if(mobile){const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:c.x,y:c.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
else{await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(c.x,c.y,{steps:5});await p.mouse.up();}
const preview=await p.evaluate(()=>{const g=T.scene.getObjectByName('nnSheetCornerPreview');return {count:state.d3sheet.length,box:new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()).toArray(),camera:[T.theta,T.phi]};});
ok(preview.count===0&&Math.abs(preview.box[0]-1.4)<.03,'ドラッグで予告だけ移動',preview);
fs.mkdirSync('.codex-finalizer',{recursive:true});await p.screenshot({path:'.codex-finalizer/sheetsize-'+(mobile?'mobile':'preview')+'.png'});
await p.locator('[data-size-commit]').click();let saved=await p.evaluate(()=>({count:state.d3sheet.length,sheet:state.d3sheet[0],mode:nnSheetMode,ghost:T.scene.getObjectByName('nnSheetCornerPreview').children.length}));
ok(saved.count===1&&saved.mode===null&&saved.ghost===0&&saved.sheet.part.w===300&&saved.sheet.part.d===300,'確定で1枚設置・予告を解除',saved.sheet?.part);
await p.evaluate(()=>saveState());await p.reload();await p.waitForFunction(()=>typeof state!=='undefined');ok(await p.evaluate(()=>state.d3sheet?.[0]?.part?.w===300),'保存・再読込で寸法を保持');
await p.evaluate(()=>{nnZMenuClose();setTab('d3');nnStamp('tatedrain100');nnPlaceAtGrid(2,2);dirty3d=true;build3D();});
await p.waitForFunction(()=>T&&T.scene&&T.group&&T.group.children.length>3);
const drain=await p.evaluate(()=>{
 T.scene.updateMatrixWorld(true);const rc=new THREE.Raycaster(new THREE.Vector3(2.09,3,2),new THREE.Vector3(0,-1,0));
 const hit=nnD3FaceHit(rc);if(!hit)return null;
 const f=nnSheetSizeFaces(hit,300,300,0);return {y:hit.point.y,faces:f.length,area:f.reduce((s,f)=>s+f.am,0),object:hit.o.name,actual:f.some(f=>f.id.pi>=100000)};
});ok(drain&&drain.actual&&drain.faces>0&&drain.area>0&&drain.area<=.09001,'ドレン実面に貼付可能・材料面積を超えない',drain);
const part=await p.evaluate(()=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.6,.6,.6),new THREE.MeshBasicMaterial());mesh.position.set(2,.3,1);T.group.add(mesh);mesh.updateMatrixWorld(true);nnRegisterPaintHit({object:mesh});
 const f=nnSheetSizeFaces({point:new THREE.Vector3(2,.6,1),n:new THREE.Vector3(0,1,0),o:mesh},300,300,0);return {area:f.reduce((s,f)=>s+f.am,0),actual:f.every(f=>f.id.pi>=100000)};
});ok(part.actual&&Math.abs(part.area-.09)<.00001,'役物の天面にも300×300で貼付',part);
await p.evaluate(()=>{nnSheetStart({n:'検査材',col:'#514b44'},'size');nnSheetSizeRefresh({point:new THREE.Vector3(1,.3,.4),n:new THREE.Vector3(0,0,1)});});
const count=await p.evaluate(()=>state.d3sheet.length);await p.keyboard.press('Escape');ok(await p.evaluate(n=>state.d3sheet.length===n&&!nnSheetMode&&document.getElementById('nnSheetSizeBar').style.display==='none',count),'Escで予告を破棄・枚数不変');
ok(errors.length===0,'実行エラーなし',errors);
await b.close();process.exitCode=bad?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
