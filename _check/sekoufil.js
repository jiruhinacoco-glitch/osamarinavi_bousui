/* §1062 現場記録帳ダッシュボード「施工中の現場」：上の絞り込み（メーカーなど）がこの表に効くか・目次の件数が行数と合うか・メーカーが札か（2026-11-07e）
   本人「メーカー＝田島で絞っているのにロンシールが出る」。原因＝施工中の表だけ fPass を通していなかった。
   目次の「◯件」は見出し行まで数えて1件多かった。
   ①PC・スマホ：絞り込みなしで、行数＝検査側で数えた施工中の件数、目次の件数＝行数
   ②メーカー「田島」で絞ると、行数＝検査側で数えた「施工中かつメーカー田島」の件数。目次の件数も同じ
   ③各行のメーカーが札（.mkt）で出る
   ④スマホ：数量・完成予定・請負額・見込粗利・元請の欄が切れない（scrollWidth≦clientWidth）
   使い方: node _check/sekoufil.js [kirokucho_demo.html]   ※直す前の版（_before.html）は ①②③ が★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const MEAS=()=>{const sel=document.querySelector('#dashboard .nn-dsel'); const rows=[...sel.querySelectorAll('tr.click')];
  const badge=(document.querySelector('#dashboard .nn-dnav button[data-k="sekou"]')?.textContent||'').match(/(\d+)件/);
  /* 検査側で独立に数える（画面の抽出は呼ばない） */
  const want=props.filter(p=>p.stRaw==='kou'&&(!dashFil.maker.size||dashFil.maker.has(p.maker||'—'))).length;
  const chips=rows.filter(tr=>tr.querySelector('.mkt')).length;
  const clip=[]; rows.forEach(tr=>['skc-area','skc-yotei','skc-order','skc-rate','skc-moto'].forEach(c=>{const e=tr.querySelector('.'+c); if(e&&e.scrollWidth>e.clientWidth+1) clip.push(c+':'+e.textContent.trim().slice(0,12));}));
  return {rows:rows.length,want,badge:badge?+badge[1]:null,chips,clip};};
async function run(b,ph){
  const ctx=await b.newContext({...(ph?{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1400,height:900}}),serviceWorkers:'block'});
  await ctx.addInitScript(ph=>{ if(ph)localStorage.setItem('nn_view_mode','mobile'); sessionStorage.setItem('nn_vm_view','dash'); },ph);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(3000);
  const nm=ph?'スマホ':'PC';
  await p.evaluate(()=>document.querySelector('#dashboard .nn-dnav button[data-k="sekou"]').click()); await p.waitForTimeout(500);
  let m=await p.evaluate(MEAS);
  ok(nm+'：絞り込みなし＝行数が施工中の件数と一致・目次の件数＝行数', m.rows===m.want && m.badge===m.rows, JSON.stringify(m));
  ok(nm+'：各行のメーカーが札（.mkt）', m.rows>0 && m.chips===m.rows, m.chips+'/'+m.rows);
  if(ph) ok(nm+'：数量・完成予定・請負額・見込粗利・元請の欄が切れない', !m.clip.length, m.clip.join(' '));
  await p.evaluate(()=>{dashFil.maker.add('田島'); renderDash();}); await p.waitForTimeout(600);
  await p.evaluate(()=>document.querySelector('#dashboard .nn-dnav button[data-k="sekou"]').click()); await p.waitForTimeout(500);
  m=await p.evaluate(MEAS);
  ok(nm+'：メーカー「田島」で絞ると、行数＝施工中かつ田島の件数・目次の件数も同じ', m.want>0 && m.rows===m.want && m.badge===m.rows, JSON.stringify(m));
  ok(nm+'：JSエラーなし', !errs.length, errs.join(' '));
  await ctx.close();
}
(async()=>{const b=await chromium.launch(); await run(b,false); await run(b,true); await b.close();
  R.forEach(x=>console.log(x)); const ng=R.filter(x=>x.startsWith('★NG')).length; console.log(ng?'★NG '+ng+'件':'全部○');})();
