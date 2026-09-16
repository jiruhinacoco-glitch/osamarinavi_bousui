/* 規格材料の完成寸法・材料収支・プレビューから設置・保存後の復元。 */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let bad=0;const ok=(c,n,v)=>{console.log((c?'○ ':'★NG ')+n+' '+JSON.stringify(v));if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1500,height:1000}}),errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*',r=>{const u=new URL(r.request().url());let f=path.resolve(decodeURIComponent(u.pathname).slice(1));if(u.pathname==='/zumen_sekisan.html'&&process.argv[2])f=path.resolve(process.argv[2]);return u.hostname==='corner.test'&&f.startsWith(process.cwd()+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
await p.goto('https://corner.test/zumen_sekisan.html');await p.evaluate(()=>{nnZMenuClose();setTab('d3');});await p.waitForFunction(()=>window.THREE&&window.nnCornerPartTest);
const matrix=await p.evaluate(()=>{
const out=[];for(const angle of [90,20,270])for(const reverse of [false,true])for(const top of [100,250,400]){
const a=angle*Math.PI/180;let pts=angle===270?[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}]:[{x:0,y:0},{x:10,y:0},{x:10*Math.cos(a),y:10*Math.sin(a)}];const target=pts[angle===270?3:0];if(reverse)pts.reverse();const i=pts.indexOf(target);
state.scaleM=1;state.polys=[{pts,edges:pts.map(()=>({k:'para',h:600,w:250})),holes:[],lv:0}];state.d3sheet=[];state.active=0;
const r=nnCornerPartTest(0,0,i,500,250,4,500,top),F=r.faces||[];
const walls=F.filter(f=>f.id?.k==='wall').map(f=>{const W=f.pts.map(q=>f.p.map((v,k)=>v+f.u[k]*q[0]+f.v[k]*q[1]));return {height:Math.max(...W.map(q=>q[1]))-Math.min(...W.map(q=>q[1])),width:Math.max(...W.flatMap(q=>W.map(v=>Math.hypot(q[0]-v[0],q[2]-v[2]))))};});
const area=F.reduce((sum,f)=>sum+Math.abs(f.pts.reduce((v,q,j)=>{const n=f.pts[(j+1)%f.pts.length];return v+q[0]*n[1]-n[0]*q[1];},0))/2,0);
out.push({angle,reverse,top,walls,kinds:F.map(f=>f.id?.k),area,usage:r.usage});}return out;});
for(const r of matrix){const expectedApplied=r.angle===20?.5*r.top/1000+.25*.25*Math.tan(Math.PI/9):.25;
const expectedOverlap=r.angle===20?.25*.25*Math.tan(Math.PI/18):r.angle===90?Math.min(.25,(500-r.top)/1000)**2:0;
ok(r.usage&&Math.abs(r.usage.applied-expectedApplied)<1e-7&&Math.abs(r.usage.overlap-expectedOverlap)<1e-7,'独立計算：'+r.angle+'度・上端'+r.top,{expectedApplied,expectedOverlap,usage:r.usage});
ok(r.walls.length===2&&r.walls.every(w=>Math.abs(w.width-.25)<1e-6&&Math.abs(w.height-r.top/1000)<1e-6)&&r.kinds.every(k=>k==='deck'||k==='wall')&&r.usage&&Math.abs(r.usage.material-.25)<1e-7&&Math.abs(r.area-r.usage.applied)<1e-7&&Math.abs(r.usage.coverage+r.usage.overlap+r.usage.offcut-.25)<1e-6,`${r.angle}度／逆順${r.reverse}／上端${r.top}mm：材料寸法・天端なし・収支`,r);}
if(process.env.GEOMETRY_ONLY){await b.close();process.exitCode=bad?1:0;return;}
const opening=await p.evaluate(()=>{const pts=[{x:0,y:0},{x:8,y:0},{x:8,y:8},{x:0,y:8}],hole=[{x:.3,y:.3},{x:.4,y:.3},{x:.4,y:.4},{x:.3,y:.4}];state.polys=[{pts,edges:pts.map(()=>({k:'para',h:600,w:250})),holes:[{pts:hole,edges:hole.map(()=>({h:0}))}],lv:0}];return nnCornerPartTest(0,0,0,500,250,4,500,250).usage;});
ok(opening&&Math.abs(opening.coverage-.1775)<1e-6&&Math.abs(opening.offcut-.02)<1e-6,'中抜き100mm角には貼らず、2枚分の切落としを計上',opening);

