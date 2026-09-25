/* ★2026-09-25u 客先登録：元請・仕入先・メーカー・協力業者の4つ（本人の指示）
   ① タブが4つ・見出しの絵 btn_kyakusaki.png が出る
   ② 前の保存（元請・仕入先だけ）を開いても元の中身が消えず、メーカー・協力業者が足される
   ③ 新規顧客登録で「メーカー・直接買う」を保存 → メーカーに入り、仕入先の一覧にも「メーカー直」で出る
   ④ 協力業者で保存 → できる工事・手間単価が残る
   使い方：node _check/tokui4.js [ファイル名]（http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const exe=fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).map(d=>'/opt/pw-browsers/'+d+'/chrome-linux/chrome')[0];
const file=process.argv[2]||'index.html';
let ng=0; const ok=(c,m,x)=>{ console.log((c?'○ ':'★NG ')+m+(x?'  '+JSON.stringify(x):'')); if(!c) ng++; };
(async()=>{const b=await chromium.launch({executablePath:exe});
const ctx=await b.newContext({viewport:{width:1400,height:900},serviceWorkers:'block'}); const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/index.html'); await p.evaluate(()=>{ localStorage.setItem('nn_tokui_v1',JSON.stringify({moto:[{id:'x',name:'前の元請'}],shiire:[{id:'y',name:'前の商社'}]})); });
await p.goto('http://localhost:8899/'+file); await p.waitForTimeout(1500);
await p.evaluate(()=>nnTokuiOpen()); await p.waitForTimeout(300);
const r1=await p.evaluate(async()=>{ const im=document.querySelector('#nnTokui .tkhd img');
  const loaded=im?await new Promise(res=>{ if(im.complete) return res(im.naturalWidth>0); im.onload=()=>res(true); im.onerror=()=>res(false); }):false;
  return {tabs:[...document.querySelectorAll('#nnTokui .tktabs button')].map(b=>b.textContent.trim()), img:!!im&&/btn_kyakusaki/.test(im.src)&&loaded}; });
ok(r1.tabs.join()==='元請,仕入先,メーカー,協力業者','① タブが4つ',r1.tabs);
ok(r1.img,'① 見出しの絵 btn_kyakusaki.png');
const r2=await p.evaluate(()=>{ nnTokuiTab('moto'); const m=[...document.querySelectorAll('#nnTokuiBody .tkrow .nm')].map(e=>e.textContent);
  nnTokuiTab('maker'); const mk=document.querySelectorAll('#nnTokuiBody .tkrow').length; nnTokuiTab('kyoryoku'); const ky=document.querySelectorAll('#nnTokuiBody .tkrow').length; return {m,mk,ky}; });
ok(r2.m.join()==='前の元請'&&r2.mk>0&&r2.ky>0,'② 前の保存を開いても元請はそのまま・メーカー/協力業者が足される',r2);
await p.evaluate(()=>{ nnTokuiTab('maker'); nnTokuiAdd(); }); await p.waitForTimeout(300);
await p.evaluate(()=>{ document.querySelector('#rg_seg button[data-t="maker"]').click(); document.getElementById('rg_name').value='直買いメーカー';
  document.querySelector('#rg_choku button[data-v="1"]').click(); document.querySelector('#nnReg .ok').click(); }); await p.waitForTimeout(300);
const r3=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_tokui_v1')); nnTokuiTab('shiire');
  return {maker:(d.maker||[]).filter(x=>x.name==='直買いメーカー'&&x.choku===true).length, moto:d.moto.map(x=>x.name), shiire:d.shiire.map(x=>x.name),
    list:[...document.querySelectorAll('#nnTokuiBody .tkrow .nm')].map(e=>e.textContent)}; });
ok(r3.maker===1,'③ メーカー・直接買う で保存される',r3.maker);
ok(r3.list.some(t=>/直買いメーカー/.test(t)&&/メーカー直/.test(t))&&r3.shiire.join()==='前の商社'&&r3.moto.join()==='前の元請','③ 仕入先の一覧にも「メーカー直」で出る（仕入先の保存は増えない）',r3);
await p.evaluate(()=>{ nnTokuiTab('kyoryoku'); nnTokuiAdd(); }); await p.waitForTimeout(300);
await p.evaluate(()=>{ document.querySelector('#rg_seg button[data-t="kyoryoku"]').click(); document.getElementById('rg_name').value='手間の会社';
  document.getElementById('rg_koushu').value='ウレタン'; document.getElementById('rg_tanka').value='㎡1000円'; document.querySelector('#nnReg .ok').click(); }); await p.waitForTimeout(300);
const r4=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_tokui_v1')); return (d.kyoryoku||[]).filter(x=>x.name==='手間の会社')[0]||null; });
ok(r4&&r4.koushu==='ウレタン'&&r4.tanka==='㎡1000円','④ 協力業者：できる工事・手間単価が残る',r4);
ok(!errs.length,'エラーなし',errs);
await b.close(); console.log(ng?('★NG '+ng+'件'):'すべて○');})();
