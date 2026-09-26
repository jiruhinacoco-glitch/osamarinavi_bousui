/* ★2026-09-26g 材料登録「📷 カタログ読込」（§524）
   カタログを撮る → 読み取った一覧を確かめる（あいまいな行は黄色）→ チェックした材料を登録。
   使い方: node _check/catread.js ／ node _check/catread.js _before.html（直す前は★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zairyo_toroku.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const PH of [false,true]){
  const T=PH?'スマホ ':'PC ';
  const p=await b.newPage(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{ try{localStorage.clear();}catch(_){} }); await p.reload(); await p.waitForTimeout(900);
  const btn=await p.$('header button[onclick="nnCatReadOpen()"]');
  ok(!!btn, T+'① 見出しに「📷 カタログ読込」がある');
  if(!btn){ await p.close(); continue; }
  const hb=await p.evaluate(()=>{ const r=document.querySelector('header button[onclick="nnCatReadOpen()"]').getBoundingClientRect(); return {r:r.right,w:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth}; });
  ok(hb.r<=hb.w+1 && hb.sw<=hb.w+1, T+'① ボタンが画面からはみ出さない', hb);
  await btn.click(); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>{ const m=document.getElementById('nnCatRead'); return !!(m&&m.classList.contains('open')); }), T+'② 押すと読み込みの窓が開く');
  await p.click('#nnCrGo'); await p.waitForTimeout(400);
  const t=await p.evaluate(()=>{ const tr=[...document.querySelectorAll('#nnCatRead tbody tr')];
    const get=n=>{ const r=tr.find(x=>x.querySelector('input[data-k="n"]').value===n); return r?r.querySelector('.nncr-u').textContent:null; };
    return {n:tr.length, warn:tr.filter(x=>x.classList.contains('warn')).map(x=>x.querySelector('input[data-k="n"]').value).sort(),
      fc:get('マットFCⅡ'), uf:get('強力アンダーF'), oc:get('オールコート'), ap:get('ASパッチ'), vs:get('ステンレスベーパスNⅡ'),
      over:(()=>{ const m=document.querySelector('#nnCatRead .modal').getBoundingClientRect(); return m.right>document.documentElement.clientWidth+1||m.left<-1; })()}; });
  ok(t.n===22, T+'③ 見本の22品が一覧に出る', t.n);
  /* 黄色＝見本で「あいまい」と書いた6品（この検査の中で名前を並べた期待値） */
  const W=['GCライン','SPトナー','レイヤキャップ','レイヤソフト','水性プライマーC','速硬化OTプライマーMブルー'].sort();
  ok(JSON.stringify(t.warn)===JSON.stringify(W), T+'④ あいまいな6品だけ黄色', t.warn);
  /* 規格→内容量（手で計算：1.05m×50m＝52.5㎡、1m×16m＝16㎡、0.2m×16m＝3.2㎡） */
  ok(t.fc==='52.5㎡／巻' && t.uf==='16㎡／巻' && t.oc==='20kg／セット' && t.ap==='3.2㎡／巻' && t.vs==='1個／箱', T+'⑤ 規格から発注単位・内容量を読む', t);
  ok(!t.over, T+'⑤ 窓が画面の幅に収まる');
  await p.click('#nnCrReg'); await p.waitForTimeout(500);
  const st=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_materials_v1')||'{}'); const it=d.items||[];
    return {n:it.length, noPrice:it.every(x=>x.price==null), maker:[...new Set(it.map(x=>x.maker))], mine:document.getElementById('vt_mine').classList.contains('on')}; });
  ok(st.n===22 && st.noPrice && st.maker.length===1 && st.maker[0]==='東西アスファルト事業協同組合', T+'⑥ 22品が単価なしで登録・保存される（メーカーは表紙から）', st);
  ok(st.mine, T+'⑥ 登録後は「登録済み材料」を開く');
  await p.evaluate(()=>nnCatReadOpen()); await p.click('#nnCrGo'); await p.waitForTimeout(400);
  const d2=await p.evaluate(()=>({dup:document.querySelectorAll('#nnCatRead tbody tr.dup').length, on:document.querySelectorAll('#nnCatRead tbody .nncr-on:checked').length}));
  ok(d2.dup===22 && d2.on===0, T+'⑦ もう一度読むと全部「登録済み」でチェックなし（二重登録しない）', d2);
  ok(errs.length===0, T+'JSエラーなし', errs);
  await p.close();
}
await b.close(); console.log((ng?'★NG':'○')+' '+ng+'件'); process.exit(ng?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
