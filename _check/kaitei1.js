/* 材料登録：価格改定の履歴＋価格表の一括取り込み（2026-08-20b） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zairyo_toroku.html'); await p.waitForTimeout(1400);
await p.evaluate(()=>{ localStorage.removeItem('zairyo_mine_v1'); });
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1400);

/* ① カタログから1品登録して単価を入れる */
await p.evaluate(()=>{ const c=CATALOG.find(x=>x.n==='水性プライマーAS');
  const it=newItemFromCatalog(c); it.price=6850; items.push(it); save(); render(); });
/* ② 単価を変えると履歴に残る（saveDetail 経由） */
await p.evaluate(()=>{ sel={type:'item', id:items[0].id}; render(); });
await p.waitForTimeout(400);
await p.evaluate(()=>{ document.getElementById('d_price').value='7800'; saveDetail(); });
const h1=await p.evaluate(()=>({price:items[0].price, hist:items[0].hist}));
ok(h1.price===7800 && h1.hist && h1.hist.length===1 && h1.hist[0].p===6850,
   '単価を変えると前の単価が日付つきで履歴に残る', h1);
/* ③ 詳細に「価格改定」の行が出る */
await p.evaluate(()=>{ sel={type:'item', id:items[0].id}; render(); }); await p.waitForTimeout(400);
const row=await p.evaluate(()=>{ const d=document.getElementById('nnHistRow');
  return d?d.textContent:''; });
ok(/価格改定/.test(row) && /6,850/.test(row) && /7,800/.test(row) && /\+13\.9%/.test(row),
   '詳細に「価格改定 ¥6,850→¥7,800 +13.9%」が出る', row.slice(0,80));

/* ④ 一括取り込み：Excel貼り付け（タブ区切り・改定列が複数＝最右を採用） */
await p.evaluate(()=>nnPriceImportOpen()); await p.waitForTimeout(300);
await p.evaluate(()=>{
  document.getElementById('nnPimpTx').value=
    '製品名\t~2021/08\t2022/12~\n'+
    '水性プライマーAS\t6,850\t8,200\n'+          /* 登録済 → 更新（最右の 8,200 を採る） */
    'アスファルトプライマー\t4,300\t5,200\n'+     /* 未登録・カタログにある → 新規 */
    '存在しない製品X\t9,999\n';                    /* → 見つからない */
  document.getElementById('nnPimpChk').click();
});
await p.waitForTimeout(400);
const prev=await p.evaluate(()=>document.getElementById('nnPimpPrev').textContent);
ok(/更新 1件/.test(prev)&&/新規 1件/.test(prev)&&/見つからない 1件/.test(prev),'照合結果（更新1・新規1・不明1）', prev.match(/更新.*件/)[0]);
ok(/8,200/.test(prev),'改定列が並ぶ表は一番右（最新）を単価に採る');
await p.evaluate(()=>document.getElementById('nnPimpGo').click()); await p.waitForTimeout(400);
const after=await p.evaluate(()=>({n:items.length,
  a:items.find(x=>x.n==='水性プライマーAS'), b:items.find(x=>x.n==='アスファルトプライマー')}));
ok(after.n===2 && after.a.price===8200 && after.b.price===5200,'まとめて更新・新規登録される',{a:after.a.price,b:after.b.price});
ok(after.a.hist.length===2 && after.a.hist[1].p===7800,'取り込みでも前の単価が履歴に残る', after.a.hist);
/* ⑤ 再読み込みしても履歴が残る */
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1400);
const persist=await p.evaluate(()=>items.find(x=>x.n==='水性プライマーAS').hist.length);
ok(persist===2,'再読み込みしても履歴が残る', persist);
ok(errs.length===0,'JSエラーなし',errs);
await b.close(); process.exit(ng?1:0);
})();
