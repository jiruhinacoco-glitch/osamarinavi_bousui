/* ★2026-10-13zh 写真台帳：確認の画面・送る前の見直し・上の欄と下の帯（本人・§674）
   ① 下のボタンは「確認」（「保存」ではない）→ 全面の確認画面。写真の枚数ぶん横に並び（1枚＝画面の幅）、「1／5」→ ▶ で「2／5」に横へ動く
   ② スマホ「写真に保存」：共有画面（「画像を保存」で写真アプリへ）にファイルだけ・黒板つき JPEG 5枚。ダウンロード（ファイルアプリへ飛ぶ）はしない
   ③ 印刷・PDF：押した時点では送らず、ページ（A4 の形）を横にめくる確認画面。そこで「PDF を送る・保存」→ PDF をファイルだけで共有
   ④ Excel：同じく確認画面にページ →「Excel を送る・保存」→ xlsx をファイルだけで共有
   ⑤ 上の「現場登録」に長い現場名が省略されず全部出る（切れていない）
   ⑥ 下の帯に現場名・枚数を出さない・ボタン4つが1行・文字がはみ出さない
   ⑦ 選んだ写真にまとめて付ける欄：文字 12.5px 以下・入力欄の高さ 28px 以下・1行目「全部選ぶ…削除」2行目「部位・作業内容・まとめて付ける」・札は種類ごとに1行
   ⑧ pageerror 0
   直す前の版では ①〜⑦ が★NG。  使い方: node _check/daicho_kakunin.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const SITE='サン太平レジデンス 大規模修繕（屋上・バルコニー防水）';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let dls=0; p.on('download',()=>dls++);
  await p.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){}
    window.print=()=>{ window._printed=(window._printed||0)+1; }; window._sh=[]; navigator.canShare=()=>true; navigator.share=(d)=>{ window._sh.push({keys:Object.keys(d), files:(d.files||[]).map(f=>({type:f.type,name:f.name}))}); return Promise.resolve(); }; });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(500);
  await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(300);
  const mk=(w,h)=>p.evaluate(([w,h])=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle='#3060c0'; g.fillRect(0,0,w,h); g.fillStyle='#c0d0f0'; g.fillRect(w*.12,h*.15,w*.76,h*.7); return c.toDataURL('image/png'); },[w,h]);
  const fl=[]; for(let i=0;i<5;i++) fl.push({name:'k'+i+'.png',mimeType:'image/png',buffer:Buffer.from((await mk(800,600)).split(',')[1],'base64')});
  await p.setInputFiles('#dbPickIn',fl);
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===5,null,{timeout:20000}); }catch(e){}
  await p.waitForTimeout(600); await p.evaluate(()=>{ const a=document.getElementById('dbAll'); if(!a.checked) a.click(); }); await p.waitForTimeout(300);
  /* ⑤ */
  const t5=await p.evaluate(()=>{ const f=document.querySelector('#dbFold .fs'), bb=f&&(f.querySelector('b')||f); if(!bb) return {none:true}; return {txt:bb.textContent, cut:bb.scrollHeight>bb.clientHeight+1||bb.scrollWidth>bb.clientWidth+1, vis:bb.getBoundingClientRect().height>0}; });
  ok('⑤ 上の「現場登録」に長い現場名が全部出る（省略・見切れなし）', !t5.none&&t5.vis&&t5.txt===SITE&&!t5.cut, t5);
  /* ⑥ */
  const t6=await p.evaluate(()=>{ const c=document.getElementById('dbCount'), cv=!!c&&getComputedStyle(c).display!=='none'&&c.getBoundingClientRect().width>0, bs=[...document.querySelectorAll('#dbv .dbf button')];
    return {cnt:cv, n:bs.length, row:bs.every(x=>Math.abs(x.getBoundingClientRect().top-bs[0].getBoundingClientRect().top)<=2), over:bs.filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.textContent), txt:bs.map(x=>x.textContent.trim())}; });
  ok('⑥ 下の帯に現場名・枚数なし・ボタン4つが1行・文字がはみ出さない', !t6.cnt&&t6.n===4&&t6.row&&t6.over.length===0, t6);
  /* ⑦ */
  const t7=await p.evaluate(()=>{ const q=id=>document.getElementById(id), T=e=>Math.round(e.getBoundingClientRect().top), fs=e=>parseFloat(getComputedStyle(e).fontSize);
    const big=[q('dbAll').closest('label'),q('dbSelN'),q('dbApply'),q('dbDelSel'),...document.querySelectorAll('#dbBatch .chips button:not(.more)')].filter(e=>e.getBoundingClientRect().width>0).map(fs).filter(x=>x>12.5);
    const ih=[q('dbBPart'),q('dbBWork')].map(e=>Math.round(e.getBoundingClientRect().height));
    const chipRows=['dbParts','dbWorks'].map(id=>{ const ts=[...q(id).querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0).map(T); return ts.length&&ts.every(t=>Math.abs(t-ts[0])<=4)?1:2; });   /* 4px 以内は同じ行（1文字の札は1px ずれる） */
    return {big, ih, r1:[T(q('dbAll').closest('label')),T(q('dbDelSel'))], r2:[T(q('dbBPart')),T(q('dbBWork')),T(q('dbApply'))], chipRows}; });
  const near=a=>a.every(x=>Math.abs(x-a[0])<=4);
  ok('⑦ まとめて付ける欄：文字12.5px以下・入力欄28px以下・1行目 選ぶ…削除／2行目 部位・作業内容・付ける・札は1行ずつ', t7.big.length===0&&t7.ih.every(h=>h<=28)&&near(t7.r1)&&near(t7.r2)&&t7.r2[0]>t7.r1[0]+10&&t7.chipRows.every(n=>n===1), t7);
  /* ① */
  const lab=await p.evaluate(()=>document.getElementById('dbSave').textContent.trim());
  await p.click('#dbSave');
  try{ await p.waitForFunction(()=>{ const g=document.getElementById('dbRevGo'); return g&&!g.disabled; },null,{timeout:30000}); }catch(e){}
  const t1a=await p.evaluate(()=>{ const r=document.getElementById('dbRev'), s=document.getElementById('dbRevS'); if(!r) return {rev:false}; const sl=[...s.children], cw=document.documentElement.clientWidth;
    return {on:r.classList.contains('on'), full:Math.round(r.getBoundingClientRect().width)===cw&&Math.round(r.getBoundingClientRect().height)===document.documentElement.clientHeight, n:sl.length, w:sl.map(e=>Math.round(e.getBoundingClientRect().width)), lefts:sl.map(e=>Math.round(e.getBoundingClientRect().left)), no:document.getElementById('dbRevNo').textContent, imgs:sl.filter(e=>e.querySelector('img')).length}; });
  if(t1a.on){ await p.click('#dbRevN'); try{ await p.waitForFunction(()=>document.getElementById('dbRevS').scrollLeft>=392,null,{timeout:5000}); }catch(e){}   /* めくり終わってから測る */ }
  const t1b=await p.evaluate(()=>({no:(document.getElementById('dbRevNo')||{}).textContent, sl:Math.round((document.getElementById('dbRevS')||{}).scrollLeft||0)}));
  ok('① 「確認」ボタン → 全面の確認画面・写真5枚が横に並ぶ（1枚＝画面の幅）・1／5 → ▶ で 2／5', lab==='確認'&&t1a.on&&t1a.full&&t1a.n===5&&t1a.imgs===5&&t1a.w.every(w=>w===393)&&t1a.lefts.every((l,i)=>l===i*393)&&t1a.no==='1／5'&&t1b.no==='2／5'&&Math.abs(t1b.sl-393)<=1, {lab,t1a,t1b});
  /* ② */
  const d0=dls; await p.evaluate(()=>{ window._sh=[]; }); if(t1a.on) await p.click('#dbRevGo'); await p.waitForTimeout(800);
  const t2=await p.evaluate(()=>({sh:window._sh.map(s=>({keys:s.keys.join(), n:s.files.length, types:[...new Set(s.files.map(f=>f.type))].join()})), go:(document.getElementById('dbRevGo')||{}).textContent}));
  ok('② スマホ「写真に保存」：共有画面（画像を保存）へファイルだけ・JPEG 5枚・ダウンロードしない', t2.sh.length===1&&t2.sh[0].keys==='files'&&t2.sh[0].n===5&&t2.sh[0].types==='image/jpeg'&&dls===d0&&/写真に保存/.test(t2.go||''), {t2,dl:dls-d0});
  if(t1a.on) await p.click('#dbRevX'); await p.waitForTimeout(300);
  /* ③ */
  await p.evaluate(()=>{ window._sh=[]; window._printed=0; }); await p.click('#dbPrintBtn');
  try{ await p.waitForFunction(()=>{ const g=document.getElementById('dbRevGo'); return g&&!g.disabled&&document.getElementById('dbRev').classList.contains('on'); },null,{timeout:30000}); }catch(e){}
  await p.waitForTimeout(300);
  const t3a=await p.evaluate(async()=>{ const s=document.getElementById('dbRevS'); if(!s) return {rev:false,sh:window._sh.length}; const im=[...s.querySelectorAll('img')]; await Promise.all(im.map(i=>i.decode().catch(()=>{})));
    return {sh:window._sh.length, printed:window._printed||0, n:im.length, ratio:im.map(i=>+(i.naturalHeight/i.naturalWidth).toFixed(3)), t:document.getElementById('dbRevT').textContent}; });
  if(t3a.rev!==false) await p.click('#dbRevGo'); await p.waitForTimeout(500);
  const t3b=await p.evaluate(()=>window._sh.map(s=>({keys:s.keys.join(), type:s.files[0]&&s.files[0].type})));
  ok('③ 印刷・PDF：まず確認画面（送らない）にページ2枚（A4の形）→「送る・保存」で PDF をファイルだけ共有', t3a.rev!==false&&t3a.sh===0&&t3a.printed===0&&t3a.n===2&&t3a.ratio.every(r=>Math.abs(r-273/186)<0.01)&&t3b.length===1&&t3b[0].keys==='files'&&t3b[0].type==='application/pdf', {t3a,t3b});
  if(t3a.rev!==false) await p.click('#dbRevX'); await p.waitForTimeout(300);
  /* ④ */
  await p.evaluate(()=>{ window._sh=[]; }); await p.click('#dbXlsBtn');
  try{ await p.waitForFunction(()=>{ const g=document.getElementById('dbRevGo'); return g&&!g.disabled&&document.getElementById('dbRev').classList.contains('on'); },null,{timeout:40000}); }catch(e){}
  const t4a=await p.evaluate(()=>({sh:window._sh.length, n:document.getElementById('dbRevS')?document.querySelectorAll('#dbRevS img').length:-1}));
  if(t4a.n>=0) await p.click('#dbRevGo'); await p.waitForTimeout(500);
  const t4b=await p.evaluate(()=>window._sh.map(s=>({keys:s.keys.join(), type:s.files[0]&&s.files[0].type})));
  ok('④ Excel：まず確認画面（送らない）にページ2枚 →「送る・保存」で xlsx をファイルだけ共有', t4a.sh===0&&t4a.n===2&&t4b.length===1&&t4b[0].keys==='files'&&/spreadsheetml/.test(t4b[0].type||''), {t4a,t4b});
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  ok('⑧ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
