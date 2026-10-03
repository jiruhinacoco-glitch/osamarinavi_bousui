/* 材料登録：材料の絵をタップすると大きく表示される（一覧の行の絵・詳細の上の絵）。§588
   ①一覧の絵をタップ→拡大が開く・絵が読み込まれる・題名が材料名 ②どこかを押すと閉じる ③詳細の上の絵でも開く
   ④「イラストを選ぶ」ボタンは今までどおり選ぶ小窓が開く（拡大は開かない） ⑤拡大が画面からはみ出さない ⑥JSエラーなし
   使い方: node _check/matzoom.js [ファイル]（直す前の版では ①③ が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zairyo_toroku.html'; let NG=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)NG++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [w,h,ph,n] of [[1400,900,0,'PC'],[393,852,1,'スマホ']]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
 const tap=async sel=>{ const el=await p.$(sel); if(!el) return false; await el.scrollIntoViewIfNeeded(); if(ph) await el.tap(); else await el.click(); await p.waitForTimeout(500); return true; };
 const Z=()=>p.evaluate(()=>{const z=document.getElementById('nnMiZoom'); if(!z) return null; const im=z.querySelector('img'), r=z.querySelector('.box').getBoundingClientRect(), vw=document.documentElement.clientWidth, vh=document.documentElement.clientHeight;
   return {title:z.querySelector('.hd span').textContent, w:im.naturalWidth, inView:r.left>=0&&r.right<=vw+1&&r.top>=0&&r.bottom<=vh+1};});
 /* ① 一覧の絵（絵が読み込まれた最初の行） */
 const nm=await p.evaluate(()=>{const im=[...document.querySelectorAll('.mrow .lic img')].find(i=>i.complete&&i.naturalWidth>0); if(!im) return null; im.setAttribute('data-t','1'); return im.closest('.mrow').querySelector('.nm').textContent.trim();});
 await tap('img[data-t="1"]'); let z=await Z();
 ok(!!z&&z.w>0&&z.title===nm, n+' ①一覧の絵をタップで拡大（題名＝材料名）', z&&{title:z.title,w:z.w,nm});
 ok(!!z&&z.inView, n+' ⑤拡大が画面に収まる', z&&z.inView);
 if(z){ if(ph) await p.touchscreen.tap(10,10); else await p.mouse.click(10,10); await p.waitForTimeout(300); }
 ok(!(await Z()), n+' ②押すと閉じる');
 /* ③ 詳細の上の絵（M001 プライマー） */
 await p.evaluate(()=>selectAndShow({type:'cat',id:'M001'})); await p.waitForTimeout(600);
 await tap('#d_illview .nnmi img'); z=await Z();
 ok(!!z&&z.w>0&&/プライマー/.test(z.title), n+' ③詳細の上の絵をタップで拡大', z);
 await p.evaluate(()=>{const x=document.getElementById('nnMiZoom'); x&&x.remove();});
 /* ④ イラストを選ぶボタン */
 const hasBtn=await p.$('#d_illbtn');
 if(hasBtn){ await tap('#d_illbtn .nnmi img'); const pk=await p.evaluate(()=>!!document.getElementById('nnMiPick')); z=await Z();
   ok(pk&&!z, n+' ④イラストを選ぶボタンは選ぶ小窓（拡大しない）', {pick:pk,zoom:!!z}); await p.evaluate(()=>{const x=document.getElementById('nnMiPick'); x&&x.remove();}); }
 else ok(true, n+' ④（この画面にイラストを選ぶボタンなし）');
 ok(!errs.length, n+' ⑥JSエラーなし', errs.slice(0,2));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
