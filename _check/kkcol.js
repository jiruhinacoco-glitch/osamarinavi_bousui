/* 検査：国交省仕様（スマホ表示・縦）の一覧で、行ごとに列の位置がズレない（2026-09-26h）
   使い方：node _check/kkcol.js [kokkosho.html]   ※直す前の版では★NG（行ごとに列幅が変わっていた）
   ・全行で「工法の絵」の左端が同じ・「表」の右端が同じ・見出し「工法」の左端が絵の左端と同じ
   ・1段目の3つのます（記号・工法・表）の上の線が同じ高さ */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kokkosho.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m);if(!c)ng++;};
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await browser.newContext({viewport:{width:393,height:852},screen:{width:393,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:UA});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
 await ctx.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='nn.test')return route.abort();
  const file=path.resolve(decodeURIComponent(url.pathname).slice(1)||'index.html');
  if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  const ext=path.extname(file),types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};
  return route.fulfill({body:fs.readFileSync(file),contentType:types[ext]||'application/octet-stream'});
 });
 const p=await ctx.newPage();
 await p.goto('https://nn.test/'+FILE);
 await p.waitForFunction(()=>document.querySelectorAll('table.sp-tbl tbody tr:not(.gr)').length>5,null,{timeout:15000});
 await p.waitForTimeout(800);
 ok(await p.evaluate(()=>document.documentElement.getAttribute('data-nnvm')==='mobile'),'スマホ表示で開けた');
 const r=await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('table.sp-tbl').forEach(t=>{
   const th=t.querySelectorAll('thead th'); const h2=th[1]&&th[1].getBoundingClientRect().left;
   t.querySelectorAll('tbody tr:not(.gr)').forEach(tr=>{
    const c=tr.querySelector('td.c-code'),m=tr.querySelector('td.c-met'),b=tr.querySelector('td.c-tbl');
    if(!c||!m||!b)return;
    const img=m.querySelector('.kou-img')||m;
    out.push({code:c.textContent.trim().slice(0,8),metL:Math.round(img.getBoundingClientRect().left),tblR:Math.round(b.getBoundingClientRect().right),
     tops:[c,m,b].map(e=>Math.round(e.getBoundingClientRect().top)),head:Math.round(h2),metCell:Math.round(m.getBoundingClientRect().left)});
   });
  });
  return out;});
 ok(r.length>10,'行を測れた '+r.length+'行');
 const metLs=[...new Set(r.map(x=>x.metL))];
 ok(metLs.length===1,'工法の絵の左端が全行で同じ '+JSON.stringify(metLs)+' 例:'+JSON.stringify(r.filter(x=>x.metL!==r[0].metL).slice(0,3).map(x=>x.code+':'+x.metL)));
 const tblRs=[...new Set(r.map(x=>x.tblR))];
 ok(tblRs.length===1,'表の右端が全行で同じ '+JSON.stringify(tblRs));
 const topBad=r.filter(x=>Math.max(...x.tops)-Math.min(...x.tops)>1);
 ok(topBad.length===0,'1段目の3つのますの上の線が同じ高さ '+JSON.stringify(topBad.slice(0,3)));
 const headBad=r.filter(x=>Math.abs(x.head-x.metCell)>1);
 ok(headBad.length===0,'見出し「工法」が工法の列の左端にそろう '+JSON.stringify(headBad.slice(0,2).map(x=>[x.code,x.head,x.metCell])));
 console.log(ng?('★NG '+ng+'件'):'すべて○');
 await browser.close(); process.exit(ng?1:0);
})();