await p.evaluate(()=>{state.polys=[{pts:[{x:0,y:0},{x:8,y:0},{x:8,y:8},{x:0,y:8}],edges:Array.from({length:4},()=>({k:'para',h:600,w:250})),holes:[],lv:0}];state.d3sheet=[];state.active=0;dirty3d=true;build3D();nnSheetStart({n:'検査材',col:'#ef7d32'},'corner');nnCond.open('sheet');});
await p.locator('[data-part="2"]').click();
ok(await p.evaluate(()=>nnSheetCornerPreviewCount()>0),'規格選択直後に半透明表示');
await p.locator('[data-sh="z"]').fill('100');await p.locator('[data-sh="z"]').dispatchEvent('change');
const fixed=await p.evaluate(()=>({h:nnSheetMode.h,z:nnSheetMode.z,follow:nnSheetMode.followHeight,count:nnSheetCornerPreviewCount()}));ok(fixed.h===500&&fixed.z===100&&!fixed.follow&&fixed.count>0,'数値で100mmへ配置・材料500mmを維持',fixed);
await p.evaluate(()=>{nnCond.close();d3ViewIso();T.theta=Math.PI*.25;T.phi=1.15;T.tx=.5;T.tz=.5;T.r=3;T.rev=(T.rev|0)+1;});
await p.waitForFunction(()=>{const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z].map(x=>x.toFixed(4)).join();window.__stable=window.__cam===k?(window.__stable||0)+1:0;window.__cam=k;return __stable>5;});
const aim=await p.evaluate(()=>{const q=new THREE.Vector3(.256,.3,.43).project(T.camera),r=T.renderer.domElement.getBoundingClientRect();return {x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2};});
await p.mouse.move(aim.x,aim.y);await p.mouse.click(aim.x,aim.y);
const placed=await p.evaluate(()=>({n:state.d3sheet.length,part:state.d3sheet[0]?.part,usage:state.d3sheet[0]&&nnSheetCornerUsage(state.d3sheet[0])}));ok(placed.n===1&&placed.part.z===100&&placed.part.h===500,'実クリックで予告と同じ100mm位置へ設置',placed);
await p.evaluate(()=>{nnSheetPartResize(0,500,250,500,400);saveState();});
await p.evaluate(()=>{T.rev=(T.rev|0)+1;});await p.waitForFunction(()=>T.group.children.filter(o=>o.name==='nnSheet').length===4);
await p.screenshot({path:'.codex-finalizer/corner-placed.png'});
await p.reload();await p.evaluate(()=>{nnZMenuClose();setTab('d3');});await p.waitForFunction(()=>window.THREE&&window.nnCornerPartTest);
const saved=await p.evaluate(()=>({part:state.d3sheet[0]?.part,usage:state.d3sheet[0]&&nnSheetCornerUsage(state.d3sheet[0])}));ok(saved.part?.z===400&&saved.part?.h===500&&Math.abs(saved.usage?.material-.25)<1e-7,'400mmへ変更して保存・再読み込み',saved);
await p.evaluate(()=>{nnSheetPartMoveOn(0);nnCond.close();d3ViewIso();T.theta=Math.PI*.25;T.phi=1.15;T.tx=.5;T.tz=.5;T.r=3;T.rev=(T.rev|0)+1;});
await p.waitForFunction(()=>{const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z].map(x=>x.toFixed(4)).join();window.__stable=window.__cam===k?(window.__stable||0)+1:0;window.__cam=k;return __stable>5;});
const moving=await p.evaluate(()=>{const q=new THREE.Vector3(.256,.162,.45).project(T.camera),r=T.renderer.domElement.getBoundingClientRect();return {x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2};});
await p.mouse.move(moving.x,moving.y);const ghost=await p.evaluate(()=>({z:nnSheetMode.previewHeight,n:nnSheetCornerPreviewCount()}));
await p.mouse.click(moving.x,moving.y);const moved=await p.evaluate(()=>({n:state.d3sheet.length,z:state.d3sheet[0].part.z,h:state.d3sheet[0].part.h}));
ok(ghost.n>0&&Math.abs(ghost.z-150)<8&&moved.n===1&&moved.z===ghost.z&&moved.h===500,'位置を合わせる：マウス追従とクリック設置が一致・材料を維持',{ghost,moved});
ok(errs.length===0,'実行エラーなし',errs);await b.close();process.exitCode=bad?1:0;})().catch(e=>{console.error(e);process.exitCode=1;});
