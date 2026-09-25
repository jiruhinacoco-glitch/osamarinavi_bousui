/* 2026-09-25b スマホ：新規物件登録（最初は必要な項目だけ・「▼詳細入力」で開く・日付欄が重ならない・選択欄は自前の一覧） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for(const mode of ['mobile','ichiran']){
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
 await ctx.addInitScript(m=>{try{localStorage.setItem('nn_view_mode',m)}catch(e){}},mode);
 const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
 await pg.evaluate(()=>openModal()); await pg.waitForTimeout(400);
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x):''));
 let q=await pg.evaluate(()=>({adv:document.getElementById('f_advBtn').textContent,advVis:!!document.getElementById('f_kb').offsetParent}));
 ok(/詳細入力/.test(q.adv)&&!/くわしく/.test(q.adv),'畳むボタンの名前は「詳細入力」',q);
 ok(!q.advVis,'新規ではくわしい項目は畳まれている',q);
 const t0=Date.now();
 await pg.tap('#f_st'); 
 q=await pg.evaluate(()=>({open:document.getElementById('nnSelPop').classList.contains('open'),n:document.querySelectorAll('#nnSelPop .o').length}));
 ok(q.open&&q.n===6,'押すとすぐ一覧が出る（'+(Date.now()-t0)+'ms）',q);
 await pg.tap('#nnSelPop .o:nth-child(5)');
 q=await pg.evaluate(()=>({v:document.getElementById('f_st').value,open:document.getElementById('nnSelPop').classList.contains('open')}));
 ok(q.v==='施工中'&&!q.open,'選ぶと値が入り一覧が閉じる',q);
 await pg.tap('#f_advBtn'); await pg.waitForTimeout(500);
 q=await pg.evaluate(()=>{const r=i=>document.getElementById(i).getBoundingClientRect();return {kb:[r('f_kb').left,r('f_kb').right],cb:[r('f_cb').left,r('f_cb').right],fb:r('f_fb').right,fy:r('f_fy').left,vis:!!document.getElementById('f_kb').offsetParent,jisseki:!!document.getElementById('f_a0').offsetParent}});
 ok(q.vis&&q.kb[1]<=q.cb[0]&&q.fb<=q.fy,'開くと日付欄が出て、左右が重ならない',q);
 ok(!q.jisseki,'新規では実績の欄は出ない',q);
 await pg.evaluate(()=>{closeModal(); openModal(props[0].id);}); await pg.waitForTimeout(400);
 q=await pg.evaluate(()=>({vis:!!document.getElementById('f_kb').offsetParent,j:!!document.getElementById('f_a0').offsetParent}));
 ok(q.vis&&q.j,'編集では全項目が出る',q);
 ok(errs.length===0,'JSエラーなし',errs);
 }
 await b.close();
})();
