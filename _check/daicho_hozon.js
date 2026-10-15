/* ★§691 写真台帳：保存が見えない・「戻る」で編集前に戻る（本人「保存ボタンがないので変更や保存を認知しにくい。戻るを押したら編集前に戻る」）
   iPhone は「戻る」などのボタンを押しても入力欄を離れたことにならず（change が来ない）、打った部位・作業内容が保存されないまま消えていた。
   ここでは「欄にいたまま、ボタンだけ押す」（evaluate で click）で iPhone と同じ状況を作る。スマホ縦(幅360)・PC で：
   ① 写真の部位・作業内容を打って、欄にいたまま「戻る」→ 開き直しても残る
   ② ページを読み込み直しても残る（端末に保存されている）
   ③ 上の帯に保存ボタン：はじめ「✓ 保存済み」→ 打つと「● 保存する」→ 少し待つと自動で「✓ 保存済み」
   ④ 自動保存のときにキーボードを閉じない（打っている欄から離れない）
   ⑤ 保存ボタンを押す／変えてから戻る → 「保存しました」が出る
   ⑥ 拡大画面の部位も、欄にいたまま閉じて戻っても残る
   ⑦ スマホ縦：上の帯のボタン・保存ボタンが画面からはみ出さない・題名と重ならない
   ⑧ pageerror 0
   直す前の版では ①②③⑤⑥ が★NG。  使い方: node _check/daicho_hozon.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const SITE='〇〇防水工事A棟';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,o] of [['スマホ縦',{viewport:{width:360,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['PC',{viewport:{width:1600,height:900}}]]){
  const ctx=await b.newContext(o); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(nm!=='PC') await p.addInitScript(([w,h])=>{ Object.defineProperty(screen,'width',{get:()=>w}); Object.defineProperty(screen,'height',{get:()=>h}); localStorage.setItem('nn_view_mode','mobile'); },[o.viewport.width,o.viewport.height]);
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(900);
  await p.evaluate(async(SITE)=>{ const c=document.createElement('canvas'); c.width=120;c.height=90; c.getContext('2d').fillRect(0,0,120,90); const m=await nnPhotos.load('nn_daicho_v1');
    for(const id of ['h1','h2']){ const v={raw:1,d:c.toDataURL('image/jpeg'),t:Date.now()-(id==='h2'?1000:0),site:SITE,kind:'防水工事',date:'2026-10-15',era:'wareki',part:'',work:'',w:120,h:90}; await nnPhotos.put('nn_daicho_v1',id,v); if(m) m[id]=v; } },SITE);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(800); if(await p.locator('#dbLibList .libCard').count()){ await p.locator('#dbLibList .libCard').first().click(); await p.waitForTimeout(800); } };
  const click=id=>p.evaluate(id=>document.getElementById(id).click(),id);   // 欄から離れずにボタンだけ押す（iPhone と同じ）
  /* iPhone（WebKit）は、ボタンを押しても・欄が隠れても「欄を離れた」（change）が来ない。ここ（Chromium）は隠すと change が来て保存されてしまうので、その間 change を止めて iPhone と同じにする */
  const ios=on=>p.evaluate(on=>{ if(on&&!window.__iosH){ window.__iosH=e=>{ if(e.target&&e.target.closest&&e.target.closest('#dbv')) e.stopImmediatePropagation(); }; window.addEventListener('change',window.__iosH,true); } if(!on&&window.__iosH){ window.removeEventListener('change',window.__iosH,true); window.__iosH=null; } },on);
  const tiles=()=>p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile')].filter(t=>t.querySelector('.part')).map(t=>t.querySelector('.part').value+'/'+t.querySelector('.work').value));
  const chip=()=>p.evaluate(()=>{ const e=document.getElementById('dbSaveSt'); return e&&e.getBoundingClientRect().height>0?e.textContent.trim():null; });
  const toastT=()=>p.evaluate(()=>{ const t=document.getElementById('toast'); return t&&t.classList.contains('show')?t.textContent:''; });
  await open();
  const c0=await chip();
  await p.locator('#dbGrid .tile .part').first().click(); await p.keyboard.type('屋上');
  await p.waitForTimeout(150); const c1=await chip();
  await p.waitForTimeout(1300); const c2=await chip(); const foc=await p.evaluate(()=>document.activeElement&&document.activeElement.className);
  ok(nm+' ③ 保存ボタン：保存済み→打つと「保存する」→自動で「保存済み」', /保存済み/.test(c0||'')&&/保存する/.test(c1||'')&&/保存済み/.test(c2||''), {c0,c1,c2});
  ok(nm+' ④ 自動保存でキーボードを閉じない（打っている欄のまま）', foc==='part', foc);
  await p.locator('#dbGrid .tile .work').first().click(); await p.keyboard.type('施工前');
  await ios(true); await click('dbBack'); await p.waitForTimeout(300); const tb=await toastT(); await p.waitForTimeout(500); await ios(false);
  if(await p.locator('#dbLibList .libCard').count()){ await p.locator('#dbLibList .libCard').first().click(); await p.waitForTimeout(800); }
  const t1=await tiles();
  ok(nm+' ① 打って欄にいたまま「戻る」→ 開き直しても残る', t1[0]==='屋上/施工前', t1);
  ok(nm+' ⑤a 変えてから戻ると「保存しました」', /保存しました/.test(tb), tb);
  // ⑤b 保存ボタン
  await p.locator('#dbGrid .tile .part').nth(1).click(); await p.keyboard.type('廊下'); await click('dbSaveSt'); await p.waitForTimeout(300);
  const ts=await toastT(), c3=await chip(); await p.evaluate(()=>document.activeElement&&document.activeElement.blur());
  ok(nm+' ⑤b 保存ボタンを押すと「保存しました」・表示は「保存済み」', /保存しました/.test(ts)&&/保存済み/.test(c3||''), {ts,c3});
  // ⑥ 拡大画面
  await p.locator('#dbGrid .tile canvas').nth(1).click(); await p.waitForTimeout(500);
  await p.locator('#dbVWork').click(); await p.keyboard.type('高圧洗浄'); await ios(true); await click('dbViewX'); await p.waitForTimeout(200); await click('dbBack'); await p.waitForTimeout(600); await ios(false);
  if(await p.locator('#dbLibList .libCard').count()){ await p.locator('#dbLibList .libCard').first().click(); await p.waitForTimeout(800); }
  const t6=await tiles();
  ok(nm+' ⑥ 拡大画面で打って閉じて戻っても残る', t6[1]==='廊下/高圧洗浄', t6);
  // ② 読み込み直し
  await p.reload(); await p.waitForTimeout(900); await open(); const t2=await tiles();
  ok(nm+' ② 読み込み直しても残る', t2[0]==='屋上/施工前'&&t2[1]==='廊下/高圧洗浄', t2);
  if(nm==='スマホ縦'){ const w=await p.evaluate(()=>{ const r=i=>{ const e=document.getElementById(i); if(!e) return null; const q=e.getBoundingClientRect(); return [Math.round(q.left),Math.round(q.top),Math.round(q.right),Math.round(q.bottom)]; }; return {cw:document.documentElement.clientWidth, s:r('dbShootH'), p:r('dbPickH'), t:r('dbTtl'), c:r('dbSaveSt')}; });
    ok(nm+' ⑦ 上の帯がはみ出さない・保存ボタンは題名の下で重ならない', !!w.c&&w.p[2]<=w.cw&&w.c[2]<=w.s[0]&&w.c[1]>=w.t[3]-2&&w.c[2]>w.c[0], w); }
  ok(nm+' ⑧ pageerror 0', errs.length===0, errs);
  await ctx.close(); }
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
