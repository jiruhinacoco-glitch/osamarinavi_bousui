/* ★§700 写真台帳を新しく作る流れ（本人「操作がわかりにくい。現場登録して完了 → 黒板設定が出て黒板の有無を確認 → 完了したら撮影や写真追加」）＋一覧。スマホ縦で：
   ① 新しく作る直後：「現場登録を完了」がある・黒板設定の枠は出ない・保存ボタンも出ない
   ② 完了前に「撮影」「＋写真追加」を押してもカメラ／写真の選択は開かない（「先に現場登録を完了」）
   ③ 現場名が空のうちは完了ボタンが灰色で押せない → 1文字入れると緑で押せる（§701）
   ④ 現場名を入れて完了 → 黒板設定の枠が出て「黒板を写真に入れますか？ あり／なし」・一覧にも登録される
   ⑤ 「なし」→ 黒板が「なし」・質問は消える
   ⑥ 完了後は「＋写真追加」で写真の選択が開く
   ⑦ 一覧のカードに「保存しました」の札は出ない・▲▼なし（§701 長押しで並べ替え）・写真は大きく（幅110px以上）・新しく作るボタンの説明文なし
   ⑧ pageerror 0
   直す前の版では ①②④⑤⑦ が★NG。  使い方: node _check/daicho_shinki.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(900);
  await p.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=120;c.height=90; c.getContext('2d').fillRect(0,0,120,90); const m=await nnPhotos.load('nn_daicho_v1'); const v={raw:1,d:c.toDataURL('image/jpeg'),t:Date.now()-5000,site:'既存の現場',kind:'防水工事',date:'2026-10-16',era:'wareki',part:'',work:'',w:120,h:90}; await nnPhotos.put('nn_daicho_v1','e1',v); if(m) m.e1=v;
    window.__in=[]; const o=HTMLInputElement.prototype.click; HTMLInputElement.prototype.click=function(){ if(this.type==='file'){ window.__in.push(this.id); return; } return o.call(this); }; });
  const vis=s=>p.evaluate(s=>{ const e=document.querySelector(s); return !!e&&e.getBoundingClientRect().height>0&&getComputedStyle(e).display!=='none'; },s);
  const ask=()=>p.evaluate(()=>{ const w=document.getElementById('dbAsk'); return w&&w.getBoundingClientRect().height>0?w.querySelector('.askT').textContent:''; });
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(800);
  // ⑦ 一覧
  const g7=await p.evaluate(()=>{ const c=document.querySelector('#dbLibList .libCard'); if(!c) return null; const th=c.querySelector('.lth'); return {svd:!!c.querySelector('.svd'), mv:!!c.querySelector('.lmv,.lup,.ldn'), th:th?Math.round(th.getBoundingClientRect().width):0, sub:(document.querySelector('#dbLibNew small')||{}).textContent||''}; });
  await p.locator('#dbLibNew').click(); await p.waitForTimeout(600); await p.evaluate(()=>document.activeElement&&document.activeElement.blur());
  const g1={done:await vis('#dbRegDone'), board:await vis('#dbBoardCard'), save:await vis('#dbSaveSt')};
  ok('① 新しく作る直後：「現場登録を完了」あり・黒板設定と保存ボタンは出ない', g1.done&&!g1.board&&!g1.save, g1);
  await p.evaluate(()=>{ document.getElementById('dbShootH').click(); document.getElementById('dbPickH').click(); }); await p.waitForTimeout(200);
  const g2=await p.evaluate(()=>window.__in.slice());
  ok('② 完了前は撮影・写真追加を押してもカメラ／写真の選択は開かない', g2.length===0&&await vis('#dbRegDone'), g2);
  /* ★§701 現場名が空のうちは灰色で押せない → 1文字入れると緑で押せる（本人「最初からオレンジはおかしい。緑では？」） */
  const b3=await p.evaluate(()=>{ const b=document.getElementById('dbRegDone'); return {dis:b.disabled, bg:getComputedStyle(b).backgroundImage}; });
  await p.fill('#dbSite','新'); await p.waitForTimeout(100); const b3b=await p.evaluate(()=>{ const b=document.getElementById('dbRegDone'); return {dis:b.disabled, bg:getComputedStyle(b).backgroundImage}; });
  ok('③ 現場名が空のうちは完了ボタンが押せない（灰色）→ 1文字入れると緑で押せる', b3.dis&&!/gradient/.test(b3.bg)&&!b3b.dis&&/28, 107, 60|60, 181, 106/.test(b3b.bg), {b3,b3b});
  await p.fill('#dbSite','新しい現場'); if(await vis('#dbRegDone')) await p.locator('#dbRegDone').click(); await p.waitForTimeout(600);
  const g4={board:await vis('#dbBoardCard'), ask:await vis('#dbBoardAsk'), q:await p.evaluate(()=>{ const e=document.getElementById('dbBoardAsk'); return e?e.textContent:''; }), done:await vis('#dbRegDone'), books:await p.evaluate(()=>JSON.parse(localStorage.getItem('nn_daicho_pref_v1')||'{}').books||{})};
  ok('④ 完了 → 黒板設定と「黒板を写真に入れますか？ あり／なし」・一覧にも登録', g4.board&&g4.ask&&/黒板を写真に入れますか/.test(g4.q)&&!g4.done&&!!g4.books['新しい現場'], g4);
  if(g4.ask) await p.evaluate(()=>[...document.querySelectorAll('#dbBoardAsk button')].find(x=>x.textContent==='なし').click()); await p.waitForTimeout(300);
  const g5={on:await p.evaluate(()=>document.getElementById('dbBoardOn').value), ask:await vis('#dbBoardAsk')};
  ok('⑤ 「なし」→ 黒板なし・質問は消える', g5.on==='off'&&!g5.ask, g5);
  await p.evaluate(()=>{ window.__in=[]; document.getElementById('dbPickH').click(); }); await p.waitForTimeout(200);
  const g6=await p.evaluate(()=>window.__in.slice());
  ok('⑥ 完了後は「＋写真追加」で写真の選択が開く', g6.includes('dbPickIn'), g6);
  ok('⑦ 一覧：「保存しました」の札なし・▲▼なし（§701 長押し）・写真は幅110px以上・「現場名を入れて、写真を追加します」なし', !!g7&&!g7.svd&&!g7.mv&&g7.th>=110&&!g7.sub, g7);
  ok('⑧ pageerror 0', errs.length===0, errs);
  await ctx.close();
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
