/* §1048 スマホのダッシュボードの目次の名前が、開くたびに空になることがあった（選んでいないパネルの見出しには .httl-text が作られない）。
   8回開いて、毎回12個の名前が全部そろうこと。直す前の版は★NG（8回中1回ほぼ全部空）。使い方: node _check/dnavname.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{const b=await chromium.launch();const seen={};
for(let i=0;i<8;i++){const ctx=await b.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:UAP,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','dash');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(5000);
const r=await p.evaluate(()=>[...document.querySelectorAll('.nn-dnav button b')].map(b=>b.textContent));
const k=JSON.stringify(r);seen[k]=(seen[k]||0)+1;await ctx.close();}
const W=JSON.stringify(["全体","請求記録","完成工事の予実","要対応","受注率","受注金額推移","施工中の現場","ステータス分布","歩掛実績","入金予定","工法別受注","元請別受注"]);
const ok=Object.keys(seen).length===1&&Object.keys(seen)[0]===W;Object.entries(seen).forEach(([k,n])=>console.log('  '+n+'回',k));
console.log((ok?'○':'★NG')+' スマホのダッシュボードの目次：8回開いて8回とも12個の名前が全部出る');console.log(ok?'全部○':'★NG 1件');await b.close();})();
