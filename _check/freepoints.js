/* 任意角度の打点と、閉合・保存後の完成座標を実操作で検査。 */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
let bad=0;const ok=(c,m,v)=>{console.log((c?'○ ':'★NG ')+m+' '+JSON.stringify(v));if(!c)bad++;};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME_PATH});
 const p=await b.newPage({viewport:{width:1500,height:1000},serviceWorkers:'block'});
 await p.route('**/*',r=>{const u=new URL(r.request().url()),f=path.resolve(decodeURIComponent(u.pathname).slice(1));return u.hostname==='draw.test'&&f.startsWith(process.cwd()+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
 await p.goto('https://draw.test/zumen_sekisan.html');
 await p.evaluate(()=>nnZMenuClose());
 await p.evaluate(()=>document.fonts.ready);
 await p.waitForFunction(()=>document.getAnimations().every(a=>a.playState==='finished'||a.effect.getTiming().iterations===Infinity));
 const click=async(x,y)=>{const pt=await p.evaluate(([x,y])=>{const r=cv.getBoundingClientRect();return {x:r.left+(ox+x*cellPx)*r.width/(cv.width/devicePixelRatio),y:r.top+(oy+y*cellPx)*r.height/(cv.height/devicePixelRatio)};},[x,y]);await p.mouse.click(pt.x,pt.y);};
 for(const scale of [1,.25,5]){
  await p.evaluate(scale=>{state.polys=[];state.parts=[];state.active=-1;state.scaleM=scale;drawPts=[];cellPx=55;ox=30;oy=190;setTab('zu');setTool('draw');draw();},scale);
  await click(3.37,1.63);
  const first=await p.evaluate(()=>drawPts[0]);
  ok(first&&Math.abs(first.x-3.37)<.03&&Math.abs(first.y-1.63)<.03,'1マス='+scale+'m：始点をクリック位置に置く',first);
  for(const [x,y]of [[1.89,5.77],[7.41,6.13],[8.03,2.27],[3.37,1.63]])await click(x,y);
  const shape=await p.evaluate(()=>state.polys[0]?.pts);
  ok(shape?.length===4&&shape.every((q,i)=>Math.hypot(q.x-[3.37,1.89,7.41,8.03][i],q.y-[1.63,5.77,6.13,2.27][i])<.04),'任意角度の4辺を閉じた完成形',shape);
 }
 await p.reload();await p.evaluate(()=>nnZMenuClose());
 const saved=await p.evaluate(()=>state.polys[0]?.pts);
 ok(saved?.length===4&&saved.every((q,i)=>Math.hypot(q.x-[3.37,1.89,7.41,8.03][i],q.y-[1.63,5.77,6.13,2.27][i])<.04),'開き直しても全頂点が狙った位置を維持',saved);
 const assist=await p.evaluate(()=>{setTool('draw');state.polys=[];drawPts=[{x:1.23,y:1.67}];mouse.shift=true;const shifted=nnSnapPt(5.36,1.86);mouse.shift=false;const free=nnSnapPt(5.36,1.86);tool='hole';const hole=nnSnapPt(5.36,1.86);tool='draw';drawPts=[{x:1.23,y:1.67},{x:5,y:5}];const nearAxis=nnSnapPt(1.3,7.13);return {shifted,free,hole,nearAxis};});
 ok(assist.shifted.y===1.67&&assist.free.x===5.36&&assist.free.y===1.86,'Shiftのみ水平補助、離すと自由打点',assist);
 ok(assist.hole.x===5.36&&assist.hole.y===1.86&&assist.nearAxis.x===1.3&&assist.nearAxis.y===7.13,'中抜きも自由打点・近い縦横線へ勝手に寄せない',assist);
 const magnet=await p.evaluate(()=>{setTool('draw');state.polys=[{pts:[{x:2.37,y:1.63},{x:6,y:1},{x:6,y:6}],holes:[]}];drawPts=[];cellPx=55;return nnSnapPt(2.39,1.65);});
 ok(magnet.x===2.37&&magnet.y===1.63,'既存の角へ合わせる操作は維持',magnet);
 await b.close();process.exitCode=bad?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
