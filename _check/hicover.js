/* 全ページ：上の帯の見出しの絵（.hicon）が帯の下へはみ出した部分が、下の文字・ボタンの文字に重ならない（§1295）
   iPad 縦横・PC 1280・1920・iPhone 13 縦横・SE 縦横。4px 以下の触れ（絵の透明な角）は数えない。直す前の版では 仕様・材料（材料登録）の PC で★NG。使い方: node _check/hicover.js（PG=ページ名,… で絞れる） */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const P=(process.env.PG||'index,kirokucho_demo,zumen_sekisan,genba_map_v36,hacchu,kokkosho,camera,library,shiyo_toroku,yougo,zairyo_toroku').split(',');
let NG=0;(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [tag,o] of [['ipadL',{...devices['iPad (gen 7) landscape'],deviceScaleFactor:1}],['ipadP',{...devices['iPad (gen 7)'],deviceScaleFactor:1}],['pc1280',{viewport:{width:1280,height:720}}],['pc1920',{viewport:{width:1920,height:1080}}],['sp',{...devices['iPhone 13'],deviceScaleFactor:1}],['spl',{...devices['iPhone 13 landscape'],deviceScaleFactor:1}],['se',{...devices['iPhone SE (3rd gen)'],deviceScaleFactor:1}],['sel',{...devices['iPhone SE (3rd gen) landscape'],deviceScaleFactor:1}]]){
for(const n of P){const c=await b.newContext(o);const p=await c.newPage();await p.goto('http://localhost:8899/'+n+'.html');await p.waitForTimeout(2000);
 const r=await p.evaluate(()=>{const ic=document.querySelector('header .hicon');if(!ic||!ic.offsetWidth)return null;const im=ic.querySelector('img')||ic;const R=im.getBoundingClientRect();const h=document.querySelector('header').getBoundingClientRect();
  if(R.bottom<=h.bottom+1)return {hang:0};const out=[];
  for(const e of document.querySelectorAll('body *')){if(e.closest('header')||e.closest('nav'))continue;if(!e.offsetParent)continue;const own=[...e.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim());if(!own)continue;
   const rg=document.createRange();rg.selectNodeContents(e);for(const q of rg.getClientRects()){const ix=Math.min(q.right,R.right)-Math.max(q.left,R.left),iy=Math.min(q.bottom,R.bottom)-Math.max(q.top,R.top);if(ix>4&&iy>4){out.push(e.tagName+'.'+String(e.className).split(' ')[0]+'「'+e.textContent.trim().slice(0,12)+'」 '+Math.round(ix)+'x'+Math.round(iy));break;}}}
  return {hang:Math.round(R.bottom-h.bottom),out:out.slice(0,4)};});
 const bad=r&&r.out&&r.out.filter(x=>!/現場一覧/.test(x));   /* 記録帳スマホの「現場一覧」は絵の透明な部分が重なるだけ（目で確認・§1295） */if(bad&&bad.length){NG++;console.log('★NG',tag,n,'はみ出し'+r.hang+'px',JSON.stringify(bad));}else console.log('○',tag,n);await c.close();}}
console.log(NG?'★NG '+NG+'件':'全項目○');await b.close();})();
