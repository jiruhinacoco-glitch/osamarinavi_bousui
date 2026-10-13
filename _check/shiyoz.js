/* ★2026-10-13z 仕様・材料（shiyo_toroku.html）本人の指摘（§666）：
   ① 3D の「保護コンクリートの端…つまんで横へ引くと伸び縮みします」の案内は出さない（A-1 の全体で .s3note が空）
   ② スマホ：検索欄と「表示 ◯件」が1行（同じ高さ・件数が画面からはみ出さない）
   ③ 詳細の右上の工法の絵を押すと大きく表示（#nnZoom）・押すと閉じる
   ④ スマホ：「全体 ◯工程・㎡あたり概算材料費・注記」は工程の表より下（いちばん下の箱 #stsum）。絵の下の欄（#stinfo）は「全体」では出さない。
      工程を選ぶと絵の下の欄にその工程の説明が出る
   ⑤ pageerror 0
   直す前の版では ①〜④ が★NG。
   使い方: node _check/shiyoz.js [shiyo_toroku.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'shiyo_toroku.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,300):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(2500);
  /* ② */
  const t2=await p.evaluate(()=>{ const s=document.querySelector('.toolbar .search').getBoundingClientRect(), c=document.getElementById('nnCountSlot'); if(!c) return {c:false}; const r=c.getBoundingClientRect(); return {sMid:Math.round(s.top+s.height/2), cMid:Math.round(r.top+r.height/2), cR:Math.round(r.right), cw:document.documentElement.clientWidth, txt:c.textContent}; });
  ok('② スマホ：検索欄と「表示◯件」が1行（縦の真ん中の差 6px 以内・画面の中）', t2.c!==false&&Math.abs(t2.sMid-t2.cMid)<=6&&t2.cR<=t2.cw&&/表示/.test(t2.txt), t2);
  /* A-1 を開く */
  await p.evaluate(()=>{ const el=[...document.querySelectorAll('#list *')].find(e=>e.children.length===0&&/^A-1$/.test(e.textContent.trim())); (el.closest('[onclick]')||el).click(); });
  try{ await p.waitForFunction(()=>document.querySelector('#detail .step-tbl'),null,{timeout:8000}); }catch(e){}
  await p.waitForTimeout(2500);
  /* ① */
  const t1=await p.evaluate(()=>{ const n=document.querySelector('.s3note'); return {has:!!n, txt:n?n.textContent:''}; });
  ok('① 3D の「つまんで横へ引くと伸び縮みします」の案内は出ない', t1.has&&!/伸び縮み/.test(t1.txt)&&!/伸び縮み/.test(await p.evaluate(()=>document.getElementById('detail').textContent)), t1);
  /* ④ */
  const t4=await p.evaluate(()=>{ const i=document.getElementById('stinfo'), sm=document.getElementById('stsum'), tb=document.querySelector('#detail .step-tbl');
    const iv=!!i&&getComputedStyle(i).display!=='none'&&i.getBoundingClientRect().height>0;
    return {infoShown:iv, sm:!!sm&&/全体/.test(sm.textContent)&&/工程/.test(sm.textContent), smTop:sm?Math.round(sm.getBoundingClientRect().top):-1, tblBottom:tb?Math.round(tb.getBoundingClientRect().bottom):-1}; });
  await p.evaluate(()=>window.nnStepSel&&nnStepSel(1)); await p.waitForTimeout(800);
  const t4b=await p.evaluate(()=>{ const i=document.getElementById('stinfo'); return {shown:!!i&&getComputedStyle(i).display!=='none', txt:i?i.textContent.slice(0,30):''}; });
  await p.evaluate(()=>window.nnStepSel&&nnStepSel(-1)); await p.waitForTimeout(500);
  ok('④ スマホ：「全体◯工程」は工程の表より下・絵の下の欄は「全体」で出ない・工程を選ぶと出る', !t4.infoShown&&t4.sm&&t4.smTop>=t4.tblBottom&&t4b.shown&&/工程/.test(t4b.txt), {t4,t4b});
  /* ③ */
  const t3=await p.evaluate(async()=>{ const k=document.querySelector('#detail .dkic'); if(!k) return {kic:false}; k.click(); await new Promise(r=>setTimeout(r,300)); const z=document.getElementById('nnZoom'), on=!!z&&z.classList.contains('on');
    const im=z&&z.querySelector('img'); const big=im?Math.round(im.getBoundingClientRect().width):0; if(z) z.click(); await new Promise(r=>setTimeout(r,100)); return {kic:true,on,big,closed:!!z&&!z.classList.contains('on'),small:Math.round(k.getBoundingClientRect().width)}; });
  ok('③ 右上の工法の絵を押すと大きく表示（小さい絵の3倍以上）・押すと閉じる', t3.kic&&t3.on&&t3.big>=t3.small*3&&t3.closed, t3);
  ok('⑤ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,200)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
