/* §1058 現場記録帳ダッシュボード「ステータス分布」：スマホモードで表と円グラフが一画面に全部見えるか（2026-11-07a）
   本人のスマホで「表は右が切れ、円グラフも右へはみ出して見えない」（表と円グラフの横並び固定＋表が6列で画面幅より広い＋選択表示は横スクロール禁止）。
   ①スマホ縦（393・375）：表の幅が置き場の幅に収まる（横に切れない）
   ②円グラフが表の下にあり、左右とも画面の中に収まる
   ③金額の見出しに「(万円)」・全物件の見積金額が「万円」の数字（¥…-ではない）
   ④PC（1400）：直す前のまま＝表の右に円グラフ・金額は ¥…-
   使い方: node _check/sttphone.js [kirokucho_demo.html]   ※直す前の版（_before.html）を渡すと ①②③ が★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
async function open(b,vp,ph){
  const ctx=await b.newContext({...(ph?{viewport:vp,isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:vp}),serviceWorkers:'block'});
  await ctx.addInitScript(([ph,w,h])=>{ if(ph){ localStorage.setItem('nn_view_mode','mobile');
      try{Object.defineProperty(screen,'width',{get:()=>w});Object.defineProperty(screen,'height',{get:()=>h});}catch(e){} }
    sessionStorage.setItem('nn_vm_view','dash'); },[ph,vp.width,vp.height]);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(3000);
  await p.evaluate(()=>document.querySelector('#dashboard .nn-dnav button[data-k="stt"]').click());
  await p.waitForFunction(()=>{const s=document.querySelector('#dashboard .nn-dsel');return s&&s.querySelector('table.st-tbl')&&s.querySelector('svg');},null,{timeout:5000});
  const m=await p.evaluate(()=>{const sel=document.querySelector('#dashboard .nn-dsel');const tbl=sel.querySelector('table.st-tbl'),svg=sel.querySelector('svg');
    const r=e=>{const q=e.getBoundingClientRect();return {l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width};};
    const rows=[...tbl.querySelectorAll('tr')]; const last=rows[rows.length-1];
    return {cw:document.documentElement.clientWidth, side:r(tbl.parentElement), tbl:r(tbl), svg:r(svg),
      th:[...rows[0].querySelectorAll('th')].map(t=>t.textContent.replace(/[▲▼]/g,'').trim()),
      tot:last.cells[2]?last.cells[2].textContent.trim():''};});
  await ctx.close(); return {m,errs};
}
(async()=>{const b=await chromium.launch();
  for(const [nm,vp] of [['縦スマホ393',{width:393,height:852}],['細いスマホ375',{width:375,height:667}]]){
    const {m,errs}=await open(b,vp,true);
    ok(nm+'：表が置き場の幅に収まる（横に切れない）', m.tbl.w<=m.side.w+0.5, Math.round(m.tbl.w)+'px / 置き場'+Math.round(m.side.w)+'px');
    ok(nm+'：円グラフが表の下にあり左右とも画面の中', m.svg.t>=m.tbl.b-1 && m.svg.l>=0 && m.svg.r<=m.cw, JSON.stringify({svgL:Math.round(m.svg.l),svgR:Math.round(m.svg.r),svgT:Math.round(m.svg.t),tblB:Math.round(m.tbl.b),cw:m.cw}));
    ok(nm+'：金額の見出しに(万円)・全物件の見積金額が万円の数字', /\(万円\)/.test(m.th[2]||'') && /^[\d,]+$/.test(m.tot), (m.th[2]||'')+' / '+m.tot);
    ok(nm+'：JSエラーなし', !errs.length, errs.join(' '));
  }
  const {m,errs}=await open(b,{width:1400,height:900},false);
  /* ★§1063 で円グラフは表と上下中央そろえになったので「上端がそろう」ではなく「縦に重なる範囲にある」を見る（§1065 でタグが低くなり差が40pxを超えた） */
  ok('PC1400：表の右に円グラフ（横並びのまま）', m.svg.l>=m.tbl.r-1 && m.svg.b>m.tbl.t && m.svg.t<m.tbl.b, JSON.stringify({svgL:Math.round(m.svg.l),tblR:Math.round(m.tbl.r),svgT:Math.round(m.svg.t),tblT:Math.round(m.tbl.t)}));
  ok('PC1400：金額は ¥…- のまま（見出しに万円なし）', /^¥[\d,]+-$/.test(m.tot) && !/万円/.test(m.th[2]||''), m.tot);
  ok('PC1400：JSエラーなし', !errs.length, errs.join(' '));
  await b.close(); R.forEach(x=>console.log(x)); const ng=R.filter(x=>x.startsWith('★NG')).length; console.log(ng?'★NG '+ng+'件':'全部○');})();
