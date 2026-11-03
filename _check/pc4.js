/* §1027 追記：2つめの引数 r6 で「屋根6つの現場」を先頭に入れて確かめる（屋根の欄が高さを取りすぎて下の行がつぶれた）。
   §1025 PCの現場一覧：2列×2段＝1画面に4現場（カードの高さ＝一覧の見える高さの半分）・表の欄の中身が欠けない。使い方: node _check/pc4.js [kirokucho_demo.html] [幅] [高さ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const AR=process.argv.filter(x=>x!=='r6');const FILE=AR[2]||'kirokucho_demo.html',W=+(AR[3]||2000),H=+(AR[4]||940);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:W,height:H},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
if(process.argv.includes('r6')){await p.evaluate(()=>{const K=Object.keys(KO_MASTER);const a=JSON.parse(JSON.stringify(props[0]));a.id=97206;a.areas=[];for(let i=0;i<6;i++)a.areas.push({ko:K[(i*3+1)%K.length],mk:'田島ルーフィング',items:[{k:'平場',q:120}]});props.unshift(a);selectedId=-1;render();});await p.waitForTimeout(2000);}
await p.evaluate(()=>window.nnPcxFit&&nnPcxFit());await p.waitForTimeout(400);
const r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const L=document.getElementById('list'),lr=R(L);const cs=[...L.querySelectorAll('.pcard')];
 const vis=cs.filter(c=>{const q=R(c);return q.top>=lr.top-1&&q.bottom<=lr.bottom+1;});
 const cut=[];vis.forEach(c=>{c.querySelectorAll('.pcx > :is(.ebox,.pdate)').forEach(e=>{const q=R(e);[...e.querySelectorAll(':scope > :not(i)')].forEach(x=>{const z=R(x);if(z.width&&(z.right>q.right+0.5||z.bottom>q.bottom+0.5||z.left<q.left-0.5))cut.push(e.className+':'+x.className);});
  const rg=document.createRange();[...e.childNodes].filter(n=>n.nodeType===3&&n.nodeValue.trim()).forEach(n=>{rg.selectNodeContents(n);const z=rg.getBoundingClientRect();if(z.right>q.right+0.5||z.bottom>q.bottom+0.5)cut.push(e.className+'「'+n.nodeValue.trim().slice(0,8)+'」');});});});
 const ph=R(vis[0].querySelector('.pph'));const ex=vis[0].querySelector('.pexist');return {a4:Math.abs(ph.width/ph.height-297/210)<0.03,ex:!!ex&&getComputedStyle(ex).display!=='none'&&R(ex).top>=ph.bottom-1,vis:vis.length,cols:new Set(vis.map(c=>Math.round(R(c).left))).size,cut:[...new Set(cut)].slice(0,8)};});
const ok=r.vis===4&&r.cols===2&&!r.cut.length&&r.a4&&r.ex;
console.log(ok?'○':'★NG','PC（'+W+'×'+H+'）：2列×2段＝4現場・表の欄の中身が欠けない・写真はA4横の比率・写真の下に既存/区分/構造',JSON.stringify(r));await b.close();})();
