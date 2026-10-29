/* B8：詳細の「人工」「追加工事」の日付欄が、最初から今日の日付で入っているか。追加したら今日の日付で記録されるか。
   使い方: node _check/datetoday.js [ページ]（http://localhost:8899 で配信しておくこと）。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
const t=new Date(), want=t.getFullYear()+'/'+(t.getMonth()+1)+'/'+t.getDate();   /* 検査側で別に作った今日 */
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
const id=await p.evaluate(()=>{selectedId=props[0].id; setTab('人工'); return props[0].id;}); await p.waitForTimeout(300);
ok('人工の日付欄が今日', await p.inputValue('#j_d')===want, await p.inputValue('#j_d'));
await p.evaluate(()=>{document.getElementById('j_n').value='3';}); await p.evaluate(id=>addJinku(id),id); await p.waitForTimeout(300);
ok('日付を打たずに追加できて今日で残る', await p.evaluate(()=>{const j=props[0].jinku; return j.length?j[j.length-1].d:null;})===want);
await p.evaluate(()=>setTab('追加工事')); await p.waitForTimeout(300);
ok('追加工事の発生日欄が今日', await p.inputValue('#ex_d')===want, await p.inputValue('#ex_d'));
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
