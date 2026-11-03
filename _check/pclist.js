/* §1018 PCの現場一覧：検索欄と絞り込みの札の間を詰める・右上のボタンと重ならない・項目の箱がすき間なく表のようにつながる・進行バーを短く。使い方: node _check/pclist.js [kirokucho_demo.html] [出力png] [画面幅] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html',OUT=process.argv[3],W=+(process.argv[4]||2000);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:W,height:1000},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
const r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const q=document.getElementById('q'),ch=document.getElementById('chips'),md=document.getElementById('nnRecordModes'),lc=document.getElementById('nnLC');
 const ov=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;const c=document.querySelector('#list .pcard .pmidL');
 const rows=[...c.querySelectorAll(':scope > .prow:is(.r1,.r2,.r3)')];let gaps=0;rows.forEach(rw=>{const k=[...rw.children].filter(x=>x.offsetWidth);for(let i=1;i<k.length;i++){if(R(k[i]).left-R(k[i-1]).right>0.5)gaps++;}});
 let vg=0;for(let i=1;i<rows.length;i++){if(R(rows[i]).top-R(rows[i-1]).bottom>0.5)vg++;}
 const pg=document.querySelector('#list .pcard .rprog .pprog');
 return {gap:Math.round(R(ch).top-R(q).bottom),ovModes:ov(R(ch),R(md))||ov(R(lc),R(md))||ov(R(q),R(md)),gaps,vg,prog:Math.round(R(pg).width)};});
const ok=r.gap<=10&&!r.ovModes&&r.gaps===0&&r.vg===0&&r.prog<=340;
console.log(ok?'○':'★NG','PCの現場一覧：検索欄と札の間を詰める・右上のボタンと重ならない・項目の箱が表のようにつながる・進行バーを短く',JSON.stringify(r));
if(OUT){const cdp=await ctx.newCDPSession(p);let buf;for(let i=0;i<4;i++){const sc=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:80,y:80,width:W-80,height:560,scale:1}});buf=Buffer.from(sc.data,'base64');if(buf.length>150000)break;await p.waitForTimeout(1200);}require('fs').writeFileSync(OUT,buf);}
await b.close();})();
