/* ★2026-08-29m 入口メニューの「平面図作成／矩計図作成」＋アゴあり/アゴなし（本人のモック準拠）
   ・カードの名前が「作成」になっている
   ・アゴあり/なしのボタンが各カードに2つずつ（計4つ）・既定はアゴなし
   ・アゴありを選ぶと、新しくかくパラペットの辺に ago:1/agoD:100 が付く
   ・既にかいた図面があるときは confirm で「その辺にも反映するか」を聞く
   ・矩計図（断面）：多数決でアゴを判定し、画面の注記と紙（PDF）の両方に出る
   使い方: node _check/agodef.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let dlg=[]; p.on('dialog',async d=>{ dlg.push(d.message().slice(0,30)); await d.accept(); });
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1400);
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){} });
  const NG=[]; const ok=(c,n,i)=>{ console.log((c?'○':'★NG')+' '+n+(i!==undefined?'　'+i:'')); if(!c)NG.push(n); };

  /* ① 名前とボタン */
  const m1=await p.evaluate(()=>{
   /* ★2026-08-30h 絵はフレーム（b.httl）の中に入ったので、textContent には
      絵が読めなかったときの絵文字（▤ 📐）も混ざる。文字だけを取り出して見る。 */
   const tx=b=>[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
   return {
    on:document.body.classList.contains('nn-zmenu'),
    t1:tx(document.querySelectorAll('#nnZMenu .zmCard b')[0]),
    t2:tx(document.querySelectorAll('#nnZMenu .zmCard b')[1]),
    btns:document.querySelectorAll('#nnZMenu .agoB').length,
    /* ★2026-08-31a 本人の指示で「アゴあり／アゴなしの記号」は削除した（文字だけ）。
       絵（icons/ago_*.png）も線画（SVG）も出さない。 */
    icons:document.querySelectorAll('#nnZMenu .agoB svg, #nnZMenu .agoIc, #nnZMenu .agoB img').length,
    defOn:[...document.querySelectorAll('#nnZMenu .agoB.on')].map(x=>x.dataset.ago).join(','),
   };});
  ok(m1.on,'最初は入口メニュー');
  ok(m1.t1==='① 平面図作成','カード①＝「平面図作成」',m1.t1);
  ok(m1.t2==='② 矩計図作成','カード②＝「矩計図作成」',m1.t2);
  ok(m1.btns===4,'アゴあり/なしのボタンが4つ',m1.btns);
  ok(m1.icons===0,'アゴあり／なしの記号（絵・線画）は出さない',m1.icons+'個');
  ok(m1.defOn==='0,0','既定はアゴなし（両カードとも）',m1.defOn);

  /* ② アゴありを押す → 「選ぶだけ」で画面は動かない・既定が保存される
     ★2026-08-31a 画面が動くのは「▶ はじめる」を押したときだけ（本人の指示） */
  await p.click('#nnZMenu .zmCard .agoB[data-ago="1"]');
  await p.waitForTimeout(400);
  const m2=await p.evaluate(()=>({
    still:document.body.classList.contains('nn-zmenu'),
    on:[...document.querySelectorAll('#nnZMenu .agoB.on')].map(x=>x.dataset.ago).join(','),
    saved:(function(){try{return localStorage.getItem('nn_zumen_agodef');}catch(_){return null;}})(),
  }));
  ok(m2.still,'アゴを押しても画面は動かない（選ぶだけ）');
  ok(m2.on==='1,1','押したほう（アゴあり）が点く',m2.on);
  ok(m2.saved==='1','既定（アゴあり）が保存される', m2.saved);
  /* 図面へ進むのは「▶ はじめる」 */
  await p.click('#nnZMenu .zmCard:nth-of-type(1) .zmGoB'); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>!document.body.classList.contains('nn-zmenu')&&tab==='zu'),
     '「▶ はじめる」を押して初めて平面図へ進む');

  /* ③ 新しくかいた屋根の辺にアゴが付く（closePoly と 長方形の両方） */
  const m3=await p.evaluate(()=>{
    drawPts=[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}]; closePoly();
    boxP1={x:8,y:0}; boxCommit({x:12,y:3});
    const chk=pi=>state.polys[pi].edges.every(e=>e.ago===1&&e.agoD===100);
    return {a:chk(0), b:chk(1), n:state.polys.length};
  });
  ok(m3.n===2&&m3.a&&m3.b,'新しくかいた辺すべてにアゴ（closePoly・長方形とも）',JSON.stringify(m3));

  /* ④ 矩計図：多数決＝アゴあり。画面の注記と紙の両方に出る */
  const m4=await p.evaluate(()=>{
    const ag=nnMajorAgo();
    setTab('sec');
    const note=(document.getElementById('secNote')||{}).textContent||'';
    let html=''; const ow=window.open;
    window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){},addEventListener(){}});
    let err=''; try{ nnSectionPDF(); }catch(e){ err=String(e).slice(0,80); }
    window.open=ow;
    const flat=html.replace(/<[^>]+>/g,' ');
    return {on:ag.on, d:ag.d, note, err,
      pdfAgo:flat.indexOf('水切りアゴ')>=0, pdfDim:flat.indexOf('アゴ100')>=0,
      pdfKasagi:flat.indexOf('アルミ笠木')>=0};
  });
  ok(m4.on&&m4.d===100,'多数決＝アゴあり（出100）',m4.on+'/'+m4.d);
  ok(/アゴ100/.test(m4.note),'画面の断面の注記にアゴが出る',m4.note.slice(0,40));
  ok(m4.err==='','断面PDFがエラーなく作れる',m4.err);
  ok(m4.pdfAgo&&m4.pdfDim,'紙に「水切りアゴ」と寸法が出る',m4.pdfAgo+'/'+m4.pdfDim);
  ok(!m4.pdfKasagi,'アゴのときは紙に笠木を出さない',m4.pdfKasagi);

  /* ⑤ メニューへ戻ると「アゴあり」が選択中の見た目 */
  const m5=await p.evaluate(()=>{
    nnZMenuOpen();
    return [...document.querySelectorAll('#nnZMenu .agoB.on')].map(x=>x.dataset.ago).join(',');
  });
  ok(m5==='1,1','メニューに戻るとアゴありが選択中',m5);

  /* ⑥ アゴなしに切替 → confirm（既存の辺にも反映）→ 全辺からアゴが外れる */
  dlg=[];
  await p.click('#nnZMenu .zmCard .agoB[data-ago="0"]');
  await p.waitForTimeout(500);
  const m6=await p.evaluate(()=>({
    saved:(function(){try{return localStorage.getItem('nn_zumen_agodef');}catch(_){return null;}})(),
    none:state.polys.every(pp=>pp.edges.every(e=>!e.ago)),
    ag:nnMajorAgo().on,
  }));
  ok(dlg.length===1,'既存の図面があるので confirm を聞く',dlg.join('|'));
  ok(m6.saved==='0','既定（アゴなし）が保存される',m6.saved);
  ok(m6.none&&!m6.ag,'OKで既存の全辺からアゴが外れる',m6.none+'/'+m6.ag);

  /* ⑦ 紙も笠木の納まりに戻る */
  const m7=await p.evaluate(()=>{
    let html=''; const ow=window.open;
    window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){},addEventListener(){}});
    try{ nnSectionPDF(); }catch(e){}
    window.open=ow;
    const flat=html.replace(/<[^>]+>/g,' ');
    return {kasagi:flat.indexOf('アルミ笠木')>=0, ago:flat.indexOf('水切りアゴ')>=0};
  });
  ok(m7.kasagi&&!m7.ago,'アゴなしに戻すと紙は笠木の納まり',JSON.stringify(m7));

  ok(errs.length===0,'JSエラーなし',errs.join('|')||'');
  console.log('=== ★NG', NG.length, NG.join(' / '));
  await b.close();
})();
