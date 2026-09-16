/* 実表示を測る。ローカルサーバー不要。PLAYWRIGHT_MODULE / CHROME_PATHで実行環境を指定。 */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const pages=(process.env.PAGES||'index,camera,hacchu,kirokucho_demo,kokkosho,genba_map_v36,zumen_sekisan,library,shiyo_toroku,yougo,zairyo_toroku').split(',');
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m);if(!c)ng++;};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});
 for(const [width,height] of [[393,852],[852,393]]){
 const portrait=width<height,bar=portrait?34:21;
 const ctx=await browser.newContext({viewport:{width,height},screen:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
 await ctx.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));
 await ctx.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='nn.test')return route.abort();
  const file=path.resolve(decodeURIComponent(url.pathname).slice(1)||'index.html');
  if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  const ext=path.extname(file),types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};
  let body=fs.readFileSync(file);
  if(ext==='.css'||ext==='.html')body=body.toString().replace(/env\(safe-area-inset-(top|bottom|left|right)(?:,\s*0px)?\)/g,(_,side)=>(side==='bottom'?bar:side==='top'?(portrait?47:0):(portrait?0:59))+'px');
  return route.fulfill({body,contentType:types[ext]||'application/octet-stream'});
 });
 for(const name of pages){
  const p=await ctx.newPage();await p.goto('https://nn.test/'+name+'.html');
  await p.waitForFunction(()=>document.querySelectorAll('#nav .ic img').length===9&&[...document.querySelectorAll('#nav .ic img')].every(i=>i.complete&&i.naturalWidth));
  await p.evaluate(()=>{if(window.nnFillBottom)nnFillBottom(true);});
  await p.waitForFunction(()=>document.getElementById('nav').getAnimations({subtree:true}).every(a=>a.playState==='finished'||a.effect.getTiming().iterations===Infinity));
  const v=await p.evaluate(()=>{
   const k=document.documentElement.clientWidth/screen.width;
   const nav=document.getElementById('nav'),r=nav.getBoundingClientRect();
   const rects=[...nav.querySelectorAll('.ic img')].map(i=>{const a=i.getBoundingClientRect();return {x:a.x/k,y:a.y/k,right:a.right/k,bottom:a.bottom/k,h:a.height/k};});
   return {bottom:r.bottom/k,top:r.top/k,h:r.height/k,icons:rects,bodyPad:getComputedStyle(document.body).paddingBottom};
  });
  ok(Math.abs(v.bottom-height)<3,name+' '+width+' 下端='+v.bottom.toFixed(1)+' 帯高='+v.h.toFixed(1));
  if(Math.abs(v.bottom-height)>=3)console.log(await p.evaluate(()=>({w:document.documentElement.clientWidth,vw:visualViewport.width,h:document.documentElement.clientHeight,vh:visualViewport.height,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+2&&getComputedStyle(e).position!=='fixed').slice(0,12).map(e=>[e.tagName,e.id,e.className,e.getBoundingClientRect().right])})));
  ok(v.h<=(portrait?140:85)&&v.icons.every(i=>i.h<=43&&i.y>=v.top-1&&i.bottom<=height-bar+1&&i.x>=-1&&i.right<=width+1),name+' '+width+' 帯・アイコン寸法と安全領域');
  if(process.env.SHOTS&&name==='index')await p.screenshot({path:path.join(process.env.SHOTS,'nav-'+width+'.png')});
  await p.close();
 }
 await ctx.close();
 }
 await browser.close();process.exitCode=ng?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});

