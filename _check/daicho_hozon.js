/* ★§691→§694 写真台帳：保存は「保存する」を押して確認したときだけ（本人「保存済みではなく保存する。保存するときは確認のウィンドウを出して合意形成を」）
   §691：iPhone は「戻る」などのボタンを押しても入力欄を離れたことにならず（change が来ない）、打った文字が消えていた。
   ここでは「欄にいたまま、ボタンだけ押す」（evaluate で click）＋ change を止めて iPhone と同じ状況を作る。スマホ縦(幅360)・PC で：
   ③ ボタンの文字はいつも「保存する」。打つと橙（保存待ち）＋保存待ちの枚数の札
   ⑤ 保存するを押すと「この内容で保存しますか？」（現場名・写真の枚数など）。やめる→保存待ちのまま／保存する→「保存しました」→作成済みの一覧へ（§695）
   ⑤b 何も変えていなくても同じ確認が出る（§695 本人「保存されていない変更はありません、では意味がわからない」）
   ① 打って欄にいたまま「戻る」→「保存されていない変更があります」→ 保存して戻る → 開き直しても残る（拡大画面で打った分も）
   ⑥ 「保存しないで戻る」→ 入力前に戻る（開き直すと元の値）
   ④ 同意なしに書かない：打って待ってから読み込み直すと、保存していない分は残らない
   ② 保存した分は読み込み直しても残る
   ⑦ 保存ボタンは「現場登録」の見出しのすぐ右・大きくはっきり（§693）・たたんでも見える
   ⑨ 「現場登録」と「黒板設定」は別々の枠（§693）
   ⑧ pageerror 0
   直す前の版では ③⑤①⑥④ が★NG。  使い方: node _check/daicho_hozon.js [camera.html の代わり] */
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
  const st=()=>p.evaluate(()=>{ const e=document.getElementById('dbSaveSt'); return e?{t:e.textContent.trim(),st:e.dataset.st,n:e.dataset.n||''}:null; });
  const ask=()=>p.evaluate(()=>{ const w=document.getElementById('dbAsk'); return w&&w.getBoundingClientRect().height>0?{t:w.querySelector('.askT').textContent,b:[...w.querySelectorAll('.askF button')].map(x=>x.textContent.trim())}:null; });
  const press=t=>p.evaluate(t=>{ const b=[...document.querySelectorAll('#dbAsk .askF button')].find(x=>x.textContent.includes(t)); if(b) b.click(); return !!b; },t);
  const reopen=async()=>{ await p.waitForTimeout(500); if(await p.locator('#dbLibList .libCard').count()&&await p.locator('#dbLibList .libCard').first().isVisible()){ await p.locator('#dbLibList .libCard').first().click(); await p.waitForTimeout(800); } };
  await open();
  const s0=await st();
  await p.locator('#dbGrid .tile .part').first().click(); await p.keyboard.type('屋上'); await p.waitForTimeout(1500);
  const s1=await st();
  ok(nm+' ③ 文字はいつも「保存する」・打つと橙（保存待ち）＋枚数の札', !!s0&&/保存する/.test(s0.t)&&s0.st!=='dirty'&&!s0.n&&!!s1&&/保存する/.test(s1.t)&&s1.st==='dirty'&&s1.n==='1', {s0,s1});
  const libOn=()=>p.evaluate(()=>{ const v=document.getElementById('dbv'); const c=document.querySelector('#dbLibList .libCard'); return v.classList.contains('lib')&&!!c&&c.getBoundingClientRect().height>0; });
  await ios(true); await click('dbSaveSt'); await p.waitForTimeout(300); const d1=await ask(); const d1h=await p.evaluate(()=>{ const w=document.getElementById('dbAsk'); return w?w.querySelector('.askB').textContent:''; }); await press('やめる'); await p.waitForTimeout(200); const s2=await st();
  await click('dbSaveSt'); await p.waitForTimeout(300); const d1b=await ask(); await press('保存する'); await p.waitForTimeout(500); const ts=await toastT(), lib=await libOn(); const seen=await p.evaluate(()=>{ const t=document.getElementById('toast'), v=document.getElementById('dbv'); const c=document.querySelector('#dbLibList .libCard.saved .svd'); return {front:+getComputedStyle(t).zIndex>+getComputedStyle(v).zIndex, badge:!!c&&c.getBoundingClientRect().height>0}; }); await ios(false);   /* ★§695 お知らせが台帳の後ろに隠れていた */
  await reopen(); const s3=await st(), t5=await tiles();
  ok(nm+' ⑤ 保存する→「この内容で保存しますか？」（現場名・写真の枚数）・やめる→保存待ちのまま・保存する→「保存しました」→作成済みの一覧へ', !!d1&&/この内容で保存しますか/.test(d1.t)&&d1h.includes(SITE)&&/写真\s*2枚/.test(d1h)&&d1.b.some(x=>/保存する/.test(x))&&d1.b.some(x=>/やめる/.test(x))&&s2.st==='dirty'&&!!d1b&&/保存しました/.test(ts)&&seen.front&&seen.badge&&lib&&s3.st!=='dirty'&&!s3.n&&t5[0]==='屋上/', {d1,d1h:d1h.slice(0,80),s2,ts,seen,lib,s3,t5});
  /* ⑤b 何も変えていなくても「この内容で保存しますか？」が出る（「保存されていない変更はありません」は出さない） */
  await click('dbSaveSt'); await p.waitForTimeout(300); const d0=await ask(); await press('やめる'); await p.waitForTimeout(200);
  ok(nm+' ⑤b 変えていなくても「この内容で保存しますか？」', !!d0&&/この内容で保存しますか/.test(d0.t), d0);
  await p.locator('#dbGrid .tile .work').first().click(); await p.keyboard.type('施工前');
  await ios(true); await click('dbBack'); await p.waitForTimeout(300); const d2=await ask(); await press('保存して戻る'); await p.waitForTimeout(400); await ios(false); await reopen();
  await p.locator('#dbGrid .tile canvas').nth(1).click(); await p.waitForTimeout(500);
  await p.locator('#dbVWork').click(); await p.keyboard.type('高圧洗浄'); await ios(true); await click('dbViewX'); await p.waitForTimeout(200); await click('dbBack'); await p.waitForTimeout(300); const d2b=await ask(); await press('保存して戻る'); await p.waitForTimeout(400); await ios(false); await reopen();
  const t1=await tiles();
  ok(nm+' ① 欄にいたまま「戻る」→「保存されていない変更」→ 保存して戻る → 残る（拡大画面の分も）', !!d2&&/保存されていない/.test(d2.t)&&d2.b.some(x=>/保存しないで戻る/.test(x))&&!!d2b&&t1[0]==='屋上/施工前'&&t1[1]==='/高圧洗浄', {d2,t1});
  await p.locator('#dbGrid .tile .part').nth(1).click(); await p.keyboard.type('廊下');
  await ios(true); await click('dbBack'); await p.waitForTimeout(300); const d3=await ask(); await press('保存しないで戻る'); await p.waitForTimeout(300); await ios(false); await reopen();
  const t6=await tiles();
  ok(nm+' ⑥ 「保存しないで戻る」→ 入力前に戻る', !!d3&&t6[1]==='/高圧洗浄', {d3:!!d3,t6});
  await p.locator('#dbGrid .tile .part').nth(1).click(); await p.keyboard.type('階段'); await p.waitForTimeout(1500);
  await p.reload(); await p.waitForTimeout(900); await open(); const t2=await tiles();
  ok(nm+' ④ 同意なしに書かない（保存していない「階段」は読み込み直すと無い）', t2[1]==='/高圧洗浄', t2);
  ok(nm+' ② 保存した分は読み込み直しても残る', t2[0]==='屋上/施工前', t2);
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
