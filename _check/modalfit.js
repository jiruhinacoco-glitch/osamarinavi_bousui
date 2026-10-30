/* 新規物件登録・編集の窓（PC）がスクロールなしの1画面に収まる（2026-10-31e 本人）。
   ①新規で削除の段（点線）が出ない ②1920×1080・1600×900・1366×768 で縦にはみ出さない ③入力欄が高くなる端末（書体の違い）を作っても縮めて収まる ④編集では削除ボタンが出る
   使い方: node _check/modalfit.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const meas=p=>p.evaluate(()=>{const m=document.querySelector('#modalbg .modal'), d=document.getElementById('nnDelRow'); return {over:m.scrollHeight-m.clientHeight, delRowShown:!!(d&&d.offsetParent)};});
for(const [w,h] of [[1920,1080],[1600,900],[1366,768]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},serviceWorkers:'block'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
  await p.evaluate(()=>openModal()); await p.waitForTimeout(700); const r=await meas(p);
  ok(w+'×'+h+' 新規：はみ出さない・削除の段なし', r.over<=0&&!r.delRowShown, r);
  if(w===1600){ await p.evaluate(()=>closeModal()); await p.addStyleTag({content:'#modalbg .modal input,#modalbg .modal select{height:34px !important}'});
    await p.evaluate(()=>openModal()); await p.waitForTimeout(700); const t=await meas(p); ok('入力欄が高い端末でも縮めて収まる', t.over<=0, t);
    await p.evaluate(()=>{closeModal(); openModal(props[0].id);}); await p.waitForTimeout(700); const e=await meas(p); ok('編集では削除ボタンの段が出る', e.delRowShown, e); }
  ok(w+' JSエラーなし', errs.length===0, errs.slice(0,2)); await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
