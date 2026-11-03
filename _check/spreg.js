/* §1033 スマホで新規登録を通す：上の＋新規→工事名→平場を自前の数字パッドで300→保存→カードに300㎡。使い方: node _check/spreg.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;const ok=(c,m,x)=>{if(!c)NG++;console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):''));};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3500);
await p.locator('header button',{hasText:'新規'}).first().tap();await p.waitForTimeout(1000);
ok(await p.evaluate(()=>document.getElementById('modalbg').classList.contains('open')),'①上の「＋新規」で登録の窓が開く');
await p.locator('#f_name').tap();await p.keyboard.type('スマホ登録テスト');
/* 平場：数字の欄を押すと自前の数字パッド → 3 0 0 → 確定 */
await p.locator('#f_kouji .rf >> nth=0 >> .arr[data-k="平場"] input').tap();await p.waitForTimeout(400);
const pad=await p.evaluate(()=>!!document.querySelector('#nnNumpad.open'));
ok(pad,'②平場の欄を押すと数字パッドが出る');
for(const k of ['3','0','0']){await p.locator('#nnNumpad [data-k="'+k+'"]').tap();await p.waitForTimeout(80);}
await p.locator('#nnNumpad').getByText('確定').tap().catch(()=>{});await p.waitForTimeout(400);
const v=await p.evaluate(()=>document.querySelector('#f_kouji .rf .arr[data-k="平場"] input').value);
ok(v==='300','③数字パッドで300と入る',v);
const save=p.locator('#modalbg button',{hasText:'保存する'});await save.scrollIntoViewIfNeeded();await save.tap();await p.waitForTimeout(1800);
const r=await p.evaluate(()=>{const q=props.find(x=>x.name==='スマホ登録テスト');const c=q&&document.querySelector('#list .pcard[data-pid="'+q.id+'"]');if(c){c.scrollIntoView({block:'center'});nnTtlFitSp([c]);}
 return {saved:!!q,m:q&&q.m,closed:!document.getElementById('modalbg').classList.contains('open'),card:!!c,area:c?((c.querySelector('.sproofs .sprfv')||{}).textContent||''):''};});
ok(r.saved&&r.closed,'④保存すると窓が閉じ、現場ができる',r);
ok(r.card&&/300/.test(r.area)&&r.m===300,'⑤一覧のカードに屋根1・300㎡が出る',r);
ok(!errs.length,'⑥JSエラーなし',errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
