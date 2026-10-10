/* ★2026-10-11b 仕様・材料の一覧（本人）：
   ①仕様番号の右に工法の絵（X-1＝ウレタン通気緩衝・X-2＝ウレタン密着・AS-T＝トーチ・AS-J＝常温粘着・S-F＝塩ビ接着・S-M＝塩ビ機械固定・アス防水＝熱工法）
   ②絵は行の高さに収まる・全部の行で同じ位置（縦一列）
   ③「D-1（部分粘着）」は D-1 が番号の大きさ、（部分粘着）は改行して小さく
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
    return {n:rows.length, X1:img({main:'X-1'}), X2:img({main:'X-2'}), AST1:img({main:'AS-T1'}), ASJ1:img({main:'AS-J1'}), SF1:img({main:'S-F1'}), SM2:img({main:'S-M2'}), A1:img({main:'A-1'}),
      d1:!!d1, d1big:cs?parseFloat(getComputedStyle(cs).fontSize):0, d1small:sm?parseFloat(getComputedStyle(sm).fontSize):0, d1line:sm?sm.getBoundingClientRect().top>cs.firstChild.parentNode.getBoundingClientRect().top+8:false, fit, xs}; });
  ok(nm+' ①工法の絵（X-1＝通気緩衝・X-2＝密着・AS-T1＝トーチ・AS-J1＝常温粘着・S-F1＝塩ビ接着・S-M2＝塩ビ機械固定・A-1＝熱工法）',
    d.X1==='ure_tsuki'&&d.X2==='ure_micchaku'&&d.AST1==='torch'&&d.ASJ1==='nenchaku'&&d.SF1==='enbi_setchaku'&&d.SM2==='enbi_kikai'&&d.A1==='netsu', d);
  ok(nm+' ②絵は行の高さに収まり、全部の行で同じ位置', d.fit&&d.xs.length===1, {fit:d.fit, xs:d.xs});
  ok(nm+' ③D-1（部分粘着）：番号はD-1・（部分粘着）は改行して小さく', d.d1&&d.d1small>0&&d.d1small<d.d1big&&d.d1line, {big:d.d1big, small:d.d1small, line:d.d1line});
  ok(nm+' JSエラーなし', !errs.length, errs.slice(0,2));
  await p.close(); } }catch(e){ ok('実行エラー '+e.message.slice(0,150), false); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
