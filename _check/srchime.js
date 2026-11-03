/* §1038 検索欄：日本語の変換中（isComposing）は一覧を作り直さず、確定したときに1回だけ作り直す。結果は確定した文字で絞られる。
   直す前の版は★NG（変換中の「さ」「さっ」…ごとに作り直していた）。使い方: node _check/srchime.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{const b=await chromium.launch();
for(const PH of [1,0]){const ctx=await b.newContext(PH?{viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:UAP,serviceWorkers:'block'}:{viewport:{width:1600,height:900},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+FILE);await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=90,null,{timeout:30000});await p.waitForTimeout(1500);
 await p.evaluate(()=>{const o=window.render;window.__rc=0;window.render=function(){window.__rc++;return o.apply(this,arguments);};try{render=window.render;}catch(e){}});
 const q=await p.$('#q');await q.focus();
 /* 変換中：やまのて を1文字ずつ（0.2秒おき＝作り直しの待ち0.12秒より長い） */
 for(const v of ['や','やま','やまの','やまのて']){await p.evaluate(v=>{const q=document.getElementById('q');q.value=v;q.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:v}));},v);await p.waitForTimeout(200);}
 const mid=await p.evaluate(()=>window.__rc);
 /* 確定：「山の手」 */
 await p.evaluate(()=>{const q=document.getElementById('q');q.value='山の手';q.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'山の手'}));q.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'山の手'}));});
 await p.waitForTimeout(800);
 const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#list .pcard')];return {rc:window.__rc,n:cs.length,all:cs.every(c=>c.textContent.includes('山の手'))};});
 const ok=mid===0&&r.rc>=1&&r.rc<=2&&r.n>0&&r.all&&!errs.length;if(!ok)NG++;
 console.log((ok?'○':'★NG')+' '+(PH?'スマホ':'PC')+'：変換中は作り直さず（'+mid+'回）、確定で絞られる '+JSON.stringify(r)+(errs.length?' '+errs[0]:''));await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
