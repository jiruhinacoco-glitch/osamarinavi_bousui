/* B3：元請が客先未登録のとき出る「客先に登録／あとで」の帯。「あとで」を押したら、その物件では次の保存で聞き直さない（開き直しても）。
   別の物件では今までどおり出る。使い方: node _check/latermoto.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1280,height:860},serviceWorkers:'block'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
/* 客先に無い元請の物件を2つ探す（検査側で客先一覧と突き合わせる） */
const ids=await p.evaluate(()=>{const db=nnMaster.tokuiLoad()||{}, n=s=>String(s||'').replace(/\s/g,'');
  const reg=new Set((db.moto||[]).map(x=>n(x&&x.name)));
  return props.filter(q=>q.moto&&!/未入力|直/.test(q.moto)&&!reg.has(n(q.moto))).slice(0,2).map(q=>q.id);});
ok('客先未登録の元請の物件が2つある（検査の前提）', ids.length===2, ids);
const save=async id=>{ await p.evaluate(id=>{const b=document.getElementById('nnSrBar'); if(b) b.classList.remove('on'); openModal(id);},id); await p.waitForTimeout(500);
  await p.evaluate(()=>saveProperty()); await p.waitForTimeout(600);
  return p.evaluate(()=>{const b=document.getElementById('nnSrBar'); return !!(b&&b.classList.contains('on'));}); };
ok('1回目の保存で帯が出る', await save(ids[0]));
await p.evaluate(()=>document.querySelector('#nnSrBar .ng').click()); await p.waitForTimeout(300);
ok('「あとで」のあと同じ物件の保存では出ない', !(await save(ids[0])));
await p.reload(); await p.waitForTimeout(1800);
ok('開き直しても同じ物件では出ない', !(await save(ids[0])));
ok('別の物件では出る', await save(ids[1]));
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
