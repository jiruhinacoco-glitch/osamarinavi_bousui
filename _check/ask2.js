/* 「きく」の第2弾：どのページからも呼べる／言葉のゆれ／覚える  2026-09-02e */
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
console.log('=== '+(PH?'スマホ':'PC')+' ===');

/* 発注履歴の見本を用意 */
await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'}); await p.waitForTimeout(900);

/* ① どのページからも呼べる（ヘッダーに🎤が自動で付く） */
const PAGES=['kirokucho_demo.html','hacchu.html','zairyo_toroku.html','zumen_sekisan.html'];
for(const f of PAGES){
  await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await p.waitForTimeout(700);
  try{ await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); }catch(_){}
  const st=await p.evaluate(()=>{
    const b=document.getElementById('askHdBtn'); if(!b) return {no:1};
    const h=document.querySelector('header').getBoundingClientRect();
    const r=b.getBoundingClientRect();
    return {ok:1, inHead:r.top>=h.top-1 && r.bottom<=h.bottom+1, hh:Math.round(h.height),
            w:Math.round(r.width), over:Math.max(0, Math.round(r.right-innerWidth))};
  });
  ok(f+'：ヘッダーに🎤が付く', !!st.ok, JSON.stringify(st));
  if(st.ok){
    ok(f+'：帯からはみ出さない', st.inHead && st.over===0, JSON.stringify(st));
    await p.click('#askHdBtn'); await p.waitForTimeout(300);
    ok(f+'：押すと「きく」が開く', await p.evaluate(()=>!!document.querySelector('#nnAsk.on')));
    await p.click('#nnAskX'); await p.waitForTimeout(150);
  }
}
/* ホームは自前の大きなボタンなので、ヘッダーには足さない */
await p.goto('http://localhost:8899/index.html',{waitUntil:'load'}); await p.waitForTimeout(600);
ok('ホームは大きなボタンのまま（🎤を二重に足さない）',
   await p.evaluate(()=>!!document.getElementById('askBtn') && !document.getElementById('askHdBtn')));

/* 正解を独立に用意 */
const truth=await p.evaluate(()=>{
  const h=JSON.parse(localStorage.getItem('nn_hacchu_hist')||'[]'); let hit=null;
  h.forEach(x=>(x.lines||[]).forEach(l=>{ if(String(x.gid)==='J051'&&/プライマー/.test(l.n)) hit={n:l.n,p:l.p}; }));
  return hit;
});
ok('見本の発注履歴がある', !!truth, JSON.stringify(truth));
const yen='¥'+Math.round(truth.p).toLocaleString('ja-JP');

/* ③-1 言い換え表：「下塗り」でもプライマーに当たる */
const a1=await p.evaluate(()=>NN_ASK.answer('サン太平の下塗り いくら？'));
ok('★「下塗り」でもプライマーに当たる（言い換え表）', a1.ok && a1.head===yen.replace('','') , a1.head);
const a1b=await p.evaluate(()=>NN_ASK.answer('サン太平のプライマ いくら？'));
ok('★表記ゆれ（プライマ）でも当たる', a1b.ok && a1b.head===yen, a1b.head);

/* ③-2 知らない言い方 → 候補が出る → 選ぶと覚える → 次から通る */
await p.evaluate(()=>{ try{ localStorage.removeItem('nn_ask_yomi_v1'); }catch(_){} });
const a2=await p.evaluate(()=>NN_ASK.answer('サン太平のゴンベエ材 いくら？'));
ok('知らない言い方は数字を出さない', !a2.ok && !/¥/.test(a2.head), a2.head);
ok('★選んで覚えさせる候補が出る', !!(a2.teach&&a2.teach.names&&a2.teach.names.length), JSON.stringify(a2.teach&&a2.teach.names));
ok('★覚える語を取り出せている', !!(a2.teach&&a2.teach.word), a2.teach&&a2.teach.word);
await p.evaluate(o=>nnAskLearn(o.w, o.n), {w:(a2.teach&&a2.teach.word)||'ゴンベエ材', n:truth.n});
const a3=await p.evaluate(()=>NN_ASK.answer('サン太平のゴンベエ材 いくら？'));
ok('★覚えたあとは同じ言い方で通る', a3.ok && a3.head===yen, a3.head);

/* 覚えた内容は再読み込みしても残る */
await p.reload({waitUntil:'load'}); await p.waitForTimeout(500);
const a4=await p.evaluate(()=>NN_ASK.answer('サン太平のゴンベエ材 いくら？'));
ok('★開き直しても覚えている', a4.ok && a4.head===yen, a4.head);

/* 画面から候補を押しても覚える */
await p.evaluate(()=>{ try{ localStorage.removeItem('nn_ask_yomi_v1'); }catch(_){} });
await p.click('#askBtn'); await p.waitForTimeout(250);
await p.fill('#nnAskIn','サン太平のホゲホゲ材 いくら？'); await p.click('#nnAskGo'); await p.waitForTimeout(300);
const nb=await p.evaluate(()=>document.querySelectorAll('#nnAskBody .nnAns .nnCand button').length);
ok('画面にも候補ボタンが出る', nb>0, nb);
if(nb>0){
  await p.evaluate(()=>{ const bs=[...document.querySelectorAll('#nnAskBody .nnAns .nnCand button')];
    const t=bs.filter(b=>/プライマー/.test(b.textContent))[0]||bs[0]; t.click(); });
  await p.waitForTimeout(350);
  const shown=await p.evaluate(()=>{const e=document.querySelector('#nnAskBody .nnAns .hd'); return e?e.textContent:'';});
  ok('★候補を押すと覚えて、その場で答えが出る', /¥/.test(shown), shown);
}

/* 覚えた言い方は保存の一覧（設定の書き出し）にも入れてある */
ok('新しい保存キーは nn_ask_yomi_v1 の1つだけ',
   await p.evaluate(()=>Object.keys(localStorage).filter(k=>/^nn_ask/.test(k)).join(',')==='nn_ask_yomi_v1'),
   await p.evaluate(()=>Object.keys(localStorage).filter(k=>/^nn_ask/.test(k)).join(',')));

ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
console.log(ng?('★NG '+ng+' / '+n+'件'):('全部○ '+n+'件'));
await b.close();
})();
