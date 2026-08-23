/* ★2026-08-24n 保存の失敗（容量オーバー）が無言にならないこと（§182）
   node _check/save1.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await (await b.newContext({viewport:{width:1200,height:800}})).newPage();
let alerted=null; p.on('dialog',async d=>{ alerted=d.message(); await d.accept(); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/genba_map_v36.html',{waitUntil:'load'}); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>typeof nnSet==='function'),'安全な保存の仕組みがある');
const r=await p.evaluate(()=>{
  const orig=localStorage.setItem.bind(localStorage);
  localStorage.setItem=()=>{ const e=new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e; };
  let threw=false, ret=null;
  try{ ret=nnSet('nn_test_quota','x'); }catch(e){ threw=true; }
  localStorage.setItem=orig; return {ret, threw};
});
ok(r.threw===false,'容量オーバーでも処理が止まらない（例外が外に出ない）');
ok(r.ret===false,'保存できなかったことを戻り値で知らせる');
await p.waitForTimeout(300);
ok(!!alerted && /容量/.test(alerted),'利用者にはっきり知らせる',alerted&&alerted.slice(0,30));
/* 保存が通常どおり効くこと */
ok(await p.evaluate(()=>{ const okk=nnSet('nn_test_quota','abc');
  const v=localStorage.getItem('nn_test_quota'); localStorage.removeItem('nn_test_quota');
  return okk===true && v==='abc'; }),'ふだんは今までどおり保存できる');
/* 無防備な保存が残っていないこと（ソースの点検） */
const src=await (await fetch('http://localhost:8899/genba_map_v36.html')).text();
let bad=0; src.replace(/localStorage\.setItem\([^)]*\)/g,(m,i)=>{
  const ctx=src.slice(Math.max(0,i-260), i+m.length);
  if(!/try/.test(ctx) && !/nnSet/.test(ctx)) bad++; return m; });
ok(bad===0,'無防備な保存が残っていない',bad);
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
