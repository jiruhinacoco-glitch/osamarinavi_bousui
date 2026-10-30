/* ダッシュボード（PC）の見た目の約束（2026-10-30p 本人の指示）：
   左の一覧の名前が平行四辺形の札の上（白い字）／件数と金額の数字は小さめ・前年同期などは大きめ／前年同期に絵の矢印（＋は上・−は下）／
   内訳は立体ボタン／「個別の現場記録へ」は細く絵は大きめ。スマホの数字の大きさは変えない。使い方: node _check/dashlook.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1600,height:800},serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','ichiran')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{const q=s=>document.querySelector(s), cs=(e,ps)=>getComputedStyle(e,ps||null), px=v=>parseFloat(v);
  const nb=q('#dashboard .nn-dnav button:not(.on) b'), bf=cs(nb,'::before');
  const up=q('#dashboard .yoy.positive'), gl=q('.go-list-btn');
  const kb=[...document.querySelectorAll('#dashboard .kbtn')].map(e=>Math.round(e.getBoundingClientRect().top)), nv=q('#dashboard .nn-dnav'), nbl=[...nv.querySelectorAll('button')].pop();
  return {kbTops:[...new Set(kb)], navGap:Math.round(nv.getBoundingClientRect().bottom-nbl.getBoundingClientRect().bottom), uline:cs(q('#dashboard .yoy .yoyv')||up).textDecorationLine, ywt:+cs(q('#dashboard .yoy .yoyv')||up).fontWeight, rows:['.kgm','.kgv','.kbtn'].map(s=>new Set([...document.querySelectorAll('#dashboard .kcell '+s)].map(e=>Math.round(e.getBoundingClientRect().top))).size).concat([new Set([...document.querySelectorAll('#dashboard .kcell .yoy')].map(e=>Math.round(e.getBoundingClientRect().top))).size]), frame:bf.content!=='none'&&/matrix/.test(bf.transform), white:cs(nb).color, kgh:px(cs(q('#dashboard .kgh b')).fontSize), kgv:px(cs(q('#dashboard .kgv')).fontSize),
    kgs:px(cs(q('#dashboard .kgs')).fontSize), yoy:px(cs(up).fontSize), arrow:/svg/.test(cs(up.querySelector('.yoyv')||up,'::before').backgroundImage), /* 2026-10-31f 矢印は数字（u.yoyv）の前へ移した */
    kbtn:cs(q('#dashboard .kbtn')).boxShadow, gl:Math.round(gl.getBoundingClientRect().height), glt:px(cs(gl.querySelector('.gl-t')).fontSize), gli:Math.round(gl.querySelector('.gl-ic').getBoundingClientRect().height)};});
ok('左の一覧の名前は元の黒い字（札・太いフチなし・2026-10-31b 本人の指示で戻した）', !r.frame&&r.white!=='rgb(255, 255, 255)', r);
ok('件数の数字は20px以下・金額は18px以下（10-31f 少し抑えた）', r.kgh<=20&&r.kgv<=18, {kgh:r.kgh,kgv:r.kgv});
ok('前年同期・粗利率などの字は12px以上', r.kgs>=12&&r.yoy>=12, {kgs:r.kgs,yoy:r.yoy});
ok('前年同期＋に絵の矢印', r.arrow);
ok('＋◯％は下線なし（10-31g 本人「リンクみたい」）・太字', r.uline==='none'&&r.ywt>=800, {u:r.uline,w:r.ywt});
ok('文字の高さがそろう（見出し・数字・前年同期・内訳が各マスで同じ高さ）', r.rows.every(x=>x===1), r.rows);
ok('▼内訳の高さがそろう（2026-10-31f）', r.kbTops.length===1, r.kbTops);
ok('左の一覧の枠の下に空きがない（12px以下）', r.navGap<=12, r.navGap);
ok('内訳は立体（下に色の厚み・10-31h で2pxに）', /0px [23]px 0px/.test(r.kbtn), r.kbtn);
ok('「個別の現場記録へ」は高さ46px以下・字は20px以下・絵は44px以上', r.gl<=46&&r.glt<=20&&r.gli>=44, {gl:r.gl,glt:r.glt,gli:r.gli});
ok('JSエラーなし', errs.length===0, errs.slice(0,2)); await ctx.close();
/* スマホは変えていない */
const c2=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await c2.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
const p2=await c2.newPage(); await p2.goto('http://localhost:8899/'+PG); await p2.waitForTimeout(2000);
const m=await p2.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#dashboard .kgv')).fontSize));
ok('スマホの金額の数字は今までどおり（15px）', m===15, m);
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
