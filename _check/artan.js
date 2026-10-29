/* B1：新規登録（スマホ）で面積を入れると、そのすぐ下に単価の欄と請負額の概算（数量×単価）が出る。
   入れた単価は本物の欄に入り、請負額が空のまま保存すると概算どおりの額になる。使い方: node _check/artan.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
await p.evaluate(()=>openModal()); await p.waitForTimeout(700);
await p.fill('#f_name','検査 単価の写し');
/* 1つ目の屋根の最初の数量欄（平場）に 120 を入れる */
await p.evaluate(()=>{const e=[...document.querySelectorAll('#modalbg .roofs input')].find(x=>x.offsetParent&&(x.type==='number'||x.inputMode==='decimal')); e.value='120'; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));});
await p.waitForTimeout(500);
const m=await p.evaluate(()=>+document.getElementById('f_m').value);
ok('面積120を入れると数量が120（検査の前提）', m===120, m);
const vis=()=>p.evaluate(()=>{const e=document.getElementById('nnArTan'); return !!(e&&e.offsetParent);});
ok('面積の下に単価の欄が見える', await vis());
if(await vis()){ await p.fill('#nnArTan','8000'); await p.waitForTimeout(300); }
const r=await p.evaluate(()=>({est:(document.querySelector('#nnArTanRow .est')||{}).textContent||'', tan:document.getElementById('f_tan').value, ph:document.getElementById('f_amt').placeholder}));
const want=(120*8000).toLocaleString();   /* 検査側で計算した額 */
ok('概算 ¥'+want+' が見え、本物の単価欄にも入る', r.est.includes('¥'+want)&&r.tan==='8000', r);
ok('請負額の欄のうすい見本にも自動の額', r.ph.includes(want), r.ph);
await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); b.click();}); await p.waitForTimeout(1200);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&e.textContent.trim()==='あとで'); if(b) b.click();});
const sv=await p.evaluate(()=>{const q=props.find(x=>x.name==='検査 単価の写し'); return q?q.order:null;});
ok('請負額が空のまま保存すると概算どおり', sv===120*8000, sv);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
