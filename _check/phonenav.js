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
  await p.waitForFunction(()=>!document.getElementById('nav').style.minHeight&&document.getElementById('nav').getAnimations({subtree:true}).every(a=>a.playState==='finished'||a.effect.getTiming().iterations===Infinity));
  const v=await p.evaluate(()=>{
   const k=document.documentElement.clientWidth/screen.width;
   const nav=document.getElementById('nav'),r=nav.getBoundingClientRect();
   const rects=[...nav.querySelectorAll('.ic img')].map(i=>{const a=i.getBoundingClientRect();return {x:a.x/k,y:a.y/k,right:a.right/k,bottom:a.bottom/k,h:a.height/k};});
   const back=document.querySelector('header .nn-back img');
   const hits=[...nav.querySelectorAll('.ic img')].every(i=>{const a=i.getBoundingClientRect();return [[.15,.15],[.85,.15],[.15,.85],[.85,.85],[.5,.5]].every(([x,y])=>i.closest('.ni').contains(document.elementFromPoint(a.left+a.width*x,a.top+a.height*y)));});
   const cs=getComputedStyle(nav);
   return {bottom:r.bottom/k,top:r.top/k,h:r.height/k,icons:rects,hits,back:back?back.getBoundingClientRect().height/k:null,css:[cs.height,cs.minHeight,cs.paddingTop,cs.paddingBottom,cs.rowGap,cs.gridTemplateRows,cs.boxSizing,cs.borderTopWidth]};
  });
  ok(Math.abs(v.bottom-height)<3,name+' '+width+' 下端='+v.bottom.toFixed(1)+' 帯高='+v.h.toFixed(1));
  if(Math.abs(v.bottom-height)>=3)console.log(await p.evaluate(()=>({w:document.documentElement.clientWidth,vw:visualViewport.width,h:document.documentElement.clientHeight,vh:visualViewport.height,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+2&&getComputedStyle(e).position!=='fixed').slice(0,12).map(e=>[e.tagName,e.id,e.className,e.getBoundingClientRect().right])})));
  ok(v.h<=(portrait?116:75)&&v.icons.every(i=>i.h>=41&&i.h<=45&&i.y>=v.top-1&&i.bottom<=height-(portrait?20:bar)+1&&i.x>=-1&&i.right<=width+1),name+' '+width+' 見本の帯高・42px画像・下端余白');
  if(v.h>(portrait?116:75))console.log(v.css);
  if(portrait){const lower=v.icons.slice(5);ok(Math.abs((lower[0].x+lower[3].right)/2-width/2)<2,name+' 下段4個の中央配置');ok(v.back===null||v.back<=31,name+' 戻る画像30px');}
  if(name==='genba_map_v36'){
   ok(v.hits,name+' 全9画像の四隅と中央が実際に押せる');
   await p.evaluate(()=>{const orig=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){const r=orig.call(this);if(this.id==='nnBtmProbe')return {...r.toJSON(),top:r.top-59,bottom:r.bottom-59};return r;};nnFillBottom(true);});
   const fixed=await p.evaluate(()=>{const n=document.getElementById('nav'),r=n.getBoundingClientRect();return {pos:getComputedStyle(n).position,bottom:r.bottom,hits:[...n.querySelectorAll('.ni')].every(i=>{const q=i.querySelector('img').getBoundingClientRect();return i.contains(document.elementFromPoint(q.left+q.width/2,q.bottom-2));})};});
   ok(fixed.pos!=='fixed'&&Math.abs(fixed.bottom-height)<3&&fixed.hits,'現場マップ：fixed下端が59pxずれても下段まで押せる '+JSON.stringify(fixed));
   if(process.env.MAP_DEEP){
    await p.evaluate(()=>document.getElementById('setup').style.display='none');
    for(const vp of [{width:height,height:width},{width,height}]){
     await p.setViewportSize(vp);
     await p.evaluate(()=>nnFillBottom(true));
     await p.waitForFunction(h=>Math.abs(document.getElementById('nav').getBoundingClientRect().bottom-h)<3,vp.height);
     const full=await p.evaluate(()=>{const n=document.getElementById('nav'),a=document.getElementById('app');return {appBottom:a.getBoundingClientRect().bottom,navTop:n.getBoundingClientRect().top,hits:[...n.querySelectorAll('.ic img')].every(i=>{const r=i.getBoundingClientRect();return i.closest('.ni').contains(document.elementFromPoint(r.left+r.width/2,r.bottom-2));})};});
     ok(Math.abs(full.appBottom-full.navTop)<3&&full.hits,'現場マップ：入力画面を閉じ回転 '+vp.width+' 全画像が押せ、地図と重ならない');
    }
    const dest=['camera','library','zumen_sekisan','shiyo_toroku'];
    for(let i=0;i<4;i++){
     await p.goto('https://nn.test/genba_map_v36.html');
     await p.waitForFunction(()=>document.querySelectorAll('#nav .ic img').length===9&&[...document.querySelectorAll('#nav .ic img')].every(i=>i.complete&&i.naturalWidth));
     await p.locator('#nav .ni').nth(5+i).tap();
     await p.waitForURL('**/'+dest[i]+'.html');
     ok(new URL(p.url()).pathname==='/'+dest[i]+'.html','現場マップ下段タップ → '+dest[i]);
    }
   }
  }
  if(process.env.SHOTS&&['index','genba_map_v36'].includes(name))await p.screenshot({path:path.join(process.env.SHOTS,name+'-'+width+'.png')});
  await p.close();
 }
 await ctx.close();
 }
 await browser.close();process.exitCode=ng?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});

