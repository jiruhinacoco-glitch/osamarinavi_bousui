/* ★2026-10-30c 新規・編集で「契約済」を選ぶと、必須の契約日がステータスのすぐ下に出る（デバッグ巡回 A4）
   ①引合いありのときは出ない ②契約済にすると見える（スマホ表示で、詳細入力を開かなくても）③そこに入れた日付で保存でき、開き直すと契約日が入っている
   ④入れずに保存を押したときのお知らせが「保存する」ボタンに重ならない
   使い方: node _check/stkb.js [ページ]（http://localhost:8899 で配信しておくこと）。直す前の版は②③④が落ちる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&/^＋?\s*新規$/.test(e.textContent.trim())); b.click();}); await p.waitForTimeout(800);
const vis=()=>p.evaluate(()=>{const e=document.getElementById('nnStKb'); if(!e||!e.offsetParent) return false; const r=e.getBoundingClientRect(); return r.height>10;});
ok('①引合いありのときは出ない', !(await vis()));
await p.fill('#f_name','検査用 契約日の写し'); await p.selectOption('#f_st',{label:'契約済'}); await p.waitForTimeout(300);
await p.evaluate(()=>{const e=document.getElementById('f_amt'); e.value='500000'; e.dispatchEvent(new Event('input',{bubbles:true}));});
ok('②契約済で契約日がステータスのすぐ下に見える', await vis());
/* ④ 入れずに保存 */
await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); b.click();}); await p.waitForTimeout(700);
const ov=await p.evaluate(()=>{const t=document.getElementById('toast'), s=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); const a=t.getBoundingClientRect(), c=s.getBoundingClientRect(); return {toast:t.textContent, overlap:!(a.bottom<=c.top||a.top>=c.bottom||a.right<=c.left||a.left>=c.right)};});
ok('④お知らせが「保存する」に重ならない', /契約日/.test(ov.toast)&&!ov.overlap, ov);
/* 保存に失敗すると詳細入力が開き、本物の契約日欄が見えれば写しは隠れる → 見えている方へ入れる */
if(await vis()){ await p.fill('#nnStKb','2026-06-15'); } else if(await p.evaluate(()=>{const e=document.getElementById('f_kb'); return !!(e&&e.offsetParent);})){ await p.fill('#f_kb','2026-06-15'); }
await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); b.click();}); await p.waitForTimeout(1200);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&e.textContent.trim()==='あとで'); if(b) b.click();});
const saved=await p.evaluate(()=>{const q=props.find(x=>x.name==='検査用 契約日の写し'); return q?{st:q.status, kb:q.kbD?new Date(q.kbD).toISOString().slice(0,10):null}:null;});
ok('③写しに入れた契約日で保存できる', saved&&saved.st==='契約済'&&saved.kb==='2026-06-15', saved);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
