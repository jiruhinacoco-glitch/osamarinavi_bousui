/* 「きく」（AIチャット・手入力版）の検査  2026-09-02d
   ★芯：数字を推測しないこと。検算は「検査側で履歴から独立に計算した値」と突き合わせる。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
let ng=0,n=0;
function ok(t,c,x){ n++; if(!c)ng++; console.log((c?'○ ':'★NG ')+t+(x!==undefined?('  '+x):'')); }
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                          :{viewport:{width:1280,height:800}});
const errs=[]; p.on('pageerror',e=>errs.push(''+e));
if(PH) await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
/* ★発注履歴の見本は発注ページが作る（同じ端末＝同じ保存）。先に一度開いて用意する */
await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'});
await p.waitForTimeout(900);
await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
await p.waitForTimeout(600);

console.log('=== '+(PH?'スマホ':'PC')+' ===');
/* ① 入口 */
ok('ホームに「きく」のボタンがある', await p.$('#askBtn')!==null);
await p.click('#askBtn'); await p.waitForTimeout(300);
ok('押すと画面が開く', await p.evaluate(()=>!!document.querySelector('#nnAsk.on')));
ok('読み上げは既定でオン（2026-09-02g）', await p.evaluate(()=>document.querySelector('#nnAskSpk').classList.contains('on')));
/* 読み上げの見張り：実際に speechSynthesis.speak に渡った文を控える */
await p.evaluate(()=>{ window.__spk=[]; const o=speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak=u=>{ window.__spk.push({t:u.text,lang:u.lang}); try{o(u);}catch(_){} }; });

/* ② 検査側で「正解」を独立に作る（product の関数は使わない） */
const truth=await p.evaluate(()=>{
  const h=JSON.parse(localStorage.getItem('nn_hacchu_hist')||'[]');
  let hit=null;
  h.forEach(x=>(x.lines||[]).forEach(l=>{ if(String(x.gid)==='J051'&&/プライマー/.test(l.n)) hit={n:l.n,p:l.p,q:l.q,u:l.u,d:x.date}; }));
  const bk=(window.NN_BUKKEN||[]).filter(b=>b.code==='J051')[0]||null;
  return {hit, bkName:bk?bk.name:null};
});
ok('見本の発注履歴（J051のプライマー）がある', !!truth.hit, JSON.stringify(truth.hit));

/* ③ その現場の単価が出る（＝佐野さんの例そのもの） */
const a1=await p.evaluate(q=>NN_ASK.answer(q), 'サン太平の'+(truth.hit?truth.hit.n:'プライマー')+' いくらで入ってた？');
ok('★現場＋材料で、履歴どおりの単価が出る',
   a1.ok && a1.head==='¥'+Math.round(truth.hit.p).toLocaleString('ja-JP'), a1.head);
ok('根拠に現場名が出る', (a1.lines||[]).join('／').indexOf(truth.bkName)>=0);
ok('根拠に発注日が出る', (a1.lines||[]).join('／').indexOf('年')>=0);
ok('通常単価が無いことを正直に書く', (a1.lines||[]).join('／').indexOf('材料登録に入っていません')>=0);

/* ④ 通常単価を入れると「◯円安い」が出る（差の計算） */
await p.evaluate(o=>{
  localStorage.setItem('nn_materials_v1', JSON.stringify([
    {id:'x1', maker:'田島ルーフィング', n:o.n, s:o.n, c2:'アスファルトプライマー',
     ou:'缶', cv:16, cu:'kg', price:o.p+300, hist:[{d:'2026-04-01', p:o.p+100}]}
  ]));
}, {n:truth.hit.n, p:truth.hit.p});
const a2=await p.evaluate(q=>NN_ASK.answer(q), 'サン太平の'+truth.hit.n+' いくら？');
ok('★通常単価との差が出る（300円安く）',
   (a2.lines||[]).join('／').indexOf('300')>=0 && (a2.lines||[]).join('／').indexOf('安く')>=0,
   (a2.lines||[]).join(' / '));
