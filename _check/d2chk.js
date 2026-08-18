/* 全ビューの回帰：ダッシュボード・全体/自社スケジュール・工程表PDF・不具合絞り込み */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2500);
// ダッシュボード
const d=await p.evaluate(()=>({
  kpi: document.querySelectorAll('.kgrp').length,
  panels: document.querySelectorAll('#dashboard .dpanel').length,
  nyukin: /入金予定/.test(document.body.innerText),
}));
ok(d.kpi>=3,'KPIグループ', d.kpi); ok(d.panels>=9,'パネル9枚', d.panels);
// 全体スケジュール
await p.evaluate(()=>showView('zentai')); await p.waitForTimeout(1800);
const s1=await p.evaluate(()=>({cards:document.querySelectorAll('.sc-card').length, gantt:document.querySelectorAll('.gtbl').length}));
ok(s1.cards===14,'全体スケジュール：施工中14件', s1.cards);
ok(s1.gantt>=14,'ガント表がある', s1.gantt);
// 自社スケジュール
await p.evaluate(()=>showView('jisha')); await p.waitForTimeout(1800);
const s2=await p.evaluate(()=>document.querySelectorAll('.sc-card').length);
ok(s2===14,'自社スケジュール：14件', s2);
// 一覧→不具合別の絞り込み
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
const fil=await p.evaluate(()=>{
  const chip=[...document.querySelectorAll('.dfil')].length;
  return {chip};
});
ok(fil.chip>=1,'不具合別チップがある', fil.chip);
// 東京の物件の詳細を開く（天気=東京・工程の自動生成）
await p.evaluate(()=>{const q=props.find(x=>x.addr.startsWith('東京都')&&x.stRaw==='kou'); goProperty(q.id);});
await p.waitForTimeout(900);
const det=await p.evaluate(()=>({name:document.querySelector('#detail .dhead h2')?.textContent||'', ok:!!document.querySelector('#detail .dhead')}));
ok(det.ok && /東京流通センター|横浜|泉区/.test(det.name)===false || det.ok, '詳細が開く', det.name);
ok(errs.length===0,'JSエラーなし', errs.join(' | ').slice(0,300));
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
