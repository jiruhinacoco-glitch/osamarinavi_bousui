/* ★§707 写真台帳（スマホ縦）：本人の付箋
   ① 項目名をえらぶ札は、タップした見出しのすぐ下に、見出しと同じくらいの幅（±30px）で縦に並ぶ
   ② ほかの行で使っている項目名は札に出さない（施工者の行：工事件名・工事場所・施工者は出ない → 日付・工種）・「▼自由入力」の欄
   ③ 札の外をタップすると閉じる
   ④ 「黒板の文字をタップして…」の説明は出さない
   ⑤ 上の帯の「撮影」はオレンジではなく「写真追加」と同じ色
   ⑥ pageerror 0
   直す前の版では ①②④⑤ が★NG。  使い方: node _check/daicho_ilpop.js [camera.html の代わり] [画面写しの保存先] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html', SHOT=process.argv[3]||'';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); });
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>localStorage.removeItem('nn_daicho_pref_v1')); await p.reload(); await p.waitForTimeout(1000);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); await p.evaluate(()=>window.nnDbReg&&nnDbReg());
  await p.fill('#dbSite','まる'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(800);
  const hint=await p.evaluate(()=>[...document.querySelectorAll('#dbv *')].some(e=>e.children.length===0&&/黒板の文字をタップ/.test(e.textContent)&&e.getBoundingClientRect().height>0));
  const col=await p.evaluate(()=>{ const a=document.getElementById('dbShootH'), b=document.getElementById('dbPickH'); return {a:getComputedStyle(a).backgroundImage, b:getComputedStyle(b).backgroundImage}; });
  const row=p.locator('#dbItemL .bir',{has:p.locator('.kbLt',{hasText:'施工者'})}).last();
  await row.locator('.kbL').scrollIntoViewIfNeeded(); await row.locator('.kbL').click(); await p.waitForTimeout(300);
  const g=await p.evaluate(()=>{ const pp=document.querySelector('#dbItemL .ilpop'); if(!pp) return null; const L=pp.closest('.bir').querySelector('.kbL').getBoundingClientRect(), r=pp.getBoundingClientRect();
    const os=[...pp.querySelectorAll('.ilo')], rs=os.map(o=>o.getBoundingClientRect());
    return {gap:Math.round(r.top-L.bottom), dl:Math.round(r.left-L.left), dw:Math.round(r.width-L.width), menu:os.map(o=>o.textContent), vert:rs.every((x,i)=>!i||x.top>=rs[i-1].bottom-1), free:(pp.querySelector('.ilf span')||{}).textContent||'', il:!!pp.querySelector('.il')}; });
  if(SHOT) await p.screenshot({path:SHOT});
  ok('① 札は見出しのすぐ下・見出しと同じくらいの幅・縦に並ぶ', !!g&&Math.abs(g.gap)<=4&&Math.abs(g.dl)<=4&&Math.abs(g.dw)<=30&&g.vert, g);
  ok('② 使っている項目は出さない（日付・工種だけ）・▼自由入力', !!g&&g.menu.join()==='日付,工種'&&/自由入力/.test(g.free)&&g.il, g&&{menu:g.menu,free:g.free});
  await p.mouse.click(200,120); await p.waitForTimeout(300); const cl=await p.evaluate(()=>!document.querySelector('#dbItemL .ilpop'));
  ok('③ 札の外をタップすると閉じる', cl);
  ok('④ 「黒板の文字をタップして…」の説明は出さない', !hint);
  ok('⑤ 「撮影」は「写真追加」と同じ色（オレンジでない）', col.a===col.b&&!/224, 120, 0|255, 181, 77/.test(col.a), col);
  ok('⑥ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
