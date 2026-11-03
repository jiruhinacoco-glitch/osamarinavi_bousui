/* §1021 スマホ一覧：屋根1行（rfm1）のカードは日付3行を16pxに詰め、写真を74pxに。使い方: node _check/rf1date.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html',OUT=process.argv[3];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#list .pcard')].slice(0,3);nnTtlFitSp(cs);const R=e=>e.getBoundingClientRect();return cs.filter(c=>c.classList.contains('rfm1')).map(c=>{const ph=R(c.querySelector('.pph')),d=[...c.querySelectorAll('.prow.r3 > .pdate')].slice(0,3).map(R),cr=R(c);
 const cut=[...c.querySelectorAll('.prow.r3 > .pdate')].slice(0,3).some(e=>e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1);
 return {photoH:Math.round(ph.height),gapPhoto:Math.round(d[0].top-ph.bottom),dateH:d.map(x=>Math.round(x.height)),joined:Math.round(d[1].top-d[0].bottom)+','+Math.round(d[2].top-d[1].bottom),toBottom:Math.round(cr.bottom-d[2].bottom),cut,cardH:Math.round(cr.height)};});});
const ok=r.length&&r.every(o=>o.photoH>=70&&Math.abs(o.gapPhoto)<=1&&o.dateH.every(h=>h<=17)&&o.toBottom<=3&&!o.cut);
console.log(ok?'○':'★NG','屋根1行のカード：日付3行を詰めて写真を高く（写真70px以上・日付の行16px・写真と日付の間すき間なし・切れない）',JSON.stringify(r));
if(OUT){const cdp=await ctx.newCDPSession(p);let buf;for(let i=0;i<4;i++){const sc=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:0,y:140,width:393,height:340,scale:2}});buf=Buffer.from(sc.data,'base64');if(buf.length>100000)break;await p.waitForTimeout(1200);}require('fs').writeFileSync(OUT,buf);}
await b.close();})();
