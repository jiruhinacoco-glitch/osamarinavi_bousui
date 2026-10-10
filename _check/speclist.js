/* ★2026-10-11b 仕様・材料の一覧（本人）：
   ①仕様番号の右に工法の絵（X-1＝ウレタン通気緩衝・X-2＝ウレタン密着・AS-T＝トーチ・AS-J＝常温粘着・S-F＝塩ビ接着・S-M＝塩ビ機械固定・アス防水＝熱工法）
   ②絵は行の高さに収まる・全部の行で同じ位置（縦一列）
   ③「D-1（部分粘着）」は D-1 が番号の大きさ、（部分粘着）は改行して小さく
   ④⑤⑥（§630）X-1H・X-2H＝吹付／X-1・X-2立上り＝ウレタン密着・絵の見た目の大きさを全部そろえる・詳細の右上にも大きめの絵
   使い方: node _check/speclist.js [shiyo_toroku.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'shiyo_toroku.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,vp,mob] of [['PC',{viewport:{width:1440,height:900}},0],['スマホ',{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true},1]]){
  const p=await b.newPage(vp); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mob) await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
  const d=await p.evaluate(()=>{ const rows=[...document.querySelectorAll('#list .mrow')];
    const by=c=>rows.find(r=>{ const e=r.querySelector('.code'); return e&&e.firstChild&&e.firstChild.textContent.trim()===c.main&&(!c.sub||((e.querySelector('small')||{}).textContent||'')===c.sub); });
    const img=c=>{ const r=by(c), i=r&&r.querySelector('img'); return i?i.getAttribute('src').replace(/^.*(kou_|kq\/)|(_h\d+)?\.(png|webp).*$/g,''):''; };   /* kou_hq.js が高画質版（icons/kq/◯◯_h32）へ差し替える */
    const d1=by({main:'D-1',sub:'（部分粘着）'}), cs=d1&&d1.querySelector('.code'), sm=cs&&cs.querySelector('small');
    const fit=rows.every(r=>{ const i=r.querySelector('.kic'); if(!i) return false; const a=i.getBoundingClientRect(), h=r.getBoundingClientRect(); return a.top>=h.top-0.5&&a.bottom<=h.bottom+0.5; });
    const xs=[...new Set(rows.map(r=>{ const i=r.querySelector('.kic'); return i?Math.round(i.getBoundingClientRect().left):-1; }))];
    const sz=[...new Set(rows.map(r=>{ const i=r.querySelector('.kic img'); if(!i) return null; const b=i.getBoundingClientRect(); return Math.round(b.width)+'x'+Math.round(b.height); }).filter(Boolean))];
    return {sz, X1H:img({main:'X-1H'}), X2H:img({main:'X-2H'}), XHT:img({main:'X-1H・X-2H',sub:'立上り'}), XT:img({main:'X-1・X-2',sub:'立上り'}), n:rows.length, X1:img({main:'X-1'}), X2:img({main:'X-2'}), AST1:img({main:'AS-T1'}), ASJ1:img({main:'AS-J1'}), SF1:img({main:'S-F1'}), SM2:img({main:'S-M2'}), A1:img({main:'A-1'}),
      d1:!!d1, d1big:cs?parseFloat(getComputedStyle(cs).fontSize):0, d1small:sm?parseFloat(getComputedStyle(sm).fontSize):0, d1line:sm?sm.getBoundingClientRect().top>cs.firstChild.parentNode.getBoundingClientRect().top+8:false, fit, xs}; });
  ok(nm+' ①工法の絵（X-1＝通気緩衝・X-2＝密着・AS-T1＝トーチ・AS-J1＝常温粘着・S-F1＝塩ビ接着・S-M2＝塩ビ機械固定・A-1＝熱工法）',
    d.X1==='ure_tsuki'&&d.X2==='ure_micchaku'&&d.AST1==='torch'&&d.ASJ1==='nenchaku'&&d.SF1==='enbi_setchaku'&&d.SM2==='enbi_kikai'&&d.A1==='netsu', d);
  ok(nm+' ④（§630）X-1H・X-2H・その立上り＝吹付の絵／X-1・X-2の立上り＝X-2と同じ（ウレタン密着）', d.X1H==='ure_fukitsuke'&&d.X2H==='ure_fukitsuke'&&d.XHT==='ure_fukitsuke'&&d.XT==='ure_micchaku', d);
  ok(nm+' ⑤（§630）絵の見た目の大きさが全部同じ', d.sz.length===1, d.sz);
  /* ⑥ 仕様を押すと右（スマホは下）の詳細の右上に大きめの絵・どの仕様でも同じ大きさ・見出しに重ならない */
  const dd=[]; for(const c of ['S-F1','S-M2','X-1H','A-1']){ dd.push(await p.evaluate(c=>{ const r=[...document.querySelectorAll('#list .mrow')].find(x=>x.querySelector('.code').firstChild.textContent.trim()===c); if(!r) return null; r.click();
      const i=document.querySelector('.dhead .dkic img'); if(!i) return {c}; const b=i.getBoundingClientRect(), h=document.querySelector('.dhead h2').getBoundingClientRect();
      return {c, s:Math.round(b.width)+'x'+Math.round(b.height), ov:b.left<h.right-1&&b.bottom>h.top+1&&b.top<h.bottom-1}; },c));
    if(mob) await p.evaluate(()=>{ const b=document.querySelector('.back-list'); b&&b.click(); }); await p.waitForTimeout(150); }
  ok(nm+' ⑥（§630・§633）詳細の右上に絵・どれも同じ大きさ・見出しに重ならない', dd.every(x=>x&&x.s&&x.s===dd[0].s&&!x.ov)&&parseInt(dd[0].s)>=56, dd);
  /* ⑦（§631）詳細の工程表：文字は上下の真ん中・使用量は上下左右とも真ん中（文字の中心とマスの中心を実測で比べる） */
  const t7=await p.evaluate(()=>{ const r=[...document.querySelectorAll('#list .mrow')][1]; r.click();
    const rows=[...document.querySelectorAll('.step-tbl tbody tr, .step-tbl tr')].filter(x=>x.querySelector('td')), bad=[];
    const mid=(td)=>{ const rg=document.createRange(); rg.selectNodeContents(td); const a=rg.getBoundingClientRect(), c=td.getBoundingClientRect(); return {dy:Math.abs((a.top+a.bottom)/2-(c.top+c.bottom)/2), dx:Math.abs((a.left+a.right)/2-(c.left+c.right)/2)}; };
    rows.forEach((tr,i)=>{ const td=[...tr.children]; if(td.length<6) return; const m1=mid(td[1]), u1=mid(td[2]), u2=mid(td[4]);
      if(m1.dy>3) bad.push(i+':材料'); if(u1.dy>3||u1.dx>3) bad.push(i+':使用量1'); if(u2.dy>3||u2.dx>3) bad.push(i+':使用量2'); });
    return {n:rows.length, bad}; });
  ok(nm+' ⑦（§631）工程表の文字は上下の真ん中・使用量は上下左右とも真ん中', t7.n>3&&!t7.bad.length, t7);
  if(mob) await p.evaluate(()=>{ const b=document.querySelector('.back-list'); b&&b.click(); });
  /* ⑧（§632）詳細：上に工程イラスト＋工程の説明、下に工程表。行を押すとその工程に・次へ・全体に戻る */
  const t8=await p.evaluate(()=>{ const r=[...document.querySelectorAll('#list .mrow')][0]; r.click();
    const st=document.querySelector('.stage'), tb=document.querySelector('.step-tbl'); if(!st||!tb) return {st:!!st};
    const above=st.getBoundingClientRect().bottom<=tb.getBoundingClientRect().top+1;
    const t0=document.getElementById('stinfo').textContent.includes('全体');
    document.querySelectorAll('.step-tbl tr.strow')[2].click();
    const frac=(document.querySelector('#stinfo .sih .frac')||{}).textContent; const on=(document.querySelector('.step-tbl tr.strow.on')||{dataset:{}}).dataset.i, t2=document.getElementById('stinfo').textContent, lab=document.querySelector('#st3d .stlab').textContent;
    const nx=[...document.querySelectorAll('#stinfo .sinav button')][1]; nx&&nx.click(); const on2=(document.querySelector('.step-tbl tr.strow.on')||{dataset:{}}).dataset.i;
    const all=[...document.querySelectorAll('#stinfo .sih button')][0]; all&&all.click(); const off=!document.querySelector('.step-tbl tr.strow.on');
    return {frac, above, t0, on, has3:/工程 3/.test(t2)&&/材料・工法/.test(t2), lab, on2, off}; });
  ok(nm+' ⑧（§632）上に工程イラスト＋説明・下に工程表／行を押すとその工程・次の工程・全体に戻る', t8.above&&t8.t0&&t8.on==='2'&&t8.has3&&/工程 3/.test(t8.lab)&&t8.on2==='3'&&t8.off&&t8.frac==='3／9', t8);
  if(mob) await p.evaluate(()=>{ const b=document.querySelector('.back-list'); b&&b.click(); });
  /* ⑨（§633）一覧の工法名の（…）は2行目に小さく／パソコンは全50仕様が詳細をスクロールなしで1画面・右上の絵が下の説明に重ならない */
  const t9=await p.evaluate(async(mob)=>{ const rows=[...document.querySelectorAll('#list .mrow')], over=[], ov=[]; let two=0;
    rows.forEach(r=>{ const sm=r.querySelector('.nm small'); if(sm&&parseFloat(getComputedStyle(sm).fontSize)<parseFloat(getComputedStyle(r.querySelector('.nm')).fontSize)) two++; });
    if(!mob) for(const r of rows){ r.click(); await new Promise(z=>setTimeout(z,20)); const d=document.getElementById('detail'); if(d.scrollHeight>d.clientHeight+1) over.push(r.querySelector('.code').textContent);
      const k=document.querySelector('.dhead .dkic'), st=document.querySelector('.stage'); if(k&&st&&k.getBoundingClientRect().bottom>st.getBoundingClientRect().top+0.5) ov.push(r.querySelector('.code').textContent); }
    return {two, over, ov}; },mob);
  ok(nm+' ⑨（§633）工法名の（…）は2行目に小さく'+(mob?'':'・全50仕様がスクロールなしで1画面・右上の絵が重ならない'), t9.two>=10&&!t9.over.length&&!t9.ov.length, t9);
  /* ⑩（§634）見出しの平行四辺形は文字に合う高さ（文字の1.4倍以内）・工程表に円/㎡の列は無い */
  await p.evaluate(()=>[...document.querySelectorAll('#list .mrow')][0].click()); await p.waitForFunction(()=>document.querySelector('#detail .panel h4 .httl'),null,{timeout:3000}).catch(()=>{});   /* 見出しの包みは0.2秒まとめて後から */
  const t10=await p.evaluate(()=>{ const t=document.querySelector('#detail .panel h4 .httl'); if(!t) return null;
    const rg=document.createRange(); rg.selectNodeContents(t); const tx=rg.getBoundingClientRect(), fr=t.getBoundingClientRect();
    return {kat:/カタログ/.test(document.getElementById('detail').textContent), q:document.getElementById('q').placeholder, qh:Math.round(document.getElementById('q').getBoundingClientRect().height), fr:Math.round(fr.height), tx:Math.round(tx.height), yen:[...document.querySelectorAll('.step-tbl th')].some(th=>/円/.test(th.textContent)), cols:document.querySelector('.step-tbl tr').children.length}; });
  ok(nm+' ⑩（§634）平行四辺形の枠が文字に合う高さ（文字＋上下4px）・工程表に円/㎡は無い・「カタログ」の文言なし・検索は「仕様番号」で高さ30px以下', t10&&t10.fr<=t10.tx+8&&!t10.yen&&t10.cols===5&&!t10.kat&&/^仕様番号/.test(t10.q)&&t10.qh<=30, t10);
  if(mob) await p.evaluate(()=>{ const b=document.querySelector('.back-list'); b&&b.click(); });
  ok(nm+' ②絵は行の高さに収まり、全部の行で同じ位置', d.fit&&d.xs.length===1, {fit:d.fit, xs:d.xs});
  ok(nm+' ③D-1（部分粘着）：番号はD-1・（部分粘着）は改行して小さく', d.d1&&d.d1small>0&&d.d1small<d.d1big&&d.d1line, {big:d.d1big, small:d.d1small, line:d.d1line});
  ok(nm+' JSエラーなし', !errs.length, errs.slice(0,2));
  await p.close(); } }catch(e){ ok('実行エラー '+e.message.slice(0,150), false); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
