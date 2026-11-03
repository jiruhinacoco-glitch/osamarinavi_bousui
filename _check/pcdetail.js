/* §1032 PCで幅1500px以上（2列）でも、カードの「詳細」ボタン・提出書類のアイコンで現場詳細が開く（詳細の幅が画面いっぱい）。直す前の版は★NG。
   使い方: node _check/pcdetail.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
(async()=>{const b=await chromium.launch();
for(const W of [1400,1754,2000]) for(const how of ['詳細ボタン','書類アイコン']){const ctx=await b.newContext({viewport:{width:W,height:950}});await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
 const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
 const c=p.locator('#list .pcard').first();if(how==='詳細ボタン')await c.locator('.pgo').click();else await c.locator('.pdocs th button').first().click();await p.waitForTimeout(1200);
 const w=await p.evaluate(()=>{const D=document.getElementById('detail');return D?Math.round(D.getBoundingClientRect().width):0;});const vw=W;
 const ok=w>vw*0.6;if(!ok)NG++;console.log((ok?'○':'★NG')+' PC'+W+'：'+how+'で現場詳細が開く（幅'+w+'px）');await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
