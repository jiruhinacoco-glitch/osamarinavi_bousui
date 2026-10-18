/* ★§732 写真台帳：文字の大きさをバーに・項目ごとの文字の大きさ・黒板の質問に「※ありの場合、黒板設定に進みます。」
   本人「文字の大きさが抽象的なので黒板サイズ同様バーで」「項目ごとに変更できないので個別で」「ボタンが列挙されるのはわかりづらい。シンプルに」
   ① 文字の大きさはバー（range）・横に % が出る
   ② 中身の欄をタップした行の下にだけバーが1本出る（「工事件名の文字」）・ほかの行をタップするとそちらへ移る（いつも1本）
   ③ 工事件名のバーを 150% にすると黒板の絵の工事件名だけ大きく・工事場所は変わらない・入力の黒板の字も大きく
   ④ 開き直しても残る ⑤ 黒板の外をタップするとバーが消える ⑥ 質問の画面に「※ありの場合、黒板設定に進みます。」・pageerror 0
   直す前の版では ①②③⑥ が★NG。  使い方: node _check/daicho_mojisize.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const A='文字の大きさ試験', B='場所の試験';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); if(!sessionStorage.getItem('ms_keep')){ localStorage.removeItem('nn_daicho_pref_v1'); sessionStorage.setItem('ms_keep','1'); } }catch(e){}
    window._ft=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t,x,y){ if(this.canvas.id==='dbCv1') window._ft.push({t:String(t),fs:parseFloat((/([\d.]+)px/.exec(this.font)||[])[1])||0}); return o.apply(this,arguments); }; });
  const open=async()=>{ await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200); await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); await p.evaluate(()=>window.nnDbReg&&nnDbReg()); await p.evaluate(()=>document.querySelector('#dbv .dbSide').classList.remove('closed')); };
  const draw=async()=>{ await p.evaluate(()=>{ window._ft=[]; document.getElementById('dbSize').dispatchEvent(new Event('input',{bubbles:true})); }); await p.waitForTimeout(700); return p.evaluate(()=>window._ft.slice()); };
  const fsOf=(ft,t)=>{ const f=ft.find(x=>x.t===t); return f?f.fs:0; };
  const rowOf=t=>p.locator('#dbItemL .bir',{has:p.locator('.kbLt',{hasText:t})});
  await open();
  /* ⑥ 質問の画面 */
  const r6=await p.evaluate(()=>{ const a=document.getElementById('dbBoardAsk'); return a?a.textContent:''; });
  await p.fill('#dbSite',A); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(900);
  await p.evaluate(()=>{ const a=document.querySelector('#dbBoardAsk [data-b="on"]'); if(a&&a.offsetParent) a.click(); }); await p.waitForTimeout(400);
  /* ① */
  const r1=await p.evaluate(()=>{ const e=document.getElementById('dbFs'), v=document.getElementById('dbFsV'); return {type:e&&e.type, pct:v?v.textContent:''}; });
  ok('① 文字の大きさはバー・横に %', r1.type==='range'&&r1.pct==='100%', r1);
  await rowOf('工事場所').locator('.iv').fill(B); await rowOf('工事場所').locator('.iv').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(400);
  /* ② */
  await rowOf('工事件名').locator('.iv').tap(); await p.waitForTimeout(300);
  const bar1=await p.evaluate(()=>{ const b=document.querySelectorAll('#dbItemL .kbFsBar'); return {n:b.length, txt:b[0]?b[0].textContent:'', row:b[0]?b[0].closest('.bir').querySelector('.kbLt').textContent:''}; });
  await p.locator('.kbFsBar').screenshot({path:'/tmp/mojisize_bar.png'}).catch(()=>{});
  await rowOf('工事場所').locator('.iv').tap(); await p.waitForTimeout(300);
  const bar2=await p.evaluate(()=>{ const b=document.querySelectorAll('#dbItemL .kbFsBar'); return {n:b.length, row:b[0]?b[0].closest('.bir').querySelector('.kbLt').textContent:''}; });
  ok('② タップした行の下にだけバーが1本（工事件名の文字）・ほかの行をタップするとそちらへ', bar1.n===1&&bar1.row==='工事件名'&&/工事件名の文字/.test(bar1.txt)&&bar2.n===1&&bar2.row==='工事場所', {bar1,bar2});
  /* ③ */
  const ft0=await draw(); const ed0=await rowOf('工事件名').locator('.iv').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)).catch(()=>0);
  await rowOf('工事件名').locator('.iv').tap(); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const e=document.querySelector('#dbItemL .kbFsBar input'); if(!e) return; e.value='150'; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }); await p.waitForTimeout(300);
  const ed1=await rowOf('工事件名').locator('.iv').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)).catch(()=>0), ed1b=await rowOf('工事場所').locator('.iv').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)).catch(()=>0), ed0b=ed1b;
  const pct=await p.evaluate(()=>{ const b=document.querySelector('#dbItemL .kbFsBar b'); return b?b.textContent:''; });
  await p.locator('#dbItems').screenshot({path:'/tmp/mojisize_items.png'}).catch(()=>{});
  const ft1=await draw(); const r3={a0:fsOf(ft0,A),a1:fsOf(ft1,A),b0:fsOf(ft0,B),b1:fsOf(ft1,B),ed:[ed0,ed1],pct};
  ok('③ 工事件名だけ 150%：黒板の絵の工事件名だけ大きく・工事場所は同じ・入力の黒板の字も大きく', r3.a1>r3.a0*1.3&&r3.b1===r3.b0&&r3.b0>0&&ed1>ed0*1.3&&pct==='150%', r3);
  /* ⑤ */
  await p.locator('#dbCount').tap().catch(async()=>{ await p.mouse.click(5,5); }); await p.waitForTimeout(300);
  const n5=await p.locator('#dbItemL .kbFsBar').count();
  ok('⑤ 黒板の外をタップするとバーが消える', n5===0, n5);
  /* ④ */
  await open(); await p.fill('#dbSite',A); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(900);
  const ft4=await draw(); const r4={a:fsOf(ft4,A),b:fsOf(ft4,B)};
  ok('④ 開き直しても工事件名だけ大きいまま', r4.a===r3.a1&&r4.b===r3.b0, r4);
  ok('⑥ 質問の画面に「※ありの場合、黒板設定に進みます。」・pageerror 0', r6.includes('※ありの場合、黒板設定に進みます。')&&errs.length===0, {r6,errs});
 }catch(e){ console.log('★NG 例外 '+e.message); NG++; }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); process.exit(NG?1:0); })();
