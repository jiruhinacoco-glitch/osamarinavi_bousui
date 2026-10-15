/* ★§691 写真台帳：保存が見えない・「戻る」で編集前に戻る（本人「保存ボタンがないので変更や保存を認知しにくい。戻るを押したら編集前に戻る」）
   iPhone は「戻る」などのボタンを押しても入力欄を離れたことにならず（change が来ない）、打った部位・作業内容が保存されないまま消えていた。
   ここでは「欄にいたまま、ボタンだけ押す」（evaluate で click）で iPhone と同じ状況を作る。スマホ縦(幅360)・PC で：
   ① 写真の部位・作業内容を打って、欄にいたまま「戻る」→ 開き直しても残る
   ② ページを読み込み直しても残る（端末に保存されている）
   ③ 上の帯に保存ボタン：はじめ「✓ 保存済み」→ 打つと「● 保存する」→ 少し待つと自動で「✓ 保存済み」
   ④ 自動保存のときにキーボードを閉じない（打っている欄から離れない）
   ⑤ 保存ボタンを押す／変えてから戻る → 「保存しました」が出る
   ⑥ 拡大画面の部位も、欄にいたまま閉じて戻っても残る
   ⑦ 保存ボタンは「現場登録」の見出しのすぐ右・大きくはっきり（§693 本人「現場登録の右に。もっとはっきり。大事なボタン」）・たたんでも見える
   ⑨ 「現場登録」と「黒板設定」は別々の枠（§693）
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
  /* ⑦ ★§693 保存ボタンは「現場登録」の見出しのすぐ右（同じ行）・大きくはっきり（字14px以上・高さ30px以上・色の付いたべた塗り）・ほかのボタンや見出しと重ならない・枠からはみ出さない。下の帯には置かない
     ⑨ 「現場登録」と「黒板設定」は別々の枠（カード）で、上下（PC・スマホ）に分かれ、重ならない */
  const geo7=()=>p.evaluate(()=>{ const sv=document.getElementById('dbSaveSt'), h=document.querySelector('#dbFold .httl'); if(!sv||!h) return null; const R=e=>e.getBoundingClientRect(); const a=R(sv), b=R(h), cs=getComputedStyle(sv);
    const card=sv.closest('.dbCard')||sv.closest('.dbSide'); const C=R(card); const others=[document.getElementById('dbFromBk'),document.querySelector('#dbFold .fv'),document.querySelector('#dbFold .fs b')].filter(e=>e&&R(e).width>0);
    const ov=others.filter(e=>{ const q=R(e); return q.left<a.right-1&&q.right>a.left+1&&q.top<a.bottom-1&&q.bottom>a.top+1; }).map(e=>e.id||e.className||e.tagName);
    return {vis:a.width>0, dy:Math.round((a.top+a.height/2)-(b.top+b.height/2)), gapL:Math.round(a.left-b.right), fs:parseFloat(cs.fontSize), h:Math.round(sv.offsetHeight), bg:cs.backgroundImage!=='none'||!/255, 255, 255/.test(cs.backgroundColor), inBar:!!sv.closest('.dbf'), ov, inCard:a.right<=C.right-2&&a.left>=C.left, txt:sv.textContent.trim()}; });
  const g7=await geo7();
  let g7c=null; if(nm==='スマホ縦'){ await p.evaluate(()=>{ const s=document.getElementById('dbSide'); if(!s.classList.contains('closed')) document.getElementById('dbFold').click(); }); await p.waitForTimeout(600); g7c=await geo7(); await p.evaluate(()=>document.getElementById('dbFold').click()); await p.waitForTimeout(600); }
  const ok7=g=>!!g&&g.vis&&Math.abs(g.dy)<=4&&g.gapL>=2&&g.gapL<=30&&g.fs>=14&&g.h>=30&&g.bg&&!g.inBar&&g.ov.length===0&&g.inCard;
  ok(nm+' ⑦ 保存ボタンは「現場登録」の見出しのすぐ右・大きくはっきり・重ならない・下の帯には無い'+(g7c?'（たたんだときも）':''), ok7(g7)&&(nm!=='スマホ縦'||ok7(g7c)), {g7,g7c});
  const g9=await p.evaluate(()=>{ const a=document.getElementById('dbSite').closest('.dbCard'), b=document.querySelector('.bh.bhk')&&document.querySelector('.bh.bhk').closest('.dbCard'); if(!a||!b) return {a:!!a,b:!!b}; const A=a.getBoundingClientRect(), B=b.getBoundingClientRect(), cs=getComputedStyle(b);
    return {two:a!==b, gap:Math.round(B.top-A.bottom), frame:parseFloat(cs.borderTopWidth)>=1, vis:B.height>0}; });
  ok(nm+' ⑨ 「現場登録」と「黒板設定」は別々の枠（上下に分かれ、すき間がある）', !!g9.two&&g9.vis&&g9.frame&&g9.gap>=4, g9);
  ok(nm+' ⑧ pageerror 0', errs.length===0, errs);
  await ctx.close(); }
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
