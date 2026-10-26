/* ★§814 左の帯の絵が「大きくなる→入りきらない→小さくなる…」をくり返していないか。使い方: node _check/navjitter.js [ページ] */
/* 左の帯の絵の大きさが時間とともに変わらないか（高さを境目付近で何通りも試す） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const page=process.argv[2]||'genba_map_v36.html';
(async()=>{const b=await chromium.launch(); let bad=0;
for(const h of [700,720,740,760,780,800,820]){
 const c=await b.newContext({viewport:{width:1300,height:h}}); const p=await c.newPage();
 await p.goto('http://localhost:8899/'+page); await p.waitForTimeout(2000);
 const ws=[]; for(let i=0;i<12;i++){ ws.push(await p.evaluate(()=>{const n=document.getElementById('nav'); if(!n) return 'none'; return getComputedStyle(n).flexDirection+':'+[...n.querySelectorAll('img')].map(i=>i.offsetWidth).join(',');})); await p.waitForTimeout(150); }
 const uniq=[...new Set(ws)]; if(uniq.length>1) bad++;
 console.log(h, uniq.length===1?'安定':'★揺れ '+uniq.length+'通り', uniq[0].slice(0,60));
 await c.close(); }
console.log(bad?'★NG 揺れあり':'○ 揺れなし'); await b.close();})();
