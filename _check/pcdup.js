/* §1030 PCのカード：既存・構造・メモが二重に出ない（1列で表の最後の段と写真の下・下のメモ行の両方に出ていた）。直す前の版は★NG。使い方: node _check/pcdup.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;(async()=>{const b=await chromium.launch();for(const W of [1400,2000]){const ctx=await b.newContext({viewport:{width:W,height:900}});await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const c=document.querySelector('#list .pcard');const vis=s=>[...c.querySelectorAll(s)].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').length;return JSON.stringify({kizon:vis('[data-f="kizon"]'),kouzou:vis('[data-f="kouzou"]'),memo:vis('[data-f="tb"]')});});const o=JSON.parse(r);const ok=o.kizon<=1&&o.kouzou<=1&&o.memo<=1;if(!ok)NG++;console.log((ok?'○':'★NG')+' PC'+W+'：既存・構造・メモがカードに二重に出ない '+r);await ctx.close();}
await b.close();})();
