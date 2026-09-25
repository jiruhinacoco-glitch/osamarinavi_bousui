/* 2026-09-25p 新規物件登録（本人の指摘）：
   ・改修は屋根ごとに「既存防水の扱い」（かぶせ／部分撤去／全面撤去）→ 保存（p.areas[].tk・p.tekkyo）。新築では出さない
   ・平場は「新規防水（平場・標準）」そのもの＝平場に工法ボタンは出さない（どっちの工法？をなくす）
   ・「別工法：…」の行は出さない
   ・仕様・材料のマイ仕様で選んだ「工法の絵」が、新規物件登録の工法の欄に出る */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,240):''));
 const ctx=await b.newContext({viewport:{width:1600,height:900},serviceWorkers:'block'});
 const errs=[];
 // 仕様・材料：マイ仕様を1件作って絵を選ぶ
 let pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8899/shiyo_toroku.html',{waitUntil:'load'}); await pg.waitForTimeout(1000);
 await pg.evaluate(()=>{localStorage.setItem('nn_specs_v1',JSON.stringify({v:1,items:[{id:'sp1',presetId:null,code:'自社仕様',name:'改修ウレタン自社標準',cat:'塗膜防水',sub:'自社仕様',ap:'',src:'',steps:[{no:'1',w:'',matId:null,matName:'',srcP:'',u:null,coef:null}]}]}));});
 await pg.reload(); await pg.waitForTimeout(1000);
 await pg.evaluate(()=>{ sel={type:'mine',id:'sp1'}; renderDetail(); });
 await pg.waitForTimeout(300);
 let q=await pg.evaluate(()=>document.querySelectorAll('#detail .spic').length);
 ok(q>=10,'仕様・材料：マイ仕様に「工法の絵」の選択（なし＋絵）',q);
 await pg.evaluate(()=>[...document.querySelectorAll('#detail .spic')].find(b=>/ウレタン密着/.test(b.textContent)).click()); await pg.waitForTimeout(200);
 q=await pg.evaluate(()=>JSON.parse(localStorage.getItem('nn_specs_v1')).items[0].icon);
 ok(/kou_ure_micchaku/.test(q||''),'選んだ絵がマイ仕様に保存される',q);
 await pg.close();
 // 現場記録帳
 pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo')+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
 await pg.evaluate(()=>openModal()); await pg.waitForTimeout(300);
 q=await pg.evaluate(()=>{const rf=document.querySelector('#f_kouji .rf');const arr=[...rf.querySelectorAll('.arr')];
   return {tk:[...rf.querySelectorAll('.tkseg button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')),hiraKob:(()=>{ const k=arr[0].querySelector('.kob'); k.click(); const pop=document.getElementById('nnSelPop'); const open=!!(pop&&pop.offsetParent); if(window.nnSelClose) nnSelClose(); return k.classList.contains('std')&&!open?'std':'picker'; })(),alt:!!rf.querySelector('.rfalt')};});
 ok(q.tk.join()==='かぶせ*,部分撤去,全面撤去'&&q.hiraKob==='std'&&!q.alt,'改修：既存防水の扱い（はじめはかぶせ）・平場は工法を選べない（新規防水と同じ絵を出すだけ・§511）・別工法の行なし',q);
 await pg.fill('#f_name','テスト撤去物件');
 await pg.evaluate(()=>{const rf=document.querySelector('#f_kouji .rf');rf.querySelectorAll('.tkseg button')[2].click();const i=rf.querySelectorAll('.arr input');i[0].value=100;i[0].dispatchEvent(new Event('input',{bubbles:true}));
   const k=rf.querySelector('.rfk');k.value='改修ウレタン自社標準';k.dispatchEvent(new Event('change',{bubbles:true}));});
 await pg.waitForTimeout(500);
 q=await pg.evaluate(()=>{const im=document.querySelector('#f_kouji .rfk').parentNode.querySelector('img');return {src:im.getAttribute('src'),w:im.naturalWidth};});
 ok(/ure_micchaku/.test(q.src||'')&&q.w>0,'マイ仕様を選ぶと、登録した絵が工法の欄に出る',q);
 await pg.evaluate(()=>saveProperty()); await pg.waitForTimeout(300);
 q=await pg.evaluate(()=>{const p=props.find(x=>x.name==='テスト撤去物件');return p&&{tk:p.areas[0].tk,tekkyo:p.tekkyo};});
 ok(q&&q.tk==='全面撤去'&&q.tekkyo==='全面撤去','撤去の選択が保存される',q);
 await pg.evaluate(()=>{openModal();[...document.querySelectorAll('#f_kouji .kseg button')].find(b=>b.textContent==='新築').click();});
 q=await pg.evaluate(()=>!!document.querySelector('#f_kouji .tkseg').offsetParent);
 ok(!q,'新築では既存防水の扱いを出さない',q);
 ok(errs.length===0,'JSエラーなし',errs);
 await b.close();
})();