ok('読み上げ文にも差が入る', /安く/.test(a2.speak||''), a2.speak);
ok('読み上げ文が会話の形（〜円です。通常より〜円安く〜。通常単価は〜円です。）',
   /円です。通常より\d+円安く入っています。通常単価は\d+円です。$/.test(a2.speak||''), a2.speak);
/* 画面から聞くと、本当に声に渡る */
await p.evaluate(()=>{ window.__spk=[]; });
await p.fill('#nnAskIn','サン太平の'+truth.hit.n+' いくら？'); await p.click('#nnAskGo'); await p.waitForTimeout(300);
const spk1=await p.evaluate(()=>window.__spk);
ok('★答えが機械音声に渡る（ja-JP）', spk1.length===1 && spk1[0].lang==='ja-JP' && /円です/.test(spk1[0].t), JSON.stringify(spk1));
/* オフにすると渡らない・端末に覚える */
await p.click('#nnAskSpk'); await p.waitForTimeout(150);
await p.evaluate(()=>{ window.__spk=[]; });
await p.fill('#nnAskIn','サン太平の'+truth.hit.n+' いくら？'); await p.click('#nnAskGo'); await p.waitForTimeout(300);
ok('オフにすると声に渡らない', (await p.evaluate(()=>window.__spk)).length===0);
ok('オフを端末に覚える', await p.evaluate(()=>localStorage.getItem('nn_ask_spk_v1')==='0'));
await p.click('#nnAskSpk'); await p.waitForTimeout(100);
ok('もう一度押すとオンに戻る', await p.evaluate(()=>localStorage.getItem('nn_ask_spk_v1')==='1'));

/* ⑤ 推測しない：無い材料・無い現場では数字を出さない */
const a3=await p.evaluate(()=>NN_ASK.answer('サン太平のゼッタイニナイ材料 いくら？'));
ok('★無い材料では数字を出さない', !a3.ok && !/¥\d/.test(a3.head), a3.head);
const a4=await p.evaluate(()=>NN_ASK.answer('存在しない現場のプライマー いくら？'));
ok('★無い現場では「これは通常単価」と断る（現場の値と誤解させない）',
   /通常単価/.test(a4.head) && /現場が特定できませんでした/.test((a4.lines||[]).join('')), a4.head);

/* ⑥ 材料だけ聞くと通常単価が出る */
const a5=await p.evaluate(o=>NN_ASK.answer(o.n+'の通常単価は？'), {n:truth.hit.n});
ok('材料だけでも通常単価が出る', a5.ok && /¥/.test(a5.head) && /通常単価/.test(a5.head), a5.head);
ok('価格改定の履歴が出る', (a5.lines||[]).join('／').indexOf('価格改定')>=0);

/* ⑦ 現場だけ聞くとその現場の発注一覧 */
const a6=await p.evaluate(()=>NN_ASK.answer('サン太平の発注は？'));
ok('現場だけだと発注一覧が出る', a6.ok && (a6.lines||[]).join('／').indexOf('発注した材料')>=0);

/* ⑧ 画面に出る（実際にタイプして送る） */
await p.fill('#nnAskIn','サン太平の'+truth.hit.n+' いくら？');
await p.click('#nnAskGo'); await p.waitForTimeout(250);
const shown=await p.evaluate(()=>{const e=document.querySelector('#nnAskBody .nnAns .hd'); return e?e.textContent:'';});
ok('★画面に大きく金額が出る', /¥/.test(shown), shown);

/* ⑨ 閉じる */
await p.click('#nnAskX'); await p.waitForTimeout(200);
ok('✕で閉じる', await p.evaluate(()=>!document.querySelector('#nnAsk.on')));

/* ⑩ 壊れた保存でも落ちない */
await p.evaluate(()=>{ localStorage.setItem('nn_hacchu_hist','こわれた'); localStorage.setItem('nn_materials_v1','{"a":1}'); });
const a7=await p.evaluate(()=>{ try{ return NN_ASK.answer('サン太平のプライマー いくら？'); }catch(e){ return {err:''+e}; } });
ok('保存が壊れていても落ちない', !a7.err, a7.err||a7.head);

ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
console.log(ng?('★NG '+ng+' / '+n+'件'):('全部○ '+n+'件'));
await b.close();
})();
