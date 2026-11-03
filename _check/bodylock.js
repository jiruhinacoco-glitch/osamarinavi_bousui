/* §1009 スマホ表示：iPhone がプルダウン等を見せようと画面全体（body）を送っても0に戻るか。直す前の版は★NG。使い方: node _check/bodylock.js kirokucho_demo.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(4000);
const r=await p.evaluate(()=>new Promise(res=>{const o={};o.sh=document.body.scrollHeight+'/'+document.body.clientHeight;
 const L=document.getElementById('list');L.scrollTop=L.scrollHeight;  /* 一覧の最後のカードのプルダウンを、iPhone のように見える所へ送る */
 setTimeout(()=>{const ss=[...L.querySelectorAll('.pcard')].pop();ss.scrollIntoView({block:'end'});const n=document.querySelector('nav');n.scrollIntoView({block:'end'});o.now=document.body.scrollTop;
 setTimeout(()=>{o.after=document.body.scrollTop;o.hdr=Math.round(document.querySelector('header').getBoundingClientRect().top);res(o)},500)},300)}));
console.log(r.after===0?'○':'★NG','スマホ：iPhoneが画面全体を送っても戻る',JSON.stringify(r));await b.close();})();
