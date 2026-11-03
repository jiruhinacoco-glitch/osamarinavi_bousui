/* §1031 役物の合計㎡（x.a）は数量（登録の合計・工法ごとの内訳）にも入る。役物を別の工法にするとその工法の行が別にできる。使い方: node _check/yakufaces.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:900},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3000);
await p.evaluate(()=>openModal());await p.waitForTimeout(800);
await p.fill('#f_name','工法別確認');await p.fill('#f_kouji .rf >> nth=0 >> .arr[data-k="平場"] input','300');
await p.click('#f_kouji .rf >> nth=0 >> .aradd');await p.waitForTimeout(300);
await p.evaluate(()=>{const o=[...document.querySelectorAll('#nnSelPop .o, #nnSelPop [data-v]')].find(x=>/役物周り/.test(x.textContent));o.click();});await p.waitForTimeout(300);
await p.fill('#f_kouji .rf >> nth=0 >> .arr[data-k="役物周り"] > input','50');
const tom=await p.evaluate(()=>{const K=Object.keys(KO_MASTER);const t=K.find(k=>/塗膜/.test(k)&&!/ウレタン/.test(k))||K.find(k=>/アス/.test(k)&&k!==document.querySelector('#f_kouji .rfk').value);const a=document.querySelector('#f_kouji .arr[data-k="役物周り"]');a.dataset.ko=t;return t;});
await p.fill('#f_kouji .rf >> nth=0 >> .arr[data-k="役物周り"] input.ya','12.5');await p.waitForTimeout(300);
const f=await p.evaluate(()=>window.nnFFCollect?nnFFCollect().map(x=>x.n+'|'+x.ko+'|'+x.q+x.un):[]);
console.log(tom);console.log(JSON.stringify(f));
const ok=f.some(x=>/役物周り/.test(x)&&/12\.5㎡/.test(x))&&f.some(x=>/\|300㎡/.test(x));console.log(ok?'○':'★NG','役物を別の工法にすると、その工法の数量（12.5㎡）が別の行になる');
await b.close();})();
