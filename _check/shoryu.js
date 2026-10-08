/* ★2026-10-09a 商流（どこから受けて、どこへ流すか）を現場詳細の冒頭に（§615・本人の例5つ）
   ①既存の物件も登録内容（元請・契約区分・メーカー）から自動で商流が出る（詳細の冒頭＝タブより上）
   ②よくある形9つがどれも正しい木になる（自社1つ・頂点1つ）・立場の札が正しい（例：手間請けで入る＝3次請・手間請け）
   ③会社を足す／名前を直す／途中を消すと下がつなぎ直る → 決定で保存・読み直しても残る・元請と契約区分がそろう
   ④ほかの入口で契約区分を変えると商流の自社の受け方も変わる
   ⑤会社の札どうしが重ならない・枠からはみ出さない（PCは横並び、スマホは縦並び）
   ⑥新規登録の窓に商流の欄があり、選んだ形で登録される
   使い方: node _check/shoryu.js [kirokucho_demo.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):'')); if(!c)NG++;};
const noOverlap=()=>{ const bs=[...document.querySelectorAll('#detail .nnSr .srn')].map(e=>e.getBoundingClientRect());
  for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){ const a=bs[i],b=bs[j]; if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1) return false; }
  const box=document.querySelector('#detail .nnSr .srv').getBoundingClientRect(); return bs.length>0&&bs.every(r=>r.left>=box.left-1&&r.right<=box.right+1); };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1440,height:900}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1800);
 await p.evaluate(()=>{ showView('list'); }); await p.waitForTimeout(300);
 const pid=await p.evaluate(()=>{ const q=props.find(x=>x.moto&&!/（直）/.test(x.moto)); nnGoDetail(q.id); return q.id; }); await p.waitForTimeout(600);
 /* ① */
 const d1=await p.evaluate(()=>{ const s=document.querySelector('#detail .dhead > .nnSr'); if(!s) return null; const t=document.querySelector('#detail .dhead .tabs');
   const q=props.find(x=>x.id===selectedId); const ns=[...s.querySelectorAll('.srn')];
   return {before:!!(s.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING), root:ns[0].getAttribute('title'), moto:q.moto, me:ns.filter(n=>n.classList.contains('me')).map(n=>n.textContent), kb:q.kbn||'材工'}; });
 ok('①詳細の冒頭（タブより上）に商流の図が出る', d1&&d1.before, d1);
 ok('①登録内容から自動で作る：頂点＝元請・自社に「自社」の印', d1&&d1.root===d1.moto&&d1.me.length===1&&/自社/.test(d1.me[0]), d1);
 ok('①自社の受け方＝契約区分（材工）', d1&&d1.me[0].indexOf(d1.kb==='工のみ'?'手間請け':d1.kb==='材のみ'?'材料のみ':'材工')>=0, d1);
 ok('⑤PC：会社の札が重ならず、枠からはみ出さない', await p.evaluate(noOverlap));
 /* ② よくある形 */
 await p.click('#detail .nnSr [data-sr=ed]'); await p.waitForTimeout(200);
 const np=await p.evaluate(()=>document.querySelectorAll('#nnSrPre button').length);
 const pres=[];
 for(let i=0;i<np;i++){ await p.click(`#nnSrPre button >> nth=${i}`); await p.waitForTimeout(80);
   pres.push(await p.evaluate(()=>{ const sr={n:[...document.querySelectorAll('#nnSrRows .row')].map(r=>r.dataset.id)}; const pv=document.querySelector('#nnSrPv .nnSr'); const me=pv.querySelector('.srn.me');
     return {t:document.querySelectorAll('#nnSrPre button')[0]&&'', rows:sr.n.length, me:me?me.querySelector('.tt').textContent+'/'+((me.querySelector('.tk')||{}).textContent||''):'', mes:pv.querySelectorAll('.srn.me').length, nodes:pv.querySelectorAll('.srn').length}; })); }
 ok('②よくある形が9つあり、どれも自社が1つ', np>=9&&pres.every(x=>x.mes===1&&x.nodes===x.rows), pres.map(x=>x.me));
 const tit=await p.evaluate(()=>[...document.querySelectorAll('#nnSrPre button b')].map(x=>x.textContent));
 const meOf=t=>pres[tit.indexOf(t)]&&pres[tit.indexOf(t)].me;
 ok('②元請から直接＝1次請・材工', meOf('元請から直接（材工）')==='1次請/材工', meOf('元請から直接（材工）'));
 ok('②手間請けで入る＝3次請・手間請け（本人の例5）', meOf('手間請けで入る')==='3次請/手間請け', meOf('手間請けで入る'));
 ok('②オーナー直＝自社が元請', /^元請\//.test(meOf('オーナー直（自社が元請）')||''), meOf('オーナー直（自社が元請）'));
 ok('②防水の1次会社の下＝2次請・材工（本人の例4）', meOf('防水の1次会社の下に入る')==='2次請/材工', meOf('防水の1次会社の下に入る'));
 /* ③ 直す：「材工で受けて手間を出す」→ 手間請けの会社の名前を直す・1次請を消す（下は元請へつなぎ直る）・自社の下に会社を足す */
 await p.click(`#nnSrPre button >> nth=${tit.indexOf('材工で受けて手間を出す')}`); await p.waitForTimeout(80);
 await p.evaluate(()=>{ const r=[...document.querySelectorAll('#nnSrRows .row')]; const set=(row,f,v)=>{ const e=row.querySelector('[data-f='+f+']'); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
   set(r[0],'nm','大和ライフネクスト'); set(r[3],'nm','堀江防水'); set(r[4],'nm','田島ルーフィング'); });
 await p.evaluate(()=>{ const r=[...document.querySelectorAll('#nnSrRows .row')]; r[1].querySelector('[data-r=del]').click(); });
 await p.evaluate(()=>{ const r=[...document.querySelectorAll('#nnSrRows .row')].find(x=>x.classList.contains('me')); r.querySelector('[data-r=add]').click(); });
 await p.evaluate(()=>{ const e=[...document.querySelectorAll('#nnSrRows input.nm')].find(x=>!x.value); e.value='手稲シーリング工業'; e.dispatchEvent(new Event('input',{bubbles:true})); });
 const ed=await p.evaluate(()=>({rows:[...document.querySelectorAll('#nnSrRows .row')].map(r=>r.querySelector('.nm').value), me:document.querySelector('#nnSrPv .srn.me .tt').textContent}));
 ok('③1次請を消すと自社は元請の直下（1次請）につなぎ直る', ed.me==='1次請'&&ed.rows.length===5&&ed.rows[0]==='大和ライフネクスト', ed);
 await p.click('#nnSrEd .ok'); await p.waitForTimeout(400);
 const sv=await p.evaluate(id=>{ const q=props.find(x=>x.id===id); return {n:q.sr&&q.sr.n.length, moto:q.moto, kbn:q.kbn, shown:[...document.querySelectorAll('#detail .nnSr .srn')].map(n=>n.getAttribute('title'))}; },pid);
 ok('③決定で保存され、詳細の図が新しい形になる', sv.n===5&&sv.shown.includes('手稲シーリング工業')&&sv.shown.includes('堀江防水'), sv);
 ok('③元請（一覧・入金の計算に使う）も商流の頂点にそろう', sv.moto==='大和ライフネクスト', sv.moto);
 await p.reload(); await p.waitForTimeout(1800);
 const rl=await p.evaluate(id=>{ const q=props.find(x=>x.id===id); return {n:q.sr&&q.sr.n.length, valid:nnSrValid(q.sr)}; },pid);
 ok('③読み直しても商流が残る', rl.n===5&&rl.valid, rl);
 /* ④ ほかの入口で契約区分を変える */
 const k4=await p.evaluate(id=>{ const q=props.find(x=>x.id===id); q.kbn='工のみ'; const sr=nnSrGet(q); return sr.n.find(x=>x.me).k; },pid);
 ok('④契約区分を「工のみ」に変えると自社は手間請けになる', k4==='手間請け', k4);
 /* ⑤ スマホ（たて）は縦並びで枠に収まる */
 const ph=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await ph.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
 const q=await ph.newPage(); q.on('pageerror',e=>errs.push(e.message));
 await q.goto('http://localhost:8899/'+FILE); await q.waitForTimeout(1800);
 await q.evaluate(()=>{ showView('list'); const p0=props[0]; nnSrApply(p0,{v:1,n:[{id:'a',pid:null,nm:'大和ライフネクスト',t:'gc',k:''},{id:'b',pid:'a',nm:'大和リビング',t:'gc',k:''},{id:'c',pid:'b',nm:'ビルドプロテック株式会社',t:'sub',k:'材工'},{id:'me',pid:'c',nm:'株式会社三浦工業',t:'sub',k:'手間請け',me:true},{id:'m',pid:'c',nm:'田島ルーフィング',t:'mat',k:''}]}); nnGoDetail(p0.id); });
 await q.waitForTimeout(800);
 const v=await q.evaluate(()=>{ const s=document.querySelector('#detail .nnSr'); return {v:s.classList.contains('v'), me:s.querySelector('.srn.me .tt').textContent+'/'+s.querySelector('.srn.me .tk').textContent, nm:[...s.querySelectorAll('.srn')].map(n=>n.firstChild.nextSibling.textContent)}; });
 ok('⑤スマホは縦並び・自社＝3次請・手間請け（本人の例5）', v.v&&v.me==='3次請/手間請け', v);
 ok('⑤会社の種類（株式会社）は図では省く（正式名は吹き出しに残す）', v.nm.includes('ビルドプロテック')&&v.nm.includes('三浦工業'), v.nm);
 const ov=await q.evaluate(noOverlap.toString().replace(/^\(\)=>/,'()=>')).catch(()=>null);
 ok('⑤スマホ：会社の札が重ならず、枠からはみ出さない', await q.evaluate(noOverlap));
 /* ⑦ 極端な形：8段・6社への枝分かれ・30文字の社名・枝の中の枝（PCとスマホ） */
 const EX=[
  {v:1,n:[{id:'a',pid:null,nm:'施主',t:'own'}].concat([1,2,3,4,5,6,7].map(i=>({id:'d'+i,pid:i===1?'a':'d'+(i-1),nm:i+'段目の会社',t:'gc'}))).concat([{id:'me',pid:'d7',nm:'自社',t:'sub',k:'手間請け',me:true}])},
  {v:1,n:[{id:'a',pid:null,nm:'元請',t:'gc'},{id:'me',pid:'a',nm:'自社',t:'sub',k:'材工',me:true}].concat([1,2,3,4,5,6].map(i=>({id:'c'+i,pid:'me',nm:'協力業者'+i,t:i<5?'sub':'mat',k:i<5?'手間請け':''})))},
  {v:1,n:[{id:'a',pid:null,nm:'とても長い名前の総合建設株式会社北海道支店札幌営業所工事部',t:'gc'},{id:'me',pid:'a',nm:'株式会社三浦工業',t:'sub',k:'材工',me:true},{id:'m',pid:'me',nm:'田島ルーフィング株式会社北海道支店',t:'mat'}]},
  {v:1,n:[{id:'a',pid:null,nm:'元請',t:'gc'},{id:'b',pid:'a',nm:'1次',t:'gc'},{id:'me',pid:'b',nm:'自社',t:'sub',k:'材工',me:true},{id:'c',pid:'me',nm:'防水A',t:'sub',k:'材工'},{id:'c1',pid:'c',nm:'手間A1',t:'sub',k:'手間請け'},{id:'c2',pid:'c',nm:'メーカーA',t:'mat'},{id:'d',pid:'me',nm:'防水B',t:'sub',k:'材工'},{id:'d1',pid:'d',nm:'手間B1',t:'sub',k:'手間請け'},{id:'d2',pid:'d',nm:'商社B',t:'sho'},{id:'d3',pid:'d2',nm:'メーカーB',t:'mat'},{id:'e',pid:'b',nm:'他業者（シール）',t:'sub',k:'材工'}]}
 ];
 for(const [nm,pg] of [['PC',p],['スマホ',q]]){
  const res=[];
  for(const sr of EX){ await pg.evaluate(sr=>{ const p0=props[0]; p0.sr=sr; delete p0.sr.mo; delete p0.sr.kb; nnGoDetail(p0.id); renderDetail(); },sr); await pg.waitForTimeout(250); res.push(await pg.evaluate(noOverlap)); }
  ok('⑦'+nm+'：極端な形4つ（8段・6社に枝分かれ・30文字・枝の中の枝）でも重ならず枠に収まる', res.every(Boolean), res);
 }
 /* ⑥ 新規登録 */
 await p.evaluate(()=>openModal()); await p.waitForTimeout(400);
 ok('⑥新規登録の窓に商流の欄がある', await p.evaluate(()=>!!document.querySelector('#modalbg #nnSrIn .nnSr')));
 await p.evaluate(()=>document.querySelector('#nnSrIn [data-sr=ed]').click()); await p.waitForTimeout(200);
 await p.click(`#nnSrPre button >> nth=${tit.indexOf('手間請けで入る')}`); await p.click('#nnSrEd .ok'); await p.waitForTimeout(200);
 await p.evaluate(()=>{ const g=k=>document.getElementById(k); g('f_name').value='商流テスト物件'; g('f_moto').value='丸彦渡辺建設'; saveProperty(); });
 await p.waitForTimeout(700);
 const nw=await p.evaluate(()=>{ const q=props.find(x=>x.name==='商流テスト物件'); return q?{ok:nnSrValid(q.sr), me:q.sr&&q.sr.n.find(x=>x.me).k, kbn:q.kbn}:null; });
 ok('⑥選んだ形で登録される（手間請け・契約区分は工のみ）', nw&&nw.ok&&nw.me==='手間請け'&&nw.kbn==='工のみ', nw);
 ok('JSエラーなし', !errs.length, errs.slice(0,3));
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○');
})();
