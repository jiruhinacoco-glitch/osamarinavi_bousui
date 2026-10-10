/* ★2026-10-09a 商流（どこから受けて、どこへ流すか）を現場詳細の冒頭に（§615・本人の例5つ）
   ①既存の物件も登録内容（元請・契約区分・メーカー）から自動で商流が出る（詳細の冒頭＝タブより上）
   ②えらぶだけ（§617）：①自社の位置 ②受け方 ③出す先 を押すと正しい木になる・立場の札が正しい（例：3次請・手間請け）。
     位置を変えても会社名は残る・名前の欄を押すと登録済みの会社が候補に出て、押すと入る
   ③会社を足す／名前を直す／途中を消すと下がつなぎ直る → 決定で保存・読み直しても残る・元請と契約区分がそろう
   ④ほかの入口で契約区分を変えると商流の自社の受け方も変わる
   ⑤会社の札どうしが重ならない・枠からはみ出さない（PCは横並び、スマホは縦並び）
   ⑥新規登録：商流が窓のいちばん上（元請の欄は統合）・メーカー自動・帯で選んだ形と会社名がそのまま元請・契約区分になる・編集も同じ（§622）
   ⑨スマホ：商流の枠が小さく、札どうし・名前が重ならない（§618）
   ⑧スマホ（iPhoneの時計の帯59px・ホームバー34px）：登録の窓のタイトルと✕が帯の下で押せる／商流の窓の決定・キャンセルが大きく、ホームバーより上
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
 /* ② えらぶだけ */
 await p.click('#detail .nnSr [data-sr=ed]'); await p.waitForTimeout(200);
 ok('②「よくある形」は無い（本人の指示で削除）', await p.evaluate(()=>!document.getElementById('nnSrPre')&&!/よくある形/.test(document.getElementById('nnSrEd').textContent)));
 /* ★§624 えらぶボタン → プルダウン（自社の立場・受け方・施工・材料） */
 const pick=async(pos,k,outs)=>{ const sk=outs.includes('tem')?'tem':outs.includes('sub')?'sub':'', zi=outs.includes('sho')?'sho':outs.includes('mat')?'mat':'';
   await p.selectOption('#nnSrQ select[data-q=pos]',String(pos)); await p.selectOption('#nnSrQ select[data-q=k]',k);
   if(k!=='材料のみ') await p.selectOption('#nnSrQ select[data-q=seko]',sk); await p.selectOption('#nnSrQ select[data-q=zai]',zi);
   return p.evaluate(()=>{ const pv=document.querySelector('#nnSrPv .nnSr'), me=pv.querySelector('.srn.me'); return {me:me.querySelector('.tt').textContent+'/'+((me.querySelector('.tk')||{}).textContent||''), mes:pv.querySelectorAll('.srn.me').length, nodes:pv.querySelectorAll('.srn').length,
     tiers:[...pv.querySelectorAll('.srn')].map(n=>n.querySelector('.tt').textContent)}; }); };
 const c1=await pick(1,'材工',['mat']);
 ok('②元請の下・材工・メーカー＝1次請/材工（3社）', c1.me==='1次請/材工'&&c1.nodes===3&&c1.mes===1, c1);
 const c2=await pick(3,'手間請け',[]);
 ok('②2次請の下・手間請け＝3次請/手間請け（本人の例5）', c2.me==='3次請/手間請け'&&c2.nodes===4, c2);
 const c3=await pick(0,'材工',['tem','mat']);
 ok('②オーナー直＝自社が元請・下に手間請けとメーカー', /^元請\//.test(c3.me)&&c3.tiers[0]==='施主'&&c3.nodes===4, c3);
 const c4=await pick(2,'材工',['sub','sho','mat']);
 ok('②1次請の下・材工・下請＋商社→メーカー＝2次請/材工（本人の例4）', c4.me==='2次請/材工'&&c4.nodes===6&&c4.tiers.includes('3次請'), c4);
 /* 名前を入れて位置を変えても残る */
 await p.fill('.nmr >> nth=0 >> input','大和ライフネクスト');
 await pick(1,'材工',['sub','mat']); await pick(3,'材工',['sub','mat']);
 const kept=await p.evaluate(()=>document.querySelector('#nnSrPv .srn').getAttribute('title'));
 ok('②位置を変えても上の会社名（元請）は残る', kept==='大和ライフネクスト', kept);
 await pick(1,'材工',['sub','mat']); await p.selectOption('#nnSrQ select[data-q=k]','材料のみ');
 const c5=await p.evaluate(()=>({me:document.querySelector('#nnSrPv .srn.me').textContent}));
 ok('②材料のみにすると「下請に出す」は外れる', (await p.evaluate(()=>{ const s=document.querySelector('#nnSrQ select[data-q=seko]'); return s.disabled&&s.value===''; }))&&/材料のみ/.test(c5.me), c5);
 /* 候補から選ぶ */
 await p.evaluate(()=>{ localStorage.setItem('nn_tokui_v1',JSON.stringify({moto:[{name:'候補の元請建設'}],kyoryoku:[],maker:[{name:'候補メーカー'}],shiire:[]})); });
 await p.click('#detail .nnSr [data-sr=ed]').catch(()=>{});
 await p.click('#nnSrEd .ft .cx'); await p.click('#detail .nnSr [data-sr=ed]'); await p.waitForTimeout(150);
 await pick(1,'材工',['mat']);
 await p.click('.nmr >> nth=1 >> input'); await p.waitForTimeout(100);
 const cand=await p.evaluate(()=>[...document.querySelectorAll('.nmr.act .cand button')].map(b=>b.textContent));
 if(cand.includes('候補メーカー')) await p.click('.nmr.act .cand button:has-text("候補メーカー")');
 const cv=await p.evaluate(()=>({inp:document.querySelectorAll('.nmr input')[1].value, pv:[...document.querySelectorAll('#nnSrPv .srn')].map(n=>n.getAttribute('title'))}));
 ok('②名前の欄を押すと登録済みの会社（メーカーならメーカー）が候補に出て、押すと入る', cand.includes('候補メーカー')&&!cand.includes('候補の元請建設')&&cv.inp==='候補メーカー'&&cv.pv.includes('候補メーカー'), {cand,cv});
 await p.evaluate(()=>localStorage.removeItem('nn_tokui_v1'));
 /* ③ 直す：えらぶ（1次請の下・材工・手間請けとメーカーに出す）→ 手間請けの会社の名前を直す・1次請を消す（下は元請へつなぎ直る）・自社の下に会社を足す */
 await pick(2,'材工',['tem','mat']); await p.waitForTimeout(80);
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
 const sz=await q.evaluate(()=>{ const s=document.querySelector('#detail .nnSr'), ns=[...s.querySelectorAll('.srn')];
   const inside=ns.every(n=>{ const r=n.getBoundingClientRect(), nE=n.querySelector('.nm'); if(!nE) return false; const nm=nE.getBoundingClientRect(); return [...n.querySelectorAll('.tt,.tk,.mb')].every(b=>{ const c=b.getBoundingClientRect();
     return c.top>=r.top-0.5&&c.bottom<=r.bottom+0.5&&(c.right<=nm.left+0.5||c.left>=nm.right-0.5); }); });
   const clip=ns.some(n=>{ const e=n.querySelector('.nm'); return !!e&&e.scrollWidth>e.clientWidth+1; });
   return {h:Math.round(s.getBoundingClientRect().height), nh:Math.round(ns[0].getBoundingClientRect().height), inside, clip}; });
 ok('⑨スマホ：商流の枠が小さい（5社で高さ200px以下・札24px）・立場/受け方/自社の札は枠の中で名前と重ならない・名前は切れない（§618）', sz.h<=200&&sz.nh<=24&&sz.inside&&!sz.clip, sz);
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
 /* ⑥ 新規登録：商流がいちばん上・元請の欄は商流に統合（§622） */
 await p.evaluate(()=>openModal()); await p.waitForTimeout(700);
 const top=await p.evaluate(()=>{ const B=document.getElementById('nnSrBand'), w=document.querySelector('#modalbg .mwrap'), m=document.querySelector('#modalbg .modal');
   return {band:!!B, first:!!B&&!!(B.compareDocumentPosition(w)&Node.DOCUMENT_POSITION_FOLLOWING), motoHidden:!document.getElementById('f_moto').offsetParent,
     mk:[...B.querySelectorAll('.nmr')].map(r=>r.querySelector('input').value), scroll:m.scrollHeight>m.clientHeight+1, popup:!!B.querySelector('[data-sr=ed]')}; });
 ok('⑥新規登録：商流が窓のいちばん上・元請の欄は出ない（商流に統合）・別窓を開くボタンは無い', top.band&&top.first&&top.motoHidden&&!top.popup, top);
 ok('⑥上から 工事名・現場住所・ステータス → 商流（§624）', await p.evaluate(()=>{ const B=document.getElementById('nnSrBand').getBoundingClientRect().top; return ['f_name','f_addr','f_st'].every(id=>{ const e=document.getElementById(id); return !!e.offsetParent&&e.getBoundingClientRect().bottom<=B; }); }));
 ok('⑥商流はプルダウン4つ（自社の立場・受け方・施工・材料）（§624）', await p.evaluate(()=>[...document.querySelectorAll('#nnSrBand select[data-q]')].map(s=>s.dataset.q).join()==='pos,k,seko,zai'));
 ok('⑥いちばん最初は現場名（工事名）・その下が商流（§623）', await p.evaluate(()=>{ const n=document.getElementById('f_name'), B=document.getElementById('nnSrBand'); return !!n.offsetParent&&n.getBoundingClientRect().bottom<=B.getBoundingClientRect().top&&!!(n.compareDocumentPosition(B)&Node.DOCUMENT_POSITION_FOLLOWING); }));
 ok('⑥新規登録：メーカーは屋根の「防水メーカー」から自動で入る', top.mk.includes(await p.evaluate(()=>document.querySelector('#modalbg select.rfm').value)), top.mk);
 ok('⑥パソコン：商流を足しても登録の窓はスクロールなしの1画面', !top.scroll, top.scroll);
 const bpick=async(pos,k,outs)=>{ const sk=outs.includes('tem')?'tem':outs.includes('sub')?'sub':'', zi=outs.includes('sho')?'sho':outs.includes('mat')?'mat':'';
   await p.selectOption('#nnSrBand select[data-q=pos]',String(pos)); await p.selectOption('#nnSrBand select[data-q=k]',k);
   if(k!=='材料のみ') await p.selectOption('#nnSrBand select[data-q=seko]',sk); await p.selectOption('#nnSrBand select[data-q=zai]',zi); };
 await bpick(3,'手間請け',['mat']);
 await p.fill('#nnSrBand .nmr >> nth=0 >> input','丸彦渡辺建設');
 await p.fill('#nnSrBand .nmr >> nth=1 >> input','岩田地崎建設');
 const fm=await p.evaluate(()=>document.getElementById('f_moto').value);
 ok('⑥帯でいちばん上の会社名を打つと、元請の欄（隠れている）にも入る', fm==='丸彦渡辺建設', fm);
 await p.fill('#f_name','商流テスト物件'); await p.evaluate(()=>saveProperty()); await p.waitForTimeout(800);
 const nw=await p.evaluate(()=>{ const q=props.find(x=>x.name==='商流テスト物件'); if(!q) return null; const me=q.sr&&q.sr.n.find(x=>x.me);
   return {ok:nnSrValid(q.sr), me:me&&me.k, tier:me&&nnSrTier(q.sr,me.id), kbn:q.kbn, moto:q.moto, names:q.sr.n.map(x=>x.nm), ph:q.sr.n.some(x=>'ph' in x||'am' in x)}; });
 ok('⑥帯で選んだ形のまま登録：元請＝いちばん上の会社・自社＝3次請・手間請け・契約区分＝工のみ', nw&&nw.ok&&nw.moto==='丸彦渡辺建設'&&nw.me==='手間請け'&&nw.tier==='3次請'&&nw.kbn==='工のみ'&&nw.names.includes('岩田地崎建設'), nw);
 ok('⑥保存データに見本の印（ph・am）が残らない', nw&&!nw.ph, nw&&nw.ph);
 /* 既存の物件を編集：その物件の商流が帯に出る → 直して保存 */
 const eid=await p.evaluate(()=>props.find(x=>x.name==='商流テスト物件').id);
 await p.evaluate(id=>openModal(id),eid); await p.waitForTimeout(700);
 const ld=await p.evaluate(()=>[...document.querySelectorAll('#nnSrBand .nmr input')].map(i=>i.value));
 ok('⑥編集：その物件の商流が帯に出る', ld[0]==='丸彦渡辺建設'&&ld.includes('岩田地崎建設'), ld);
 await bpick(1,'材工',['mat']); await p.evaluate(()=>saveProperty()); await p.waitForTimeout(800);
 const ed2=await p.evaluate(id=>{ const q=props.find(x=>x.id===id); const me=q.sr.n.find(x=>x.me); return {moto:q.moto, tier:nnSrTier(q.sr,me.id), kbn:q.kbn, n:q.sr.n.length}; },eid);
 ok('⑥編集：直した形で保存（1次請・材工・元請はそのまま）', ed2.moto==='丸彦渡辺建設'&&ed2.tier==='1次請'&&ed2.kbn==='材工', ed2);
 /* ⑧ スマホの安全域 */
 { const q=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); q.on('pageerror',e=>errs.push(e.message));
   const cdp=await q.context().newCDPSession(q);
   await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:59,topMax:59,bottom:34,bottomMax:34,left:0,leftMax:0,right:0,rightMax:0}});
   await q.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
   await q.goto('http://localhost:8899/'+FILE); await q.waitForTimeout(1800);
   await q.evaluate(()=>openModal()); await q.waitForTimeout(500);
   const m=await q.evaluate(()=>{ const t=document.getElementById('modalTitle').getBoundingClientRect(), x=document.querySelector('#modalbg .mclose').getBoundingClientRect(), mo=document.querySelector('#modalbg .modal').getBoundingClientRect();
     const h=document.elementFromPoint(x.left+x.width/2,x.top+x.height/2); return {title:Math.round(t.top), x:Math.round(x.top), bottom:Math.round(mo.bottom), hit:!!(h&&h.closest('.mclose'))}; });
   ok('⑧スマホ：登録の窓のタイトルと✕が時計の帯（59px）の下・✕が押せる・下はホームバーの上', m.title>=59&&m.x>=59&&m.hit&&m.bottom<=852-34, m);
   await q.evaluate(()=>closeModal()); await q.evaluate(()=>{ showView('list'); nnGoDetail(props[0].id); nnSrOpen(props[0].id); }); await q.waitForTimeout(500);
   const e=await q.evaluate(()=>{ const t=document.querySelector('#nnSrEd .hd b').getBoundingClientRect(), x=document.querySelector('#nnSrEd .hd button').getBoundingClientRect();
     const bs=[...document.querySelectorAll('#nnSrEd .ft button')].map(b=>{ const r=b.getBoundingClientRect(); return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom),h:Math.round(r.height)}; });
     return {title:Math.round(t.top), x:Math.round(x.top), bs}; });
   ok('⑧スマホ：商流の窓の見出しと閉じるが時計の帯の下', e.title>=59&&e.x>=59, e);
   ok('⑧スマホ：決定・キャンセルが高さ44px以上・左右に広く・ホームバーより上', e.bs.length===2&&e.bs.every(x=>x.h>=44&&x.b<=852-34)&&e.bs[0].l<=20&&e.bs[1].r>=373, e.bs);
   await q.close(); }
 ok('JSエラーなし', !errs.length, errs.slice(0,3));
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○');
})();
