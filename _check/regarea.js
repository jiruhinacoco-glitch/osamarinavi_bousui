/* 2026-09-25i 保存の形を屋根ごと [{n,ko,items}] に更新。
   2026-09-25b 新規物件登録：面積を部位ごと（平場・立上り・屋根内周＋天端など）・合計が数量に入る・保存と編集で戻る */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,220):''));
 for(const phone of [true,false]){
 const ctx=await b.newContext(phone?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1600,height:900}});
 if(phone) await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
 const P=phone?'スマホ ':'PC ';
 await pg.evaluate(()=>openModal()); await pg.waitForTimeout(300);
 let q=await pg.evaluate(()=>[...document.querySelectorAll('#f_kouji .arr')].map(r=>r.dataset.k+(r.offsetParent?'':'(隠)')));
 ok(q.join()==='平場,立上り,屋根内周','既定は平場・立上り・屋根内周',q);
 await pg.fill('#f_name','テスト部位物件');
 const ins=await pg.$$('#f_kouji .arr input'); await ins[0].fill('300'); await ins[1].fill('45.5'); await ins[2].fill('120');
 q=await pg.evaluate(()=>({m:document.getElementById('f_m').value,ro:document.getElementById('f_m').readOnly,sum:document.querySelector('#f_kouji .arsum').textContent}));
 ok(q.m==='345.5'&&q.ro,P+'㎡の合計が数量に入り手入力不可',q);
 const bt=await pg.evaluate(()=>{const r=document.querySelector('#f_kouji .aradd').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
 if(phone) await pg.touchscreen.tap(bt.x,bt.y); else await pg.mouse.click(bt.x,bt.y); await pg.waitForTimeout(200);
 q=await pg.evaluate(()=>[...document.querySelectorAll('#nnSelPop .o')].map(o=>o.textContent));
 ok(q.some(t=>/天端/.test(t))&&q.some(t=>/役物周り/.test(t)),P+'＋部位を追加で自前の一覧（天端・役物周り…）',q);
 const o=await pg.evaluate(()=>{const o=[...document.querySelectorAll('#nnSelPop .o')].find(o=>/天端/.test(o.textContent));const r=o.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
 if(phone) await pg.touchscreen.tap(o.x,o.y); else await pg.mouse.click(o.x,o.y); await pg.waitForTimeout(200);
 const ins2=await pg.$$('#f_kouji .arr input'); await ins2[3].fill('20');
 q=await pg.evaluate(()=>({k:[...document.querySelectorAll('#f_kouji .arr')].map(r=>r.dataset.k),m:document.getElementById('f_m').value}));
 ok(q.k.join()==='平場,立上り,屋根内周,天端'&&q.m==='365.5',P+'天端を足すと合計に入る',q);
 await pg.evaluate(()=>saveProperty()); await pg.waitForTimeout(300);
 q=await pg.evaluate(()=>{const p=props.find(x=>x.name==='テスト部位物件');const s=JSON.parse(localStorage.getItem(NN_PROPS_KEY));return p&&{m:p.m,areas:p.areas,roof:p.roofs[0],saved:JSON.stringify(s).includes('屋根内周')}});
 ok(q&&q.m===365.5&&q.areas.length===1&&q.areas[0].items.length===4&&q.roof.tachi===45.5&&q.roof.hiraba===320&&q.roof.yaku===120&&q.saved,P+'保存：部位・面積表・端末保存',q);
 const id=await pg.evaluate(()=>props.find(x=>x.name==='テスト部位物件').id);
 await pg.evaluate(id=>openModal(id),id); await pg.waitForTimeout(300);
 q=await pg.evaluate(()=>[...document.querySelectorAll('#f_kouji .arr')].map(r=>r.dataset.k+'='+r.querySelector('input').value));
 ok(q.join()==='平場=300,立上り=45.5,屋根内周=120,天端=20',P+'編集で開くと部位が戻る',q);
 // はみ出し
 q=await pg.evaluate(()=>{const m=document.querySelector('#modalbg .modal').getBoundingClientRect();return [...document.querySelectorAll('#f_kouji *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>m.right-2}).length});
 ok(q===0,P+'部位の欄が窓からはみ出さない',q);
 await pg.screenshot({path:'area_'+(phone?'p':'pc')+'.png'});
 ok(errs.length===0,P+'JSエラーなし',errs);
 await ctx.close();}
 await b.close();
})();
