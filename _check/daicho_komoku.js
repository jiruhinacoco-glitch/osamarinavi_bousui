/* ★§702/§703 写真台帳：黒板の項目を「黒板そのもの」に入力する
   本人「項目選択や入力画面自体を黒板にして。黒板自体に入力や選択するUIに」「発注者・元請・工期・監理者のタグは不要」「文字サイズを任意で選べるように」
   ① 項目の欄が黒板（黒板の色・白い線）で最初から開いている・上の段（工事件名・工事場所）→ 真ん中（部位・作業内容）→ 下の段（施工者）の並び
   ② 見出しをタップ → 項目名の札（工事件名・工事場所・日付・工種・施工者 の5つだけ）・自分で書く欄
   ③ 札で「日付」を選ぶと中身は自動で撮影日（「自動」の札）・黒板の絵にも撮影日
   ④ 工事件名の中身（自動＝現場名）に書くとその文字が黒板の絵に・消すと現場名に戻る
   ⑤ 札の「自分で書く」に「工種」と打つと中身は自動で工種
   ⑥ 「＋ 項目を足す」（真ん中の下）で下の段に足せる
   ⑦ 文字の大きさ：小さめ＜ふつう＜大きめ＜特大（黒板の絵の現場名）・入力の黒板の文字も大きくなる・開き直しても残る
   ⑧ 色を「白地・黒文字」にすると入力の黒板も白・部品がはみ出さない・pageerror 0
   直す前の版（§702）では ①②⑥⑧ が★NG。  使い方: node _check/daicho_komoku.js [camera.html の代わり] */
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
  const rowOf=t=>p.locator('#dbItemL .bir',{has:p.locator('.kbLt',{hasText:t})});
  await open(); await setSite(A);
  /* ① */
  const r1=await p.evaluate(()=>{ const L=document.getElementById('dbItemL'), it=document.getElementById('dbItems'); if(!L) return {}; const bg=getComputedStyle(L).backgroundColor, vis=L.getBoundingClientRect().height>0&&!it.classList.contains('shut');
    const seq=[...L.querySelectorAll('.bir .kbLt,.kbMid b')].map(e=>e.textContent); return {bg,vis,seq:seq.join(','),kbL:L.querySelectorAll('.bir .kbL').length}; });
  ok('① 項目の欄が黒板の色で最初から開いている・上の段→部位→下の段（施工者）の並び', r1.vis&&r1.bg==='rgb(29, 106, 58)'&&r1.seq==='工事件名,工事場所,部位,施工者'&&r1.kbL===3, r1);
  /* ② */
  let menu=[], free=false;
  if(await rowOf('工事場所').locator('.kbL').count()){ await rowOf('工事場所').locator('.kbL').click(); await p.waitForTimeout(200); menu=await p.evaluate(()=>[...document.querySelectorAll('#dbItemL .ilpop .ilo')].map(e=>e.textContent)); free=await p.locator('#dbItemL .ilpop .il').count()===1; }
  ok('② 見出しをタップで項目名の札（★§707 ほかの行で使っている工事件名・工事場所・施工者は出さない＝日付・工種だけ）・自由入力の欄', menu.join()==='日付,工種'&&free, {menu,free});
  /* ③ */
  let r3={};
  if(menu.length){ await p.locator('#dbItemL .ilpop .ilo',{hasText:'日付'}).click(); await p.waitForTimeout(300); const ft=await draw();
    r3=await rowOf('日付').evaluate(d=>({v:d.querySelector('.iv').value,auto:d.classList.contains('auto'),pop:!!document.querySelector('#dbItemL .ilpop')})); r3.date=await p.inputValue('#dbDate'); r3.board=ft.some(f=>f.t===r3.v); }
  ok('③ 「日付」を選ぶと中身は自動で撮影日（自動の札）・黒板の絵にも・札は閉じる', !!r3.v&&r3.v.includes(String(+(r3.date||'').slice(5,7))+'月')&&r3.auto&&r3.board&&!r3.pop, r3);
  /* ④ */
  const iv0=rowOf('工事件名').locator('.iv'); let r4={};
  if(await iv0.count()){ r4.a0=await iv0.inputValue(); r4.auto0=await rowOf('工事件名').evaluate(d=>d.classList.contains('auto')); await iv0.fill('〇〇ビル屋上改修'); await p.evaluate(()=>document.activeElement.blur()); let ft=await draw(); r4.w=ft.some(f=>f.t==='〇〇ビル屋上改修');
    await iv0.fill(''); await iv0.dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); ft=await draw(); r4.back=ft.some(f=>f.t===A); r4.bv=await iv0.inputValue(); r4.auto1=await rowOf('工事件名').evaluate(d=>d.classList.contains('auto')); }
  ok('④ 工事件名は自動で現場名・書くと黒板の絵に・消すと現場名に戻る', r4.a0===A&&r4.auto0&&r4.w&&r4.back&&r4.bv===A&&r4.auto1, r4);
  /* ⑤ 施工者の見出し → 自分で書く「工種」 */
  let r5={};
  if(await rowOf('施工者').locator('.kbL').count()){ await rowOf('施工者').locator('.kbL').click(); await p.waitForTimeout(200); await p.locator('#dbItemL .ilpop .il').fill('工種'); await p.waitForTimeout(300);
    r5=await p.evaluate(()=>{ const d=document.querySelector('#dbItemL .ilpop').closest('.bir'); return {lab:d.querySelector('.kbLt').textContent,v:d.querySelector('.iv').value,auto:d.classList.contains('auto')}; });
    await p.mouse.click(5,400); await p.waitForTimeout(200); await rowOf('工種').locator('.kbL').click(); await p.waitForTimeout(200);   /* ★§707 札は開いたときの項目で作る → 閉じて開き直すと「施工者」が出る */
    await p.locator('#dbItemL .ilpop .ilo',{hasText:'施工者'}).click(); await p.waitForTimeout(300); }
  ok('⑤ 「自分で書く」に「工種」と打つと見出しも変わり中身は自動で工種', r5.lab==='工種'&&r5.v==='防水工事'&&r5.auto, r5);
  /* ⑥ */
  let r6={}; const addB=p.locator('#dbItemL .kbAdd[data-p="b"]');
  if(await addB.count()){ await addB.click(); await p.waitForTimeout(250); await p.locator('#dbItemL .ilpop .ilo',{hasText:'工事場所'}).click().catch(()=>{}); await p.waitForTimeout(250);
    r6=await p.evaluate(()=>({seq:[...document.querySelectorAll('#dbItemL .bir .kbLt,#dbItemL .kbMid b')].map(e=>e.textContent).join()})); const ft=await draw(); r6.n=ft.filter(f=>f.t==='所').length; }
  ok('⑥ 真ん中の下の「＋ 項目を足す」で下の段に足せる（黒板の絵にも2つめの工事場所）', r6.seq==='工事件名,日付,部位,施工者,工事場所'&&r6.n===1, r6);
  /* ⑦ 文字の大きさ */
  const has=await p.locator('#dbFs').count(); let r7={has};
  if(has){ const fsOf=async v=>{ await p.selectOption('#dbFs',v); await p.waitForTimeout(300); const ft=await draw(); const f=ft.find(x=>x.t===A); return f?f.fs:0; };
    r7.s=await fsOf('s'); r7.m=await fsOf('m'); const e1=await iv0.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)).catch(()=>0); r7.l=await fsOf('l'); r7.xl=await fsOf('xl'); const e2=await iv0.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)).catch(()=>0); r7.ed=[e1,e2];
    await p.selectOption('#dbFs','l'); await p.waitForTimeout(300); await open(); await p.waitForTimeout(300); r7.keep=await p.inputValue('#dbFs'); await setSite(A); }
  ok('⑦ 文字の大きさ 小さめ＜ふつう＜大きめ＜特大・入力の黒板の文字も大きく・開き直しても残る', has&&r7.s<r7.m&&r7.m<r7.l&&r7.l<r7.xl&&r7.ed[1]>r7.ed[0]&&r7.keep==='l', r7);
  /* ⑧ */
  await p.selectOption('#dbColor','white'); await p.waitForTimeout(300);
  const r8=await p.evaluate(()=>{ const L=document.getElementById('dbItemL'), box=document.getElementById('dbItems'), R=box.getBoundingClientRect(); return {bg:getComputedStyle(L).backgroundColor, iv:getComputedStyle(L.querySelector('.iv')||L).color, out:[...box.querySelectorAll('input,select,button')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&(r.left<R.left-1||r.right>R.right+1); }).map(e=>e.className||e.id)}; });
  await p.locator('#dbItems').scrollIntoViewIfNeeded(); await p.locator('#dbItems').screenshot({path:'/tmp/komoku.png'}).catch(()=>{}); await p.selectOption('#dbColor','green');
  ok('⑧ 色を白にすると入力の黒板も白地・黒文字・はみ出しなし・pageerror 0', r8.bg==='rgb(255, 255, 255)'&&r8.iv==='rgb(17, 17, 17)'&&r8.out.length===0&&errs.length===0, {r8,errs});
  await p.evaluate(()=>{ try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} });
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
