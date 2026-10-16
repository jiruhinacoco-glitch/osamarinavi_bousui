/* ★§702 写真台帳：黒板の項目（本人「工事件名・工事場所・日付・施工者などを左側で選択タブにしつつ入力もできるように。文字サイズを任意で選べるように」）
   ① 項目名の横の ▼ で一覧（工事件名・工事場所・日付・工種・施工者）が開く・項目名の欄に自分で書ける
   ② 一覧で「日付」を選ぶと中身は自動で撮影日（薄緑）・黒板にも撮影日（＝「工事場所なのに撮影日」のような食い違いが起きない）
   ③ 自動の中身（工事件名＝現場名）に書くとその文字が黒板に出る・消すと現場名に戻る
   ④ 項目名に「工種」と打つと中身が自動で工種
   ⑤ 文字の大きさ：小さめ＜ふつう＜大きめ（黒板の現場名の文字）・開き直しても残る
   ⑥ スマホ縦で項目の欄の部品がはみ出さない・pageerror 0
   直す前の版では ①〜⑤ が★NG。  使い方: node _check/daicho_komoku.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const A='項目試験の現場';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); if(!sessionStorage.getItem('km_keep')){ localStorage.removeItem('nn_daicho_pref_v1'); sessionStorage.setItem('km_keep','1'); } }catch(e){}
    window._ft=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t,x,y){ if(this.canvas.id==='dbCv1') window._ft.push({t:String(t),fs:parseFloat((/([\d.]+)px/.exec(this.font)||[])[1])||0}); return o.apply(this,arguments); }; });
  const open=async()=>{ await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200); await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); await p.evaluate(()=>window.nnDbReg&&nnDbReg()); await p.evaluate(()=>document.querySelector('#dbv .dbSide').classList.remove('closed')); };
  const setSite=async(v)=>{ await p.fill('#dbSite',v); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(900); };
  const draw=async()=>{ await p.evaluate(()=>{ window._ft=[]; document.getElementById('dbSize').dispatchEvent(new Event('input',{bubbles:true})); }); await p.waitForTimeout(700); return p.evaluate(()=>window._ft.slice()); };
  const row=i=>p.locator('#dbItemL .bir').nth(i);
  await open(); await setSite(A); await p.click('#dbItemTg'); await p.waitForTimeout(150);
  /* ① */
  let n1=await row(1).locator('.ilm').count(); let menu=[];
  if(n1){ await row(1).locator('.ilm').click(); await p.waitForTimeout(150); menu=await p.evaluate(()=>[...document.querySelectorAll('#dbItemL .ilpop .ilo')].map(e=>e.textContent)); }
  const ed=await p.evaluate(()=>{ const e=document.querySelector('#dbItemL .bir .il'); return !!e&&!e.readOnly&&!e.disabled; });
  ok('① ▼で項目名の一覧（工事件名・工事場所・日付・工種・施工者）・項目名は自分でも書ける', n1>0&&['工事件名','工事場所','日付','工種','施工者'].every(x=>menu.includes(x))&&ed, {menu,ed});
  /* ② 2行目（工事場所）を「日付」に */
  let r2={};
  if(menu.length){ await p.locator('#dbItemL .ilpop .ilo',{hasText:'日付'}).click(); await p.waitForTimeout(300);
    const ft=await draw(); r2=await p.evaluate(()=>{ const d=document.querySelectorAll('#dbItemL .bir')[1]; return {l:d.querySelector('.il').value, v:d.querySelector('.iv').value, auto:d.querySelector('.iv').classList.contains('auto'), date:document.getElementById('dbDate').value}; });
    r2.board=ft.map(f=>f.t).join('|'); }
  const y=r2.date?+r2.date.slice(0,4):0, dOk=!!r2.v&&/(令和|\d{4})/.test(r2.v)&&r2.v.includes(String(+(r2.date||'').slice(5,7))+'月');
  ok('② 「日付」を選ぶと中身は自動で撮影日（薄緑）・黒板にも撮影日', r2.l==='日付'&&r2.auto&&dOk&&(r2.board||'').includes(r2.v), r2);
  /* ③ 工事件名（自動＝現場名）に書く → 消す */
  const iv0=row(0).locator('.iv'); let r3={};
  if(await iv0.count()){ const a0=await iv0.evaluate(e=>({v:e.value,auto:e.classList.contains('auto')})); await iv0.fill('〇〇ビル屋上改修'); await p.evaluate(()=>document.activeElement.blur()); let ft=await draw(); r3.a0=a0; r3.w=ft.some(f=>f.t==='〇〇ビル屋上改修'); r3.wAuto=await iv0.evaluate(e=>e.classList.contains('auto'));
    await iv0.fill(''); await iv0.dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); ft=await draw(); r3.back=ft.some(f=>f.t===A); r3.bAuto=await iv0.evaluate(e=>e.classList.contains('auto')); r3.bv=await iv0.inputValue(); }
  ok('③ 工事件名は自動で現場名・書くとその文字が黒板に・消すと現場名に戻る', r3.a0&&r3.a0.v===A&&r3.a0.auto&&r3.w&&!r3.wAuto&&r3.back&&r3.bAuto&&r3.bv===A, r3);
  /* ④ 項目を足して「工種」と打つ */
  await p.click('#dbItemAdd'); await p.waitForTimeout(200); const last=await p.evaluate(()=>document.querySelectorAll('#dbItemL .bir').length-1);
  await row(last).locator('.il').fill('工種'); await p.waitForTimeout(300); const r4=await row(last).locator('.iv').evaluate(e=>({v:e.value,auto:e.classList.contains('auto')})).catch(()=>({}));
  ok('④ 項目名に「工種」と打つと中身は自動で工種', r4.v==='防水工事'&&r4.auto, r4);
  /* ⑤ 文字の大きさ */
  const has=await p.locator('#dbFs').count(); let r5={has};
  if(has){ const fsOf=async v=>{ await p.selectOption('#dbFs',v); await p.waitForTimeout(300); const ft=await draw(); const f=ft.find(x=>x.t===A); return f?f.fs:0; };
    r5.s=await fsOf('s'); r5.m=await fsOf('m'); r5.l=await fsOf('l'); r5.xl=await fsOf('xl'); await p.selectOption('#dbFs','l'); await p.waitForTimeout(300);
    await open(); await p.waitForTimeout(300); r5.keep=await p.inputValue('#dbFs'); }
  ok('⑤ 文字の大きさ 小さめ＜ふつう＜大きめ＜特大・開き直しても残る', has&&r5.s<r5.m&&r5.m<r5.l&&r5.l<r5.xl&&r5.keep==='l', r5);
  /* ⑥ */
  await setSite(A); await p.evaluate(()=>{ const it=document.getElementById('dbItems'); if(it.classList.contains('shut')) document.getElementById('dbItemTg').click(); }); await p.waitForTimeout(200);
  if(await row(0).locator('.ilm').count()){ await row(0).locator('.ilm').click(); await p.waitForTimeout(150); }
  const t6=await p.evaluate(()=>{ const box=document.getElementById('dbItems'), R=box.getBoundingClientRect(); return [...box.querySelectorAll('input,select,button')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&(r.left<R.left-1||r.right>R.right+1); }).map(e=>e.className||e.id); });
  await p.locator('#dbItems').scrollIntoViewIfNeeded(); await p.locator('#dbItems').screenshot({path:'/tmp/komoku.png'}).catch(()=>{});
  ok('⑥ スマホ縦で項目の欄の部品がはみ出さない・pageerror 0', t6.length===0&&errs.length===0, {t6,errs});
  await p.evaluate(()=>{ try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} });
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
