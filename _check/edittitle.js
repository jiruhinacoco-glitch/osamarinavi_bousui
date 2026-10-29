/* B6：編集画面の見出しが「物件情報の編集」だけで、物件名はその下に1行（長い名前でも見出しが折り返さない）。
   新規のときは「新規物件登録」で物件名の行は出ない。使い方: node _check/edittitle.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
const nm=await p.evaluate(()=>{const q=props.find(x=>x.name.length>18); openModal(q.id); return q.name;}); await p.waitForTimeout(600);
const r=await p.evaluate(()=>{const h=document.getElementById('modalTitle'), s=h.querySelector('.nnTsub');
  const lh=t=>{const g=document.createRange(); g.selectNodeContents(t); return new Set([...g.getClientRects()].map(q=>Math.round(q.top))).size;};
  return {first:(h.firstChild&&h.firstChild.nodeType===3)?h.firstChild.textContent:null, firstLines:h.firstChild?lh(h.firstChild):0, sub:s?s.textContent:null, subLines:s?lh(s):0};});
ok('見出しは「物件情報の編集」だけ（1行）', r.first==='物件情報の編集'&&r.firstLines===1, r);
ok('物件名が下に1行で出る', r.sub===nm&&r.subLines===1, r);
await p.evaluate(()=>closeModal&&closeModal()); await p.waitForTimeout(300);
await p.evaluate(()=>openModal()); await p.waitForTimeout(600);
const n=await p.evaluate(()=>{const h=document.getElementById('modalTitle'); return {t:h.innerText.split('\n')[0], sub:!!h.querySelector('.nnTsub')};});
ok('新規は「新規物件登録」で物件名の行なし', n.t.trim()==='新規物件登録'&&!n.sub, n);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
