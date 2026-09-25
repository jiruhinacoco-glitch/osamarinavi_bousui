/* 2026-09-25f 現場記録帳（スマホ表示）の詰め：
   ①ダッシュボードの検索枠 130px以下（本人の見本は約123pt）
   ②現場一覧の上の帯 80px以下・カード/表一覧/Excelのボタンは高さ26px以下・検索28px
   ③施工中：「施工中◯件」「赤＝自社」を出さない・左の列120px以下・日付は1行（開始〜終了）・1日の幅24px以下・開いたとき横棒が見えている */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,220):''));
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo')+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1500);
 let q=await pg.evaluate(()=>Math.round(document.querySelector('#dashboard .stbar').getBoundingClientRect().height));
 ok(q<=130,'①ダッシュボードの検索枠 130px以下',q);
 await pg.evaluate(()=>showView('list')); await pg.waitForTimeout(800);
 q=await pg.evaluate(()=>({bar:Math.round(document.getElementById('toolbar').getBoundingClientRect().height),btn:Math.max(...[...document.querySelectorAll('#nnRecordModes button')].map(b=>Math.round(b.getBoundingClientRect().height))),q:Math.round(document.getElementById('q').getBoundingClientRect().height)}));
 ok(q.bar<=80&&q.btn<=26&&q.q<=30,'②現場一覧の上の帯・表示切替ボタン・検索を小さく',q);
 await pg.evaluate(()=>{[...document.querySelectorAll('#viewtabs button')].find(x=>/施工中\(全\)/.test(x.textContent)).click();}); await pg.waitForTimeout(1000);
 q=await pg.evaluate(()=>{const v=document.getElementById('schedview');const vis=e=>!!e&&e.getBoundingClientRect().height>0;
   const w=v.querySelector('.gwrap.sched'),gn=w.querySelector('td.gname'),gd=w.querySelector('td.gd'),wr=w.getBoundingClientRect();
   const fills=[...w.querySelectorAll('td.gd.fill')].filter(c=>{const r=c.getBoundingClientRect();return r.left>=wr.left+gn.offsetWidth-1&&r.right<=wr.right+1;}).length;
   return {cnt:vis(v.querySelector('.schcnt')),red:vis(v.querySelector('.schbar .rowlbl-red')),gn:Math.round(gn.getBoundingClientRect().width),rng:(gn.querySelector('.gr-rng')||{}).textContent,
     dateVisible:[...gn.querySelectorAll('input[type=date]')].some(i=>getComputedStyle(i).opacity>0.5),day:Math.round(gd.getBoundingClientRect().width),fills};});
 ok(!q.cnt&&!q.red,'③「施工中◯件」「赤＝自社」を出さない',q);
 ok(q.gn<=120&&/^\d+\/\d+〜\d+\/\d+$/.test(q.rng||'')&&!q.dateVisible,'③左の列は細く、日付は「開始〜終了」の1行',q);
 ok(q.day<=24&&q.fills>=5,'③1日の幅24px以下・開いたとき横棒が見えている',q);
 ok(errs.length===0,'JSエラーなし',errs);
 await b.close();
})();
