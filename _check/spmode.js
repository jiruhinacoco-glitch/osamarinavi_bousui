/* 検査：表示モード（一覧／スマホ）と上帯の1段化（§443・2026-09-21c）
   使い方：node _check/spmode.js [kirokucho_demo.html]   ※直す前の版（_before.html）では★NGになる
   ・上帯：縦画面で「戻る・題名・＋新規・きく・切替」が必ず1段（両モード）、右端が画面内
   ・切替ボタン #nnVmBtn：一覧モードでは「スマホ」、スマホモードでは「一覧」。押すと読み直して切り替わり、見ていたタブに戻る
   ・スマホモード：タブ4等分・KPIの数字がはみ出さない・カードの「▼ くわしく」・絞り込みの開閉・詳細のはみ出しなし
   ・国交省仕様：縦画面の上帯が1段（新築／改修の短い名前＋切替）
   ローカルサーバー不要（phonenav.js と同じく、ファイルを直接ブラウザへ渡す。ノッチ・ホームバー込み） */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m);if(!c)ng++;};
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
async function mk(browser,width,height,mode){
 const portrait=width<height,bar=portrait?34:21;
 const ctx=await browser.newContext({viewport:{width,height},screen:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce',userAgent:UA});
 await ctx.addInitScript(m=>{Object.defineProperty(navigator,'standalone',{get:()=>true});try{if(!sessionStorage.getItem('nn_spmode_keep'))localStorage.setItem('nn_view_mode',m);}catch(e){}},mode);
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
 return ctx;
}
async function open(ctx,file){
 const p=await ctx.newPage(); p.on('pageerror',e=>console.log('  pageerror:',String(e).slice(0,120)));
 await p.goto('https://nn.test/'+file);
 await p.waitForFunction(()=>document.querySelectorAll('#nav .ic img').length===9&&[...document.querySelectorAll('#nav .ic img')].every(i=>i.complete&&i.naturalWidth));
 await p.evaluate(()=>{if(window.nnFillBottom)nnFillBottom(true);});
 await p.waitForTimeout(500);
 return p;
}
/* 上帯：見えている子どもの 上端・右端・文字（画面上のpx＝縮小率で割る） */
const hdrInfo=()=>{const k=document.documentElement.clientWidth/screen.width;const h=document.querySelector('header');
 return [...h.children].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className.split(' ')[0]||e.tagName,top:+(r.top/k).toFixed(1),right:+(r.right/k).toFixed(1),text:(e.textContent||'').replace(/\s+/g,'').slice(0,12)};});};
