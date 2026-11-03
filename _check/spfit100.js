/* §1040 スマホ表示（nn_view_mode=mobile）：一覧100枚の文字合わせ（nnTtlFitSp）が6秒未満（直す前は約9秒）。
   書いた直後に読む（1枚ごとに全体を計算し直す）ことが戻ると★NG。使い方: node _check/spfit100.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:UAP,serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');localStorage.setItem('nn_view_mode','mobile');});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8899/'+FILE);
await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=90,null,{timeout:30000});await p.waitForTimeout(3000);
const ms=[];for(let i=0;i<2;i++){ms.push(await p.evaluate(()=>{const t0=performance.now();nnTtlFitSp([...document.querySelectorAll('#list .pcard')]);return Math.round(performance.now()-t0);}));await p.waitForTimeout(300);}
const best=Math.min(...ms);let ok=best<6000;if(!ok)NG++;console.log((ok?'○':'★NG')+' スマホ表示：100枚の文字合わせが6秒未満 '+JSON.stringify(ms));
ok=!errs.length;if(!ok)NG++;console.log((ok?'○':'★NG')+' JSエラーなし '+JSON.stringify(errs.slice(0,2)));
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
