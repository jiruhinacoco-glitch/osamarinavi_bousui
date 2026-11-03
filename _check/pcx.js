/* §1022 PCの現場一覧のカード本文＝スマホと同じ並びの表（.pcx）：屋根の欄（6つ＝2段・2つ＝1段）・見切れなし・欄を押すと変更できる。使い方: node _check/pcx.js [kirokucho_demo.html] [出力png] [画面幅] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html',OUT=process.argv[3],W=+(process.argv[4]||2000);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:W,height:1000},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();p.on('pageerror',e=>console.log('pe',e.message));await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
await p.evaluate(()=>{const K=Object.keys(KO_MASTER);const mk=(id,name,n,yk)=>{const a=JSON.parse(JSON.stringify(props[0]));a.id=id;a.name=name;a.areas=[];for(let i=0;i<n;i++)a.areas.push({ko:K[(i*3+1)%K.length],mk:['田島ルーフィング','ダイフレックス','ディックプルーフィング'][i%3],items:[{k:'平場',q:(i+1)*120}].concat(yk&&i==0?[{k:'役物周り',q:50,a:38.5,ko:K[5]}]:[])});return a;};
 props.unshift(mk(96002,'屋根2つの現場（役物つき）',2,1));props.unshift(mk(96006,'屋根6つの現場 長い名前のテスト工事 その1',6,0));selectedId=-1;render();showView('list');});await p.waitForTimeout(1500);await p.evaluate(()=>window.nnPcxFit&&nnPcxFit());await p.waitForTimeout(300);
const r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const cs=[...document.querySelectorAll('#list .pcard')].slice(0,4);return cs.map(c=>{const g=c.querySelector('.pcx');if(!g)return {none:1};
 const over=el=>{const r=R(el),rg=document.createRange();let mx=0;for(let n=el.firstChild;n;n=n.nextSibling){let b=null;if(n.nodeType===3){if(!n.nodeValue.trim())continue;rg.selectNodeContents(n);b=rg.getBoundingClientRect();}else if(n.nodeType===1&&n.tagName!=='I')b=R(n);if(b&&b.width)mx=Math.max(mx,b.right);}return mx>r.right-1;};
 const cut=[...g.querySelectorAll(':scope > :is(.ebox,.pdate), .pcxrf > :is(.pcxtg,.pcxyk,.pcxa)')].filter(e=>e.offsetWidth&&over(e)).map(e=>e.className+'「'+e.textContent.trim().slice(0,12)+'」');
 const roofs=g.querySelectorAll('.pcxrf').length;const rows=new Set([...g.querySelectorAll('.pcxrf')].map(x=>Math.round(R(x).top))).size;
 const ttl=c.querySelector('.rhead .ebox.ttl');const lines=[...g.querySelectorAll(':scope > :not(.pcxroofs)')].map(e=>Math.round(R(e).right));
 return {roofs,rows,cut,ttlW:Math.round(R(ttl).width),gW:Math.round(R(g).width),hdW:Math.round(R(c.querySelector('.rhead')).width)};});});
console.log(JSON.stringify(r));
const ok=r[0].roofs===6&&r[0].rows===2&&r[1].roofs===2&&r[1].rows===1&&r.every(o=>!o.cut||!o.cut.length);
console.log(ok?'○':'★NG','PCのカード＝スマホと同じ並びの表（屋根の欄の数・段・見切れなし）');
const ed=await p.evaluate(()=>{const c=document.querySelectorAll('#list .pcard')[2];const k=c&&c.querySelector('.pcx [data-f="kbn"]');if(!k)return false;k.click();return !!c.querySelector('.pcx [data-f="kbn"] select');});
console.log(ed?'○':'★NG','PCの表の「区分」を押すと選べる（今までと同じ仕組み）');
if(OUT){const cdp=await ctx.newCDPSession(p);let buf;for(let i=0;i<4;i++){const sc=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:80,y:180,width:W-80,height:800,scale:1}});buf=Buffer.from(sc.data,'base64');if(buf.length>150000)break;await p.waitForTimeout(1200);}require('fs').writeFileSync(OUT,buf);}
await b.close();})();