function oneRow(kids,width){ const tops=kids.map(x=>Math.round(x.top)); const spread=Math.max(...tops)-Math.min(...tops); return spread<=14 && kids.every(x=>x.right<=width+1); }
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 /* ---- A. 一覧モード（縦）：上帯1段・切替ボタン ---- */
 {
  const ctx=await mk(browser,393,852,'ichiran'); const p=await open(ctx,FILE);
  const kids=await p.evaluate(hdrInfo);
  ok(oneRow(kids,393),'一覧モード縦：上帯が1段・右端が画面内 '+JSON.stringify(kids));
  const vm=kids.find(x=>x.id==='nnVmBtn');
  ok(!!vm&&vm.text==='スマホ表示','一覧モード縦：切替ボタンの文字が「スマホ」 '+(vm&&vm.text));
  ok(!!kids.find(x=>x.id==='askHdBtn'),'一覧モード縦：「きく」が上帯に残っている');
  const nb=kids.find(x=>/新規/.test(x.text));
  ok(!!nb&&nb.text==='＋新規','一覧モード縦：新規作成の文字が「＋新規」に縮む '+(nb&&nb.text));
  ok(await p.evaluate(()=>document.documentElement.getAttribute('data-nnvm')==='ichiran'&&document.querySelector('meta[name=viewport]').content.includes('width=980')),'一覧モード：data-nnvm=ichiran・幅980で組む');
  /* 押すと読み直してスマホモードになる（見ていたタブ＝現場一覧に戻る） */
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(300);
  await p.evaluate(()=>{try{sessionStorage.setItem('nn_spmode_keep','1');}catch(e){}});
  await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}), p.locator('#nnVmBtn').tap()]);
  await p.waitForFunction(()=>document.querySelectorAll('#nav .ic img').length===9,null,{timeout:15000}).catch(()=>{});
  await p.waitForTimeout(900);
  const after=await p.evaluate(()=>({vm:document.documentElement.getAttribute('data-nnvm'),key:localStorage.getItem('nn_view_mode'),cw:document.documentElement.clientWidth,list:getComputedStyle(document.getElementById('mainview')).display!=='none',tabOn:document.querySelector('#viewtabs button.on')&&document.querySelector('#viewtabs button.on').id}));
  ok(after.vm==='mobile'&&after.key==='mobile'&&after.cw===393,'切替ボタン→読み直してスマホモード（端末の幅393で組む） '+JSON.stringify(after));
  ok(after.list&&after.tabOn==='vt_list','切替のあと、見ていたタブ（現場一覧）に戻る');
  await ctx.close();
 }
 /* ---- B. スマホモード（縦）：レイアウト ---- */
 {
  const ctx=await mk(browser,393,852,'mobile'); const p=await open(ctx,FILE);
  const kids=await p.evaluate(hdrInfo);
  ok(oneRow(kids,393),'スマホモード縦：上帯が1段・右端が画面内 '+JSON.stringify(kids));
  const vm=kids.find(x=>x.id==='nnVmBtn');
  ok(!!vm&&vm.text==='一覧表示','スマホモード縦：切替ボタンの文字が「一覧」 '+(vm&&vm.text));
  const tabs=await p.evaluate(()=>[...document.querySelectorAll('#viewtabs button')].map(b=>{const r=b.getBoundingClientRect();return {w:+r.width.toFixed(1),fit:b.scrollWidth<=b.clientWidth+1,t:b.textContent}}));
  ok(tabs.length===4&&Math.max(...tabs.map(t=>t.w))-Math.min(...tabs.map(t=>t.w))<=2&&tabs.every(t=>t.fit),'スマホモード：タブ4つが等分・文字が省略されない '+JSON.stringify(tabs));
  const kpi=await p.evaluate(()=>{const g=[...document.querySelectorAll('#dashboard .kgrp')];return {n:g.length,cols:g.map(x=>Math.round(x.getBoundingClientRect().width)),ovf:[...document.querySelectorAll('#dashboard .kgv')].filter(v=>v.scrollWidth>v.clientWidth+1).length,x:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
  ok(kpi.n===4&&kpi.cols[0]<250&&kpi.cols[2]>300&&kpi.ovf===0&&kpi.x<=1,'スマホモード：KPIは2列（完成工事高は幅いっぱい）・数字がはみ出さない・横スクロールなし '+JSON.stringify(kpi));
  const tbl=await p.evaluate(()=>{const t=document.querySelector('#dashboard .mini-tbl.tight');if(!t)return null;const td=t.querySelector('tbody td');const w=t.parentElement;return {sticky:getComputedStyle(td).position==='sticky',scroll:getComputedStyle(w).overflowX==='auto'};});
  ok(tbl&&tbl.sticky&&tbl.scroll,'スマホモード：施工中の現場の表は横スクロール＋先頭列固定 '+JSON.stringify(tbl));
  /* 現場一覧 */
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);
  const card=await p.evaluate(()=>{const c=document.querySelector('#list .pcard');const W=document.documentElement.clientWidth;const q=s=>c.querySelector(s);const vis=e=>e&&e.getBoundingClientRect().width>0&&getComputedStyle(e).display!=='none';
   return {more:!!q('.sp-more'),ttl:parseFloat(getComputedStyle(q('.rhead .ebox.ttl')).fontSize),ttlWrap:getComputedStyle(q('.rhead .ebox.ttl')).whiteSpace,go:q('.pgo').getBoundingClientRect().height,goIn:q('.pgo').getBoundingClientRect().right<=W,hidden:[...c.querySelectorAll('.r2 .ebox:not(.horder)')].every(e=>!vis(e)),r3:!vis(q('.r3')),docs:!vis(q('.pdocs')),photoW:Math.round(q('.pph').getBoundingClientRect().width),ovf:[...c.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>W+1&&e.getBoundingClientRect().width>0).length};});
  ok(card.more&&card.hidden&&card.r3&&card.docs,'スマホモード：カードは「▼ くわしく」を押すまで単価・住所・書類をたたむ '+JSON.stringify(card));
  ok(card.ttl>=15&&card.ttlWrap==='normal'&&card.go>=40&&card.goIn&&card.photoW>=100&&card.ovf===0,'スマホモード：物件名15px以上で折返し可・詳細ボタン40px以上・写真110px・はみ出しなし '+JSON.stringify(card));
  await p.locator('#list .pcard .sp-more').first().tap(); await p.waitForTimeout(300);
  const opened=await p.evaluate(()=>{const c=document.querySelector('#list .pcard');const vis=e=>e&&e.getBoundingClientRect().width>0;return {spx:c.classList.contains('spx'),r2:[...c.querySelectorAll('.r2 .ebox')].every(vis),r3:vis(c.querySelector('.r3')),docs:vis(c.querySelector('.pdocs .doc')),memo:vis(c.querySelector('.pmemo')),txt:c.querySelector('.sp-more').textContent};});
  ok(opened.spx&&opened.r2&&opened.r3&&opened.docs&&opened.memo&&/とじる/.test(opened.txt),'スマホモード：「▼ くわしく」で単価・住所・書類・メモが開き「▲ とじる」になる '+JSON.stringify(opened));
  const fil0=await p.evaluate(()=>({btn:!!document.getElementById('spFilBtn'),chips:getComputedStyle(document.getElementById('chips')).display}));
  await p.locator('#spFilBtn').tap(); await p.waitForTimeout(300);
  const fil1=await p.evaluate(()=>({chips:getComputedStyle(document.getElementById('chips')).display,n:[...document.querySelectorAll('#chips .stchip')].filter(b=>b.getBoundingClientRect().width>0).length,fit:[...document.querySelectorAll('#chips .stchip')].every(b=>b.getBoundingClientRect().right<=document.documentElement.clientWidth+1)}));
  ok(fil0.btn&&fil0.chips==='none'&&fil1.chips==='flex'&&fil1.n>=13&&fil1.fit,'スマホモード：「絞り込み」でタグ13個が開く（はじめはたたむ・全部画面内） '+JSON.stringify({fil0,fil1}));
  /* 詳細 */
  await p.locator('#list .pcard .pgo').first().tap(); await p.waitForTimeout(700);
  const det=await p.evaluate(()=>{const W=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('#detail *')].filter(e=>!e.closest('.tabs')&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().right>W+1);return {shown:document.getElementById('mainview').classList.contains('show-detail'),bad:bad.slice(0,5).map(e=>e.className.toString().slice(0,20)),ops:[...document.querySelectorAll('#detail .dops button')].every(b=>b.getBoundingClientRect().height>=38)};});
  ok(det.shown&&det.bad.length===0&&det.ops,'スマホモード：物件詳細が画面からはみ出さない・操作ボタン38px以上 '+JSON.stringify(det));
  await ctx.close();
 }
 /* ---- C. スマホモード（よこ）：上帯1段 ---- */
 {
  const ctx=await mk(browser,852,393,'mobile'); const p=await open(ctx,FILE);
  const kids=await p.evaluate(hdrInfo);
  const vm=kids.find(x=>x.id==='nnVmBtn');
  ok(oneRow(kids,852)&&!!vm&&vm.text==='一覧表示','スマホモードよこ：上帯1段・切替ボタン「一覧表示」 '+JSON.stringify(kids));
  await ctx.close();
 }
 /* ---- D. 国交省仕様：縦の上帯が1段（両モード） ---- */
 if(FILE==='kirokucho_demo.html'){
  for(const mode of ['ichiran','mobile']){
   const ctx=await mk(browser,393,852,mode); const p=await open(ctx,'kokkosho.html');
   const kids=await p.evaluate(hdrInfo);
   const vm=kids.find(x=>x.id==='nnVmBtn'), tabs=kids.find(x=>x.id==='mode-tabs');
   ok(oneRow(kids,393)&&!!vm&&vm.text===(mode==='mobile'?'一覧表示':'スマホ表示')&&!!tabs&&tabs.right<=340,'国交省仕様 '+mode+' 縦：上帯1段（新築／改修＋切替）・右端が画面内 '+JSON.stringify(kids));
   await ctx.close();
  }
 }
 await browser.close();
 console.log(ng?('★NG '+ng+'件'):'すべて○');
 process.exitCode=ng?1:0;
})();
