/* §1021 スマホ一覧：「利益予定」欄は金額だけ（PCの利益予定額を <i>見出し</i><b>金額</b> にしたとき見出しの文字が混ざった）。使い方: node _check/spprof.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#list .pcard')].slice(0,5);nnTtlFitSp(cs);return cs.map(c=>{const e=c.querySelector('.spsum > .spprof');if(!e)return '';const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('').trim();return t;});});
const ok=r.length&&r.every(t=>t&&!/利益/.test(t)&&/^(¥[\d,]+-?|策定中)$/.test(t));
console.log(ok?'○':'★NG','スマホの「利益予定」欄は金額だけ（見出しの文字が混ざらない）',JSON.stringify(r));await b.close();})();
