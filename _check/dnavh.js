/* §1012 スマホのダッシュボード：項目ボタン（全体・請求記録…）の高さ24px・アイコンが枠から少しはみ出す・文字や隣と重ならない。使い方: node _check/dnavh.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html',OUT=process.argv[3];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','dash');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#dashboard .nn-dnav button')];const R=x=>x.getBoundingClientRect();
 const o=bs.map(b=>{const i=b.querySelector('img'),q=R(b),m=i?R(i):null,t=R(b.querySelector('b'));return {k:b.dataset.k,h:Math.round(q.height),out:m?Math.round(Math.max(q.top-m.top,m.bottom-q.bottom)):0,txtOver:m?m.right>t.left+1:false};});
 let ov=0;for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const a=R(bs[i]),c=R(bs[j]);if(a.left<c.right&&c.left<a.right&&a.top<c.bottom&&c.top<a.bottom)ov++;}
 const wrap=document.querySelector('#dashboard .nn-dnav'),w=R(wrap);const esc=bs.some(b=>{const m=b.querySelector('img');if(!m)return false;const q=R(m);return q.top<w.top-1||q.bottom>w.bottom+1;});
 return {o,ov,esc};});
const bad=r.o.filter(x=>x.h<23||x.out<2||x.txtOver);
console.log(!bad.length&&!r.ov&&!r.esc?'○':'★NG','ダッシュボードの項目：高さ24px・アイコンが枠から少しはみ出す・文字や隣と重ならない',JSON.stringify({bad,ov:r.ov,esc:r.esc,h:r.o.map(x=>x.k+':'+x.h+'/'+x.out).join(' ')}));
if(OUT){const cdp=await ctx.newCDPSession(p);for(let i=0;i<4;i++){const sc=await cdp.send('Page.captureScreenshot',{format:'png'});const buf=Buffer.from(sc.data,'base64');require('fs').writeFileSync(OUT,buf);if(buf.length>150000)break;await p.waitForTimeout(1500);}}
await b.close();})();
