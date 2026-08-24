/* ダッシュボードの数字が、たがいに食い違っていないか（経営の画面なので数字が命）。
   その場の計算をもう一度呼ぶのではなく、
   「画面に出ている数字どうしの関係」と「物件データから別の道すじで数えた値」で確かめる。
   使い方: node _check/dash1.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;
const ok=(t,c,x)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(x!==undefined?'  '+JSON.stringify(x).slice(0,150):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
await p.waitForTimeout(2800);

const d=await p.evaluate(()=>{
  const num=t=>{ const m=String(t).replace(/[^\d.]/g,''); return m?+m:null; };
  /* 金額は「1 億 7,593 万」のように分かれて出るので、まとめて円に直す */
  const yen=t=>{ const s=String(t).replace(/\s/g,'');
    const oku=(s.match(/([\d,]+)億/)||[])[1], man=(s.match(/([\d,]+)万/)||[])[1];
    if(oku==null&&man==null) return null;
    return (oku?+oku.replace(/,/g,''):0)*1e8 + (man?+man.replace(/,/g,''):0)*1e4; };
  const grps=[...document.querySelectorAll('#dashboard .kgrp')].map(g=>{
    const head=g.querySelector('.kgh');
    return {
      name:(head?head.childNodes[0].textContent:'').trim(),
      n:head?num(head.querySelector('b')?head.querySelector('b').textContent:''):null,
      cells:[...g.querySelectorAll('.kcell')].map(c=>({
        m:(c.querySelector('.kgm')?c.querySelector('.kgm').childNodes[0].textContent:'').trim(),
        txt:c.innerText.replace(/\n+/g,' ')
      }))
    };
  });
  /* 受注率のファネル */
  /* 受注率のファネル（引合い→調査→見積→契約）は、画面の文字から拾う。
     ★決め打ちのセレクタだと、作りが変わったとき黙って素通りする（§187）。 */
  const funnel=(()=>{
    const t=document.getElementById('dashboard').innerText.replace(/\s+/g,' ');
    const m=t.match(/引合い\s*([\d,]+).{0,12}調査\s*([\d,]+).{0,12}見積\s*([\d,]+).{0,12}契約\s*([\d,]+)/);
    return m? m.slice(1).map(v=>+v.replace(/,/g,'')) : [];
  })();
  return {grps, funnel, 物件数:props.length,
    件数:{見積済:props.filter(x=>x.stRaw==='mit').length,
          調査済:props.filter(x=>x.stRaw==='chosa').length,
          引合い:props.filter(x=>x.stRaw==='hikiai').length,
          契約済:props.filter(x=>x.stRaw==='keiyaku').length,
          施工中:props.filter(x=>x.stRaw==='kou').length,
          完成済:props.filter(x=>x.stRaw==='kan').length}};
});

ok('KPIの枠が4つある', d.grps.length===4, d.grps.map(g=>g.name+'/'+g.n));
const by={}; d.grps.forEach(g=>by[g.name]=g);
const money=t=>{ const s=String(t).replace(/\s/g,'');
  const oku=(s.match(/([\d,]+)億/)||[])[1], man=(s.match(/([\d,]+)万/)||[])[1];
  if(oku==null&&man==null) return null;
  return (oku?+oku.replace(/,/g,''):0)*1e8 + (man?+man.replace(/,/g,''):0)*1e4; };
const pct=t=>{ const m=String(t).match(/([\d.]+)\s*%/); return m?+m[1]:null; };

['見積済','契約高','完成工事高','契約〜完成'].forEach(nm=>{
  const g=by[nm];
  if(!g){ ok('枠「'+nm+'」がある', false); return; }
  const amt=money(g.cells[0]?g.cells[0].txt:'');
  const gro=money(g.cells[1]?g.cells[1].txt:'');
  const rate=pct(g.cells[1]?g.cells[1].txt:'');
  ok(nm+'：金額が読める', amt!=null && amt>0, amt);
  ok(nm+'：粗利が読める', gro!=null && gro>0, gro);
  if(amt&&gro&&rate!=null){
    const calc=gro/amt*100;
    ok(nm+'：粗利率＝粗利÷金額（±0.6pt）', Math.abs(calc-rate)<0.6, {画面:rate, 計算:+calc.toFixed(2)});
  }
  ok(nm+'：件数が1件以上', g.n>0, g.n);
});

/* 重複なしの集計：契約〜完成 は 契約高・完成工事高 より少なくなく、合計より多くない */
if(by['契約〜完成']&&by['契約高']&&by['完成工事高']){
  const a=by['契約〜完成'].n, b1=by['契約高'].n, c1=by['完成工事高'].n;
  ok('契約〜完成の件数は「契約高・完成工事高」以上', a>=Math.max(b1,c1), {契約完成:a, 契約:b1, 完成:c1});
  ok('契約〜完成の件数は単純合計以下（重複を数えていない）', a<=b1+c1, {契約完成:a, 合計:b1+c1});
}
/* 受注率のファネルは減っていく */
ok('受注率のファネルの数字が読める（4つ）', d.funnel.length===4, d.funnel);
if(d.funnel.length===4){
  let mono=true; for(let i=1;i<d.funnel.length;i++) if(d.funnel[i]>d.funnel[i-1]) mono=false;
  ok('受注率のファネルは順に減る', mono, d.funnel);
  ok('ファネルの先頭は物件数と同じ', d.funnel[0]===d.物件数, [d.funnel[0], d.物件数]);
}
ok('物件は100件', d.物件数===100, d.物件数);
ok('ステータスの内訳の合計＝物件数',
   Object.values(d.件数).reduce((a,b)=>a+b,0)===d.物件数, d.件数);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
await b.close();
console.log('★NG'+NG);
})();
