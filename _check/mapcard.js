/* 現場マップ左の現場カード（2026-10-30q 本人）：カードの高さは90px以下（余白なし）／選んだカードはオレンジで塗る／
   上の選択タグ（すべて・見積済…）の選んだものはオレンジ。PCとスマホ。使い方: node _check/mapcard.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'genba_map_v36.html';
const orange=c=>{const m=c.match(/\d+/g); if(!m) return false; const [r,g,b]=m.map(Number); return r>=220&&g>=120&&g<=230&&b<=200&&r-b>=60;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const ph of [false,true]){
const ctx=await b.newContext(ph?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'}:{viewport:{width:1600,height:860},serviceWorkers:'block'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const T=ph?'スマホ ':'PC ';
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(2500);
const hs=await p.evaluate(()=>[...document.querySelectorAll('#list .site')].filter(e=>e.offsetParent).slice(0,5).map(e=>Math.round(e.getBoundingClientRect().height)));
ok(T+'カードの高さ90px以下', hs.length&&Math.max(...hs)<=90, hs);
const r=await p.evaluate(()=>{const s=[...document.querySelectorAll('#list .site')].filter(e=>e.offsetParent)[1]; if(!s) return null; s.click(); return true;}); await p.waitForTimeout(600);
const c=await p.evaluate(()=>{const s=document.querySelector('#list .site.sel'); if(!s) return null; const g=getComputedStyle(s); const m=(g.backgroundImage.match(/rgb\([^)]*\)/g)||[]); return {bg:g.backgroundColor, img:m};});
ok(T+'選んだカードはオレンジで塗る', !!c&&(orange(c.bg)||c.img.some(orange)), c);
const t=await p.evaluate(()=>{const e=document.querySelector('#tabs .tab.on'); const g=getComputedStyle(e); return (g.backgroundImage.match(/rgb\([^)]*\)/g)||[g.backgroundColor]);});
ok(T+'選んだタグはオレンジ', t.some(orange), t);
ok(T+'JSエラーなし', errs.length===0, errs.slice(0,2)); await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
