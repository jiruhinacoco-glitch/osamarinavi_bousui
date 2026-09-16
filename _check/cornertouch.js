/* スマホ照準の予告から指を離して確定する規格増張り。 */
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{let bad=0;const ok=(c,n,v)=>{console.log((c?'○ ':'★NG ')+n+' '+JSON.stringify(v));if(!c)bad++;};const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:393,height:852},screen:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',serviceWorkers:'block'});
await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(decodeURIComponent(u.pathname).slice(1));return u.hostname==='touch.test'&&f.startsWith(process.cwd()+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
await p.goto('https://touch.test/zumen_sekisan.html');await p.evaluate(()=>{nnZMenuClose();state.scaleM=1;state.polys=[{pts:[{x:0,y:0},{x:8,y:0},{x:8,y:8},{x:0,y:8}],edges:Array.from({length:4},()=>({k:'para',h:600,w:250})),holes:[],lv:0}];state.active=0;state.d3sheet=[];setTab('d3');});await p.waitForFunction(()=>T&&T.renderer&&T.renderer.domElement._nnFaceDrag);
await p.evaluate(()=>{d3ViewIso();nnRoofFold(true);T.theta=Math.PI*.25;T.phi=1.15;T.tx=.5;T.tz=.5;T.r=3;T.rev=(T.rev|0)+1;nnSheetStart({n:'タッチ検査',col:'#ef7d32'},'corner');Object.assign(nnSheetMode,{w:500,h:500,d:250,z:250,followHeight:true});nnCond.close();});
await p.waitForFunction(()=>{const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z].map(x=>x.toFixed(4)).join();window.__stable=window.__cam===k?(window.__stable||0)+1:0;window.__cam=k;return __stable>5;});
const tap=await p.evaluate(()=>{const q=new THREE.Vector3(.256,.262,.45).project(T.camera),r=T.renderer.domElement.getBoundingClientRect();return nnD3AimFinger(r.left+(q.x+1)*r.width/2,r.top+(1-q.y)*r.height/2);});
await p.touchscreen.tap(tap.x,tap.y);
const state1=await p.evaluate(()=>({n:state.d3sheet.length,part:state.d3sheet[0]?.part,usage:state.d3sheet[0]&&nnSheetCornerUsage(state.d3sheet[0])}));
ok(state1.n===1&&state1.part?.h===500&&Math.abs(state1.part?.z-250)<15&&Math.abs(state1.usage?.material-.25)<1e-6,'照準位置で設置・500角を保持',state1);
await p.screenshot({path:'.codex-finalizer/corner-phone.png'});
await p.evaluate(()=>nnCond.open('sheet'));
const fit=await p.evaluate(()=>{const box=document.getElementById('nnCondBox').getBoundingClientRect();return [...document.querySelectorAll('.shpart input,.shpart button')].filter(e=>e.getBoundingClientRect().width>0).every(e=>{const r=e.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right;});});ok(fit,'設置後の寸法・高さ・移動ボタンがスマホの小窓に収まる');
await p.screenshot({path:'.codex-finalizer/corner-phone-panel.png'});await b.close();process.exitCode=bad?1:0;})().catch(e=>{console.error(e);process.exitCode=1;});
