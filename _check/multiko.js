/* ★2026-09-25w 1つの現場に工法が複数（部位ごとに別の防水）のとき、どこで見ても同じ中身か（本人「ちぐはぐにしない」）
   新規物件登録：平場＝塩ビ機械固定(S-M2)・立上り＝ウレタン通気緩衝(X-1) で保存し、
   ① 防水メーカーの欄が工法から自動で入る（塩ビ→アーキヤマデ）
   ② 一覧カードの頭に工法が2つ（S-M2・X-1）
   ③ メーカーが2つ（ヤマデ・田島）
   ④ 仕様欄に2つの工法と数量（400㎡・20㎡）が出る（「ほか◯工法」で隠さない）
   ⑤ 詳細の「工法」欄も同じ2つ・同じメーカー・同じ数量
   ⑥ 再読み込みしても同じ
   使い方：node _check/multiko.js [ファイル名]（http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const exe=fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).map(d=>'/opt/pw-browsers/'+d+'/chrome-linux/chrome')[0];
const file=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m,x)=>{ console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c) ng++; };
const NAME='複数工法テスト現場';
(async()=>{const b=await chromium.launch({executablePath:exe});
const ctx=await b.newContext({viewport:{width:1600,height:950},serviceWorkers:'block'}); const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/'+file); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>openModal()); await p.waitForTimeout(400);
const mk=await p.evaluate((NAME)=>{
  document.getElementById('f_name').value=NAME;
  const rf=document.querySelector('#f_kouji .rf'), k=rf.querySelector('.rfk');
  k.value='塩ビシート防水 機械固定(S-M2)'; k.dispatchEvent(new Event('change'));
  const arr=[...rf.querySelectorAll('.arr')];
  const H=arr.find(a=>a.dataset.k==='平場'), T=arr.find(a=>a.dataset.k==='立上り');
  H.querySelector('input').value=400; H.querySelector('input').dispatchEvent(new Event('input'));
  T.dataset.ko='ウレタン塗膜 通気緩衝工法(X-1)'; T.querySelector('input').value=20; T.querySelector('input').dispatchEvent(new Event('input'));
  return (rf.querySelector('.rfm')||{}).value; },NAME);
ok(mk==='アーキヤマデ','① 防水メーカーが工法から自動で入る',mk);
await p.evaluate(()=>saveProperty()); await p.waitForTimeout(600);
const modalOpen=await p.evaluate(()=>document.getElementById('modalbg').classList.contains('open')); ok(!modalOpen,'保存できた（窓が閉じた）');
await p.evaluate(()=>showView('list')); await p.waitForTimeout(500);
const look=async()=>p.evaluate((NAME)=>{
  const c=[...document.querySelectorAll('#list .pcard')].find(c=>c.textContent.includes(NAME)); if(!c) return null;
  return {heads:[...c.querySelectorAll('.rhead .badge')].map(e=>e.textContent.trim()),
    mks:[...c.querySelectorAll('.mkchip')].map(e=>e.textContent.trim()),
    spec:(c.querySelector('.qsum.kolist')||c.querySelector('[data-f="kouhou"]')||{}).textContent||'' , id:+((c.querySelector('.pgo')||{}).getAttribute('onclick')||'').replace(/\D/g,'')}; },NAME);
let r=await look();
ok(r&&r.heads.join()==='S-M2,X-1','② カードの頭に工法が2つ',r&&r.heads);
ok(r&&r.mks.join()==='ヤマデ,田島','③ メーカーが2つ',r&&r.mks);
ok(r&&/塩ビシート防水 機械固定\(S-M2\) 400㎡/.test(r.spec)&&/ウレタン塗膜 通気緩衝工法\(X-1\) 20㎡/.test(r.spec)&&!/ほか/.test(r.spec),'④ 仕様欄に2つの工法と数量',r&&r.spec);
const det=await p.evaluate((id)=>{ nnGoDetail(id); return new Promise(res=>setTimeout(()=>{
  const dt=[...document.querySelectorAll('#detail dt, .kv dt')].find(d=>d.textContent.trim()==='工法'); res(dt?dt.nextElementSibling.textContent:null); },500)); },r&&r.id);
ok(det&&/塩ビシート防水 機械固定\(S-M2\)\s*ヤマデ／400㎡/.test(det)&&/ウレタン塗膜 通気緩衝工法\(X-1\)\s*田島／20㎡/.test(det),'⑤ 詳細の工法欄も同じ2つ・メーカー・数量',det);
/* 詳細を開いたまま再読み込みすると詳細の画面に戻るので、一覧に戻してから */
await p.evaluate(()=>showView('list')); await p.waitForTimeout(300);
await p.reload(); await p.waitForTimeout(1500); await p.click('#vt_list'); await p.waitForTimeout(800);
const r2=await look();
ok(r2&&JSON.stringify([r2.heads,r2.mks,r2.spec])===JSON.stringify([r.heads,r.mks,r.spec]),'⑥ 再読み込みしても同じ',r2);
ok(!errs.length,'エラーなし',errs);
await b.close(); console.log(ng?('★NG '+ng+'件'):'すべて○');})();
