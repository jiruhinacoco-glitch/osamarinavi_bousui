/* §1026 スマホ横向き（852×393）：①開いて落ち着く（6〜14秒の間に固まりが増えない＝並べ直しが止まらない不具合 §1026 の再発防止）
   ②カードが横に2枚並ぶ ③上の帯（ボタン・検索・件数・絞り込み）が1行 ④カードの中身（屋根の欄・金額）が組み立てられている。
   使い方: node _check/spland.js [kirokucho_demo.html]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:852,height:393},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');window.__lt=0;try{new PerformanceObserver(l=>{l.getEntries().forEach(e=>window.__lt+=e.duration);}).observe({type:'longtask',buffered:true});}catch(e){}});
const p=await ctx.newPage();p.goto('http://localhost:8899/'+FILE).catch(()=>{});
const ev=async ms=>{await new Promise(r=>setTimeout(r,ms));return Promise.race([p.evaluate(()=>window.__lt),new Promise(r=>setTimeout(()=>r(null),6000))]);};
const a=await ev(6000), c=await ev(8000);
const settle=a!==null&&c!==null&&(c-a)<1500;
let r={};if(c!==null) r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const cs=[...document.querySelectorAll('#list .pcard')].slice(0,2);const t=document.getElementById('toolbar');
 return {two:cs.length===2&&Math.abs(R(cs[0]).top-R(cs[1]).top)<2&&R(cs[1]).left>R(cs[0]).right,bar:[...t.children].filter(x=>x.offsetWidth).every(x=>Math.abs(R(x).top+R(x).height/2-(R(t).top+R(t).height/2))<8),built:!!(cs[0]&&cs[0].querySelector('.sproofs')&&cs[0].querySelector('.sptan'))};});
console.log(settle?'○':'★NG','①開いて落ち着く（6〜14秒の固まり '+(a!==null&&c!==null?Math.round(c-a)+'ms':'応答なし')+'）');
console.log(r.two?'○':'★NG','②カードが横に2枚並ぶ');console.log(r.bar?'○':'★NG','③上の帯が1行');console.log(r.built?'○':'★NG','④カードの中身が組み立てられている');
process.exit(0);})();
