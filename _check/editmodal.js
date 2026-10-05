/* 現場記録帳「物件情報の編集」（スマホ表示モード）：①入力欄の高さが30px以下 ②見出しが1行（「完成予定」「請求日」は題名＋小さい説明）
   ③工法を選ぶ一覧の選択肢が右で切れない（長い名前は折り返す）④JSエラーなし。§598
   使い方: node _check/editmodal.js [ファイル]（直す前の版では ①②③ が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'kirokucho_demo.html'; let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)NG++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [w,h,n] of [[393,852,'393'],[360,780,'360']]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:3,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1800);
 await p.evaluate(()=>openModal(props[0].id)); await p.waitForTimeout(700);
 const r=await p.evaluate(()=>{
  const ids=['f_kb','f_cb','f_fb','f_fy','f_sk','f_sb','f_nb','f_sh','f_tan'];
  const hs=ids.map(id=>{const e=document.getElementById(id); return e&&e.offsetParent?Math.round(e.getBoundingClientRect().height):0;}).filter(Boolean);
  /* 見出しの行数：文字の高さの何倍か（1.6倍以上＝2行） */
  const multi=[...document.querySelectorAll('#modalbg .mgrid label')].filter(l=>l.offsetParent).filter(l=>{const fs=parseFloat(getComputedStyle(l).fontSize); return l.getBoundingClientRect().height>fs*1.9;}).map(l=>l.textContent.trim());
  const fy=document.querySelector('label.lsub small');
  return {maxH:Math.max(...hs), multi, split:!!fy};
 });
 ok(n+' ①入力欄の高さ30px以下', r.maxH<=30, r.maxH);
 ok(n+' ②見出しが全部1行', !r.multi.length, r.multi);
 ok(n+' ②「完成予定」は題名と説明に分かれている', r.split);
 /* ③ 屋根の工法の一覧を開く */
 const opened=await p.evaluate(()=>{const s=[...document.querySelectorAll('#modalbg select')].find(x=>x.offsetParent&&[...x.options].some(o=>/X-1/.test(o.text))); if(!s) return false; s.scrollIntoView({block:'center'}); window.nnSelOpen(s,s); return true;});
 await p.waitForTimeout(400);
 const c=await p.evaluate(()=>{const pop=document.getElementById('nnSelPop'); if(!pop||!pop.classList.contains('open')) return null; const P=pop.getBoundingClientRect(), vw=document.documentElement.clientWidth;
   const cut=[...pop.querySelectorAll('.o')].filter(o=>{const R=o.getBoundingClientRect(); const rg=document.createRange(); rg.selectNodeContents(o); const t=[...rg.getClientRects()]; return t.some(q=>q.right>P.right-2)||o.scrollWidth>o.clientWidth+1;}).map(o=>o.textContent.trim().slice(0,20));
   return {cut, inView:P.right<=vw+1&&P.left>=-1, n:pop.querySelectorAll('.o').length};});
 ok(n+' ③工法の一覧の文字が右で切れない', opened&&c&&!c.cut.length&&c.inView, c);
 ok(n+' ④JSエラーなし', !errs.length, errs.slice(0,2));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
