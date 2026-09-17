/* 添付の幅350/550mmのずれを実クリックで再現し、閉じた完成形を測る。 */
const fs=require('fs'),path=require('path'),{chromium}=require('C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let bad=0;const ok=(c,n,v)=>{console.log((c?'○ ':'★NG ')+n+' '+JSON.stringify(v));if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{const p=await b.newPage({viewport:{width:1500,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('**/*',r=>{const u=new URL(r.request().url());let f=path.resolve(decodeURIComponent(u.pathname).slice(1));if(u.pathname==='/zumen_sekisan.html'&&process.argv[2])f=path.resolve(process.argv[2]);return u.hostname==='strip.test'&&f.startsWith(process.cwd()+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
await p.goto('https://strip.test/zumen_sekisan.html');await p.evaluate(()=>{nnZMenuClose();state.scaleM=1;state.polys=[{name:'屋根',pts:[{x:0,y:0},{x:16,y:0},{x:16,y:12},{x:0,y:12}],edges:Array.from({length:4},()=>({k:'para',h:600,w:250})),holes:[],lv:0}];state.d3sheet=[];state.active=0;setTab('d3');});await p.waitForFunction(()=>T&&T.renderer&&T.group.children.length>3);
await p.evaluate(()=>{d3ViewIso();nnRoofFold(true);T.theta=Math.PI/2;T.phi=1;T.tx=5.65;T.tz=.8;T.r=3.4;T.rev=(T.rev|0)+1;nnSheetStart({n:'増張り',col:'#514b44'},'draw');nnCond.close();});await p.waitForFunction(()=>{const k=T.camera.position.toArray().join();window.__stable=window.__last===k?(window.__stable||0)+1:0;window.__last=k;return __stable>4;});
const screen=async(w)=>p.evaluate(w=>{let v=new THREE.Vector3(...w).project(T.camera),r=T.renderer.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},w);
const P=[[5,.2,.256],[6.3,.24,.256],[6.34,.012,.256],[6.33,.012,.606],[5.03,.012,.806],[5.02,.012,.256]];
for(let i=0;i<P.length;i++){let q=await screen(P[i]);await p.mouse.click(q.x,q.y);ok(await p.evaluate(i=>nnD3DrawDbg()?.pts.length===i+1,i),'打点'+(i+1));}
await p.waitForFunction(()=>document.querySelectorAll('[data-sheet-angle]').length>0,null,{timeout:1500}).catch(()=>{});
const angles=await p.evaluate(()=>({values:[...document.querySelectorAll('[data-sheet-angle]')].map(e=>+e.dataset.sheetAngle),squares:document.querySelectorAll('[data-right-angle]').length}));ok(angles.squares>=8&&angles.values.every(v=>v===90),'各面の内側に90度と四角い直角記号',angles);
await p.screenshot({path:'.codex-finalizer/strip-preview.png'});
let q=await screen(P[0]);await p.mouse.click(q.x,q.y);await p.waitForFunction(()=>state.d3sheet.length===1);
const shape=await p.evaluate(()=>{let s=state.d3sheet[0];return s.faces.map(f=>{let W=f.pts.map(q=>new THREE.Vector3(...f.p).addScaledVector(new THREE.Vector3(...f.u),q[0]).addScaledVector(new THREE.Vector3(...f.v),q[1]));return {kind:f.id.k,vertices:W.map(w=>w.toArray())};});});
const floor=shape.find(f=>f.kind==='deck'),wall=shape.find(f=>f.kind==='wall');
function rectangle(f){if(!f||f.vertices.length!==4)return false;let P=f.vertices;return P.every((q,i)=>{let a=P[(i+3)%4].map((x,j)=>x-q[j]),b=P[(i+1)%4].map((x,j)=>x-q[j]);return Math.abs(a.reduce((s,x,j)=>s+x*b[j],0))<1e-6;});}
ok(rectangle(floor)&&rectangle(wall),'閉じた増張りは平場・立上りとも長方形',shape);
const widths=floor&&[...new Set(floor.vertices.map(q=>Math.round(q[2]*1000)))].sort((a,b)=>a-b);ok(widths?.length===2&&Math.abs(widths[1]-widths[0]-350)<3,'左右とも平場幅350mm、550mm側へ広がらない',widths);
await p.screenshot({path:'.codex-finalizer/strip-finished.png'});ok(errors.length===0,'実行エラーなし',errors);
}finally{await b.close();}process.exitCode=bad?1:0;})().catch(e=>{console.error(e);process.exitCode=1;});
