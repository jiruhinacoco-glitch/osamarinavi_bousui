/* 検査：発注「発注作成」の現場カードの工法イラストが、絵の比率のまま（切り抜き・縦長なし）で十分な大きさ（2026-09-26k）
   使い方：node _check/gkou.js [hacchu.html]   ※直す前の版では★NG（28px角に切り抜いていた）
   ・PC／スマホとも：表示の横÷縦 と 絵の横÷縦 の差が3%以内、高さ40px以上、見えるカードのすべて */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'hacchu.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m);if(!c)ng++;};
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for(const [name,w,h,mob] of [['PC',1280,800,false],['スマホ',393,852,true]]){
  const ctx=await browser.newContext({viewport:{width:w,height:h},screen:{width:w,height:h},isMobile:mob,hasTouch:mob,serviceWorkers:'block',userAgent:mob?UA:undefined});
  if(mob)await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await ctx.route('**/*',async route=>{
   const url=new URL(route.request().url()); if(url.hostname!=='nn.test')return route.abort();
   const file=path.resolve(decodeURIComponent(url.pathname).slice(1)||'index.html');
   if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const ext=path.extname(file),types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};
   return route.fulfill({body:fs.readFileSync(file),contentType:types[ext]||'application/octet-stream'});
  });
  const p=await ctx.newPage(); await p.goto('https://nn.test/'+FILE);
  await p.waitForFunction(()=>{const a=[...document.querySelectorAll('.grow .gkou')];return a.length>2&&a.every(i=>i.complete&&i.naturalWidth);},null,{timeout:15000}).catch(()=>{});
  const r=await p.evaluate(()=>[...document.querySelectorAll('.grow .gkou')].map(i=>{const b=i.getBoundingClientRect();return {w:b.width-2,h:b.height-2,nw:i.naturalWidth,nh:i.naturalHeight,fit:getComputedStyle(i).objectFit};}));
  ok(r.length>2,name+'：イラストを測れた '+r.length+'枚');
  const bad=r.filter(x=>!x.nw||Math.abs((x.w/x.h)/(x.nw/x.nh)-1)>0.03);
  ok(bad.length===0,name+'：絵の比率のまま（切り抜き・つぶれなし） '+JSON.stringify(bad.slice(0,2)));
  const small=r.filter(x=>x.h+2<40);
  ok(small.length===0,name+'：高さ40px以上 '+JSON.stringify(small.slice(0,2).map(x=>x.h+2)));
  await ctx.close();
 }
 console.log(ng?('★NG '+ng+'件'):'すべて○');
 await browser.close(); process.exit(ng?1:0);
})();
