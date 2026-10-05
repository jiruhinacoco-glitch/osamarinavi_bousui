/* 現場記録帳ダッシュボード：スマホは「請求し忘れ」と各枠を閉じて始め、見出しを押すと開く（もう一度押すと閉じる）。PCは今までどおり開いて始める。§600
   使い方: node _check/dashfold.js [ファイル]（直す前の版では スマホの①②が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'kirokucho_demo.html'; let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)NG++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [n,vp,ph,mode] of [['スマホ表示',{width:393,height:852},1,'mobile'],['スマホ一覧',{width:393,height:852},1,'ichiran'],['PC',{width:1440,height:900},0,'']]){
 const p=await b.newPage({viewport:vp,deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 if(mode) await p.addInitScript(m=>{try{localStorage.setItem('nn_view_mode',m)}catch(e){}},mode);
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1800);
 const st=()=>p.evaluate(()=>{const sk=document.getElementById('nnSkPanel'); const ps=[...document.querySelectorAll('#dashboard .dpanel')].filter(x=>x.offsetParent);
   /* 開いているか＝表・中身が見えているか（自分で高さを測る） */
   const skBody=sk&&sk.querySelector('table'); const skOpen=!!(skBody&&skBody.getBoundingClientRect().height>0);
   const open=ps.filter(x=>{const bd=x.querySelector('.nn-panel-body'); return bd&&bd.getBoundingClientRect().height>0;}).length;
   return {skOpen, open, n:ps.length, h:document.getElementById('dashboard').scrollHeight};});
 let s=await st();
 if(ph){
  ok(n+' ①請求し忘れは閉じて始まる（見出しは見える）', !s.skOpen && !!(await p.$('#nnSkPanel .skh')), s);
  ok(n+' ②枠は全部閉じて始まる', s.open===0 && s.n>=8, s);
  await p.tap('#nnSkPanel .skh'); await p.waitForTimeout(200); s=await st(); ok(n+' ③請求し忘れの見出しを押すと開く', s.skOpen, s.skOpen);
  await p.tap('#nnSkPanel .skh'); await p.waitForTimeout(200); s=await st(); ok(n+' ③もう一度押すと閉じる', !s.skOpen, s.skOpen);
  const h=await p.$('#dashboard .dpanel h4 .httl'); await h.scrollIntoViewIfNeeded(); await h.tap(); await p.waitForTimeout(300); s=await st();
  ok(n+' ④枠の見出しを押すとその枠だけ開く', s.open===1, s.open);
 } else {
  ok(n+' ①②PCは請求し忘れも枠も開いて始まる（今までどおり）', s.skOpen && s.open===s.n, s);
 }
 ok(n+' ⑤JSエラーなし', !errs.length, errs.slice(0,2));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
