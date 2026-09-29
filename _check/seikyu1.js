/* ★2026-09-29g 請求日と請求し忘れのお知らせ（§545）
   使い方: node _check/seikyu1.js [kirokucho_demo.html]   （ホームは index.html を同じ端末の保存で開く）
   ○/★NG：①締め日の前日・当日・翌日に請求した場合の締め・入金日（手で数えた値と突き合わせ・必着3日・発行後14日・2月末）
          ②ダッシュボードの上に「請求し忘れ」・締め日が近い順・丸彦（末締・翌々月10日払）の行の日数と2つの入金日
          ③「今日請求した」で一覧から消え、請求日・入金予定日が入り、開き直しても残る
          ④新規物件登録で請求日を入れると入金予定日が請求日から出る ⑤ホームに赤い帯と一覧 ⑥JSエラーなし */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'kirokucho_demo.html';
/* 手で数えた答え（関数を使わない） [締め・入金日, 必着, 請求日, 締め日, 入金日] */
const CASES=[
 ['毎月末締・翌月末払',0,'2026-07-30','2026-07-31','2026-08-31'],   // 前日
 ['毎月末締・翌月末払',0,'2026-07-31','2026-07-31','2026-08-31'],   // 当日
 ['毎月末締・翌月末払',0,'2026-08-01','2026-08-31','2026-09-30'],   // 翌日
 ['毎月20日締・翌々月10日払',0,'2026-07-19','2026-07-20','2026-09-10'],
 ['毎月20日締・翌々月10日払',0,'2026-07-20','2026-07-20','2026-09-10'],
 ['毎月20日締・翌々月10日払',0,'2026-07-21','2026-08-20','2026-10-10'],
 ['毎月末締・翌月末払',3,'2026-07-27','2026-07-31','2026-08-31'],   // 必着3日：7/28が最後
 ['毎月末締・翌月末払',3,'2026-07-28','2026-07-31','2026-08-31'],
 ['毎月末締・翌月末払',3,'2026-07-29','2026-08-31','2026-09-30'],
 ['毎月末締・翌月末払',0,'2027-01-31','2027-01-31','2027-02-28'],   // 2月末
 ['毎月20日締・翌月末払',0,'2027-02-21','2027-03-20','2027-04-30'],
 ['請求書発行後14日以内',0,'2026-07-25','','2026-08-08'],
];
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1400,height:900}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>localStorage.clear()); await p.reload();
 await p.waitForFunction(()=>typeof props!=='undefined'&&document.readyState==='complete');
 const has=await p.evaluate(()=>!!window.nnSeikyu); ok('計算の関数がある',has);
 if(has){
  const got=await p.evaluate(C=>C.map(([r,h,inv])=>{const q=nnSeikyu.invoice(r,nnSeikyu.fromIso(inv),h); return q?[nnSeikyu.iso(q.close),nnSeikyu.iso(q.pay)]:null;}),CASES);
  CASES.forEach((c,i)=>{ const g=got[i]; ok(`①${c[0]}${c[1]?'（必着'+c[1]+'日）':''} ${c[2]}に請求→締め${c[3]||'なし'}・入金${c[4]}`, g&&g[0]===c[3]&&g[1]===c[4], JSON.stringify(g)); });
 }
 await p.waitForTimeout(300);
 const dash=await p.evaluate(()=>{ const el=document.getElementById('nnSkPanel'); if(!el||el.hidden) return null;
   const kg=document.querySelector('#dashboard .kgrps'); const above=kg?!!(el.compareDocumentPosition(kg)&Node.DOCUMENT_POSITION_FOLLOWING):false;
   return {above, rows:[...el.querySelectorAll('tr[data-id]')].map(tr=>({id:+tr.dataset.id, t:tr.innerText.replace(/\s+/g,' ')}))}; });
 ok('②ダッシュボードの上（数字の箱より上）に請求し忘れ', dash&&dash.above&&dash.rows.length>0, dash&&dash.rows.length+'件');
 if(dash){
  /* 期待：完成・請求日なし・入金予定が今日(7/25)以降 の5件（サンプル） */
  const exp=await p.evaluate(()=>props.filter(p=>p.stRaw==='kan'&&!p.skD&&!(p.nbD&&p.nbD<TODAY)).length);
  ok('②件数が完成済み・未請求の数と同じ', dash.rows.length===exp, dash.rows.length+'/'+exp);
  const sendBy=await p.evaluate(ids=>ids.map(id=>{const q=props.find(x=>x.id===id); const m=nnSeikyu.motoRule(q.moto,q.sh); const d=nnSeikyu.due(m.rule,m.hit,TODAY); return d?(d.after?'x':nnSeikyu.iso(d.sendBy)):'z';}),dash.rows.map(r=>r.id));
  ok('②締め日が近い順', sendBy.every((v,i)=>i===0||sendBy[i-1]<=v), sendBy.join(','));
  const ma=dash.rows.find(r=>r.t.includes('麻生工場'));
  /* 丸彦：毎月末締・翌々月10日払。今日7/25 → 締め7/31まであと6日・今日なら9/10・過ぎると10/10 */
  ok('②丸彦の行：あと6日・今日なら9/10・過ぎると10/10', ma&&ma.t.includes('あと6日')&&ma.t.includes('9/10')&&ma.t.includes('10/10'), ma&&ma.t);
  if(ma){
   await p.click(`#nnSkPanel tr[data-id="${ma.id}"] .skbtn`); await p.waitForTimeout(400);
   const after=await p.evaluate(id=>{const q=props.find(x=>x.id===id); return {gone:!document.querySelector(`#nnSkPanel tr[data-id="${id}"]`), sk:nnSeikyu.iso(q.skD), nb:nnSeikyu.iso(q.nbD), sb:nnSeikyu.iso(q.sbD)};},ma.id);
   ok('③今日請求した→一覧から消え 請求日7/25・締め7/31・入金9/10', after.gone&&after.sk==='2026-07-25'&&after.sb==='2026-07-31'&&after.nb==='2026-09-10', JSON.stringify(after));
   await p.reload(); await p.waitForFunction(()=>typeof props!=='undefined'&&document.readyState==='complete');
   const kept=await p.evaluate(id=>{const q=props.find(x=>x.id===id); return {sk:q.skD&&nnSeikyu.iso(q.skD), nb:nnSeikyu.iso(q.nbD), row:!!document.querySelector(`#nnSkPanel tr[data-id="${id}"]`)};},ma.id);
   ok('③開き直しても請求日が残り一覧に戻らない', kept.sk==='2026-07-25'&&kept.nb==='2026-09-10'&&!kept.row, JSON.stringify(kept));
  }
 }
 /* ④ 新規物件登録：元請＝丸彦渡辺建設、請求日 2026-08-01 → 締め 8/31・入金 10/10 */
 const reg=await p.evaluate(()=>{ openModal(); const s=(id,v)=>{const e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));};
   if(!document.getElementById('f_sk')) return null;
   s('f_moto','丸彦渡辺建設'); s('f_fb','2026-07-23'); s('f_sk','2026-08-01');
   const r={sb:document.getElementById('f_sb').value, nb:document.getElementById('f_nb').value}; closeModal&&closeModal(); return r; });
 ok('④登録画面：請求日8/1→締め8/31・入金10/10', reg&&reg.sb==='2026-08-31'&&reg.nb==='2026-10-10', JSON.stringify(reg));
 /* ⑤ ホーム */
 const h=await ctx.newPage(); h.on('pageerror',e=>errs.push('home:'+e.message));
 await h.goto('http://localhost:8899/index.html'); await h.waitForTimeout(1200);
 const hb=await h.evaluate(()=>{const b=document.getElementById('nnSkBan'); return b&&!b.hidden?b.textContent:null;});
 const n=dash?dash.rows.length-1:-1;
 ok('⑤ホームに赤い帯（記録帳と同じ件数）', hb&&hb.includes(n+'件'), hb);
 if(hb){ await h.click('#nnSkBan'); await h.waitForTimeout(300);
   const hp=await h.evaluate(()=>[...document.querySelectorAll('#nnSkHome .row')].map(r=>r.innerText.replace(/\s+/g,' ')));
   ok('⑤ホームの一覧が開き、麻生工場は出ない', hp.length===n&&!hp.some(t=>t.includes('麻生工場')), hp.length+'件'); }
 ok('⑥JSエラーなし', errs.length===0, errs.join(' / ').slice(0,300));
 await b.close(); console.log(R.join('\n'));
})();
