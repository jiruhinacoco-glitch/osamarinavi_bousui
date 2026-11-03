/* §1020 PCの現場一覧をスマホ版に寄せる：状態の札＝光沢のグラデーション／項目の見出し＝緑の地 #cfe8d5／利益予定額＝見出し｜金額の箱／ふだんのカード＝黒い枠・白い地。
   使い方: node _check/pcassp.js [kirokucho_demo.html]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:2000,height:1000},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#list .pcard')];const c=cs.find(x=>!x.classList.contains('sel'))||cs[1];const g=e=>getComputedStyle(e);
 const st=c.querySelector('.rhead .status'),lb=c.querySelector('.prow.r1 > .ebox > i'),pf=c.querySelector('.rhead .pprofit');
 return {stGrad:/gradient/.test(g(st).backgroundImage),lbBg:g(lb).backgroundColor,pfLabel:!!(pf&&pf.querySelector('i')&&pf.querySelector('b')),pfBorder:pf?g(pf).borderTopStyle:'',cardBorder:g(c).borderTopColor,cardBg:g(c).backgroundColor};});
const ok1=r.stGrad,ok2=r.lbBg==='rgb(207, 232, 213)',ok3=r.pfLabel&&r.pfBorder==='solid',ok4=r.cardBorder==='rgb(0, 0, 0)'&&r.cardBg==='rgb(255, 255, 255)';
console.log(ok1?'○':'★NG','状態の札が光沢のグラデーション');console.log(ok2?'○':'★NG','項目の見出しが緑の地（スマホと同じ）');console.log(ok3?'○':'★NG','利益予定額が「見出し｜金額」の箱');console.log(ok4?'○':'★NG','ふだんのカードは黒い枠・白い地',JSON.stringify(r));
await b.close();})();
