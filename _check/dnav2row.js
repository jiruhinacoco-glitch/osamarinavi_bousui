/* ★2026-10-29n 記録帳ダッシュボードの目次（.nn-dnav）をスマホで「2行・全部見える」にした検証
   本人「横スクロールバーは不要。2行にして、スクロールしなくても全部表示されるように」「選択中は全体と同じオレンジに（全物件が緑）」
   ★2026-10-29p 本人「余白が目立つ・もっと細く・3行でもよい」→ スマホ表示は 4列×3行、通常表示は 6列×2行（札は横長・背が低い）
   ①12項目がスマホ表示3行・通常表示2行・札の高さ（スマホ表示26px以下・通常表示34px以下） ②横にはみ出さない（scrollWidth＝clientWidth）・枠の外に出る札が無い ③名前が札の幅に収まる
   ④横スクロールバー（.nn-dnav-sb）が無い ⑤絞り込みの段の選択中（全物件）が目次の選択中と同じオレンジ
   （スマホ表示・縦／通常表示・横／通常表示・縦）
   使い方: node _check/dnav2row.js [ページ]（http://localhost:8899 で配信しておくこと）。直す前の版は①②⑤が落ちる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,240):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [vm,vp] of [['mobile',{width:393,height:852}],['ichiran',{width:852,height:393}],['ichiran',{width:393,height:852}]]){
 const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await ctx.addInitScript(v=>{try{localStorage.setItem('nn_view_mode',v)}catch(_){}},vm);
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(2200);
 const r=await p.evaluate(()=>{const n=document.querySelector('#dashboard .nn-dnav'); const nr=n.getBoundingClientRect(); const bs=[...n.querySelectorAll('button')];
  const tops=[...new Set(bs.map(b=>Math.round(b.getBoundingClientRect().top)))];
  const out=bs.filter(b=>{const r=b.getBoundingClientRect(); return r.right>nr.right+1||r.left<nr.left-1;}).map(b=>b.textContent.trim());
  const cut=bs.filter(b=>{const t=b.querySelector('b'); return t&&(t.scrollWidth>t.clientWidth+1||t.getBoundingClientRect().right>b.getBoundingClientRect().right+1);}).map(b=>b.textContent.trim());
  const bg=e=>getComputedStyle(e).backgroundImage; const chip=document.querySelector('#dashboard .stbar .stchip.on'), on=n.querySelector('button.on');
  const hs=bs.map(b=>b.getBoundingClientRect().height);
  return {n:bs.length, rows:tops.length, hmax:Math.max(...hs), sw:n.scrollWidth, cw:n.clientWidth, out, cut, sb:!!document.querySelector('.nn-dnav-sb'), chipBg:bg(chip), onBg:bg(on)};});
 const t=vm+'('+vp.width+'×'+vp.height+') ';
 const R=vm==='mobile'?3:2, HM=vm==='mobile'?26:34;   /* 通常表示は幅980で組むので、測った値がそのまま980の物差し */
 ok(t+'①12項目が'+R+'行・札が細い', r.n===12&&r.rows===R&&r.hmax<=HM+0.5, {n:r.n,rows:r.rows,hmax:r.hmax,HM});
 ok(t+'②横にはみ出さない・枠の外に出る札が無い', r.sw<=r.cw+1&&r.out.length===0, {sw:r.sw,cw:r.cw,out:r.out});
 ok(t+'③名前が札の幅に収まる', r.cut.length===0, r.cut);
 ok(t+'④横スクロールバーが無い', !r.sb);
 ok(t+'⑤全物件（選択中）が目次の選択中と同じオレンジ', r.chipBg===r.onBg&&/255, 145, 36/.test(r.chipBg), r.chipBg.slice(0,80));
 ok(t+'JSエラーなし', errs.length===0, errs.slice(0,2));
 await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
