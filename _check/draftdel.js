/* §1033 下書き保存→開き直すと残る→保存→新規は空→削除で消える→読み込み直しても消えたまま（PC2000）。使い方: node _check/draftdel.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;const ok=(c,m,x)=>{if(!c)NG++;console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):''));};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:2000,height:940},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3500);
/* 下書き：新規で工事名だけ入れて「下書き保存して閉じる」→ もう一度新規を開くと工事名が残っている */
await p.evaluate(()=>openModal());await p.waitForTimeout(700);await p.fill('#f_name','下書き確認の現場');
await p.locator('#modalbg button',{hasText:'下書き保存して閉じる'}).click();await p.waitForTimeout(800);
const closed=await p.evaluate(()=>!document.getElementById('modalbg').classList.contains('open'));
await p.evaluate(()=>openModal());await p.waitForTimeout(900);
const dv=await p.evaluate(()=>document.getElementById('f_name').value);
ok(closed&&dv==='下書き確認の現場','①下書き保存して閉じる→新規を開き直すと工事名が残っている',{closed,dv});
/* 保存してから削除 */
await p.evaluate(()=>saveProperty());await p.waitForTimeout(1500);
const n0=await p.evaluate(()=>props.length);const pid=await p.evaluate(()=>(props.find(x=>x.name==='下書き確認の現場')||{}).id);
ok(!!pid,'②その下書きのまま保存できる',pid);
await p.evaluate(()=>openModal());await p.waitForTimeout(900);const dv2=await p.evaluate(()=>document.getElementById('f_name').value);await p.evaluate(()=>closeModal());await p.waitForTimeout(400);
ok(dv2==='','②b 保存したあとに新規を開くと下書きは消えている（同じ現場を二重に作らない）',dv2);
await p.evaluate(pid=>openModal(pid),pid);await p.waitForTimeout(900);
const delVis=await p.evaluate(()=>{const b=document.getElementById('f_delBtn');return !!b&&b.offsetWidth>0;});
await p.click('#f_delBtn');await p.waitForTimeout(1500);
const r=await p.evaluate(pid=>({gone:!props.some(x=>x.id===pid),n:props.length,card:!!document.querySelector('#list .pcard[data-pid="'+pid+'"]'),closed:!document.getElementById('modalbg').classList.contains('open')}),pid);
ok(delVis&&r.gone&&!r.card&&r.closed&&r.n===n0-1,'③編集の窓の「この物件を削除」で消える（一覧からも）',{delVis,...r});
await p.reload();await p.waitForTimeout(3500);
const after=await p.evaluate(()=>props.some(x=>x.name==='下書き確認の現場'));
ok(!after,'④読み込み直しても消えたまま',after);
ok(!errs.length,'⑤JSエラーなし',errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
