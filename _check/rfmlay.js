/* §1010 スマホ一覧：屋根1〜6つの現場の並び（本人の画面写し 2026-11-03 の5つの指摘）。直す前の版は★NG。
   使い方: node _check/rfmlay.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(2500);
await p.evaluate(()=>{const K=Object.keys(KO_MASTER);const MK=['田島ルーフィング','ダイフレックス','ディックプルーフィング'];
 const mk=n=>{const x=JSON.parse(JSON.stringify(props[0]));x.id=90000+n;x.name='屋根'+n;x.areas=[];for(let i=0;i<n;i++)x.areas.push({ko:K[(i*3+1)%K.length],mk:MK[i%3],items:[{k:'平場',q:i==0?54000:(i+1)*50,u:'㎡'}]});return x;};
 [6,4,3,2,1].forEach(n=>props.unshift(mk(n)));selectedId=-1;render();showView('list');});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#list .pcard')].slice(0,5);if(window.nnTtlFitSp)nnTtlFitSp(cs);
 return cs.map((c,k)=>{const n=[1,2,3,4,6][k];const o={n};const R=e=>e.getBoundingClientRect();
  const cells=[...c.querySelectorAll('.sproofs > .sprf')];o.cells=cells.length;o.rows=new Set(cells.map(e=>Math.round(R(e).top))).size;
  o.cut=[...c.querySelectorAll('.sprfv')].filter(e=>e.scrollWidth>e.clientWidth+1).length;
  /* ② 日付の行と 元請・進行度・屋根 の行の上下がそろう */
  const d=[...c.querySelectorAll('.prow.r3 > .pdate')].slice(0,3).map(R);const rr=[c.querySelector('.prow.r1 > .ebox[data-f="moto"]'),c.querySelector('.prow.rprog'),c.querySelector(':scope > .sproof')].map(e=>e?R(e):null);
  o.dgap=Math.max(...d.map((x,i)=>rr[i]?Math.abs(x.top-rr[i].top)+Math.abs(x.bottom-rr[i].bottom):99));
  /* ③ ％の文字はバーの高さ以下 */
  const pv=c.querySelector('.prow.rprog .pv'),bar=c.querySelector('.prow.rprog .prog');o.pv=pv&&bar?(parseFloat(getComputedStyle(pv).fontSize)<=R(bar).height*0.8):false;
  /* ④ 詳細へと写真枠が重ならない */
  const sm=R(c.querySelector('.sp-more'));o.ov=[...c.querySelectorAll('.psh')].filter(x=>x.offsetParent).some(x=>{const a=R(x);return a.right>sm.left&&a.left<sm.right&&a.bottom>sm.top&&a.top<sm.bottom;});
  /* ⑤ 屋根の欄の右端＝カードの右端（空欄なし） */
  const last=cells.length?R(cells[cells.length-1]):null;o.right=last?Math.abs(last.right-R(c.querySelector('.sproofs')).right)<=1.5:false;
  o.empty=c.querySelectorAll('.sproofs > .sprf.empty').length;return o;});});
const want={1:[1,1],2:[2,1],3:[3,1],4:[4,2],6:[6,2]};let ng=0;
for(const o of r){const ok=o.cells===want[o.n][0]&&o.rows===want[o.n][1]&&o.cut===0&&o.dgap<=1.5&&o.pv&&!o.ov&&o.right&&o.empty===0;if(!ok)ng++;
 console.log(ok?'○':'★NG','屋根'+o.n+'つ：欄'+o.cells+'・'+o.rows+'行・面積の見切れ'+o.cut+'・日付の行ずれ'+o.dgap.toFixed(1)+'px・％の大きさ'+(o.pv?'OK':'大')+'・詳細へと写真'+(o.ov?'重なる':'離れる')+'・右端'+(o.right?'そろう':'空く'));}
console.log(ng?'★NG 屋根の並び '+ng+'件':'○ 屋根の並び 全部OK');await b.close();})();
