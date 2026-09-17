/* 始点の自由配置と、方眼に合う始点から閉じた完成形を実操作で検査。 */
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
  await click(2.37,1.63);
  const first=await p.evaluate(()=>drawPts[0]);
  ok(first&&first.x===2&&first.y===2,'1マス='+scale+'m：始点をマス目の交点に合わせる',first);
  for(const [x,y]of [[6.37,1.63],[6.37,5.63],[2.37,5.63],[2.37,1.63]])await click(x,y);
  const shape=await p.evaluate(()=>state.polys[0]?.pts);
  ok(shape?.length===4&&shape.every((q,i)=>Math.hypot(q.x-[2,6.37,6.37,2.37][i],q.y-[2,1.63,5.63,5.63][i])<.04),'方眼に合う始点で4辺を閉じた完成形',shape);
 }
 await p.reload();await p.evaluate(()=>nnZMenuClose());
 const saved=await p.evaluate(()=>state.polys[0]?.pts);
 ok(saved?.length===4&&saved[0].x===2&&saved[0].y===2,'開き直しても始点は方眼の交点',saved);
 const magnet=await p.evaluate(()=>{setTool('draw');state.polys=[{pts:[{x:2.37,y:1.63},{x:6,y:1},{x:6,y:6}],holes:[]}];drawPts=[];cellPx=55;return nnSnapPt(2.39,1.65);});
 ok(magnet.x===2&&magnet.y===2,'始点は既存の角より方眼を優先',magnet);
 await b.close();process.exitCode=bad?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
