/* 図面・積算（スマホ縦）：下のメニューの絵が帯の上へはみ出さない（iPhone は上の画面を手前に描いて、はみ出した所を隠すため）。
   使い方: node _check/znavin.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [w,h] of [[393,852],[375,667]]){
const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(2200);
const r=await p.evaluate(()=>{const n=document.getElementById('nav'), t=n.getBoundingClientRect().top; return [...n.querySelectorAll('img')].filter(i=>i.offsetParent).map(i=>Math.round(i.getBoundingClientRect().top-t));});
ok(w+'×'+h+' メニューの絵が帯の中（上へはみ出さない）', r.length&&Math.min(...r)>=0, r);
const last=await p.evaluate(()=>{const m=document.getElementById('nnZMenu'); if(!m) return null; m.scrollTop=1e5; const bs=[...m.querySelectorAll('button')].filter(x=>x.offsetParent); const l=bs[bs.length-1]; return l?Math.round(l.getBoundingClientRect().bottom-document.getElementById('nav').getBoundingClientRect().top):null;});
ok(w+'×'+h+' 入口のいちばん下のボタンがメニューに隠れない', last!==null&&last<=0, last);
ok(w+'×'+h+' JSエラーなし', errs.length===0, errs.slice(0,2)); await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
