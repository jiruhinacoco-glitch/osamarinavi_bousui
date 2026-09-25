/* 2026-09-25b 現場記録帳のカード：工法・状態の欄を押すと1回で自前の一覧→選ぶと保存（本人の写真：カードの工法でiPhoneの一覧が出た） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,220):''));
 for(const phone of [true,false]){
 const ctx=await b.newContext(phone?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1600,height:900}});
 if(phone) await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
 await pg.evaluate(()=>showView('list')); await pg.waitForTimeout(800);
 for(const f of ['kouhou','status']){
 const box=await pg.evaluate(f=>{const e=document.querySelector('#list .pcard [data-f="'+f+'"]');if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,pid:e.closest('.pcard').dataset.pid}},f);
 if(!box){ok(false,f+' 欄が見つからない');continue;}
 if(phone) await pg.touchscreen.tap(box.x,box.y); else await pg.mouse.click(box.x,box.y);
 await pg.waitForTimeout(200);
 let st=await pg.evaluate(()=>{const p=document.getElementById('nnSelPop');return {open:!!p&&p.classList.contains('open'),n:p?p.querySelectorAll('.o').length:0,cur:(p&&p.querySelector('.o.on')||{}).textContent}});
 ok(st.open&&st.n>=2,(phone?'スマホ':'PC')+' カードの'+f+'を押すと1回で自前の一覧',st);
 if(!st.open) continue;
 const r=await pg.evaluate(()=>{const o=[...document.querySelectorAll('#nnSelPop .o:not(.on)')][1];o.scrollIntoView({block:'nearest'});const q=o.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2,t:o.textContent}});
 if(phone) await pg.touchscreen.tap(r.x,r.y); else await pg.mouse.click(r.x,r.y);
 await pg.waitForTimeout(400);
 const v=await pg.evaluate(([pid,f])=>{const p=props.find(x=>x.id===+pid);return f==='kouhou'?p.kouhou:p.status},[box.pid,f]);
 ok(v===r.t,(phone?'スマホ':'PC')+' 選んだ値がカードに保存される',{v,want:r.t});
 }
 // 外を押して閉じる → 元に戻る（PCは外のクリックで物件が開くことがあるのでスマホだけ）
 if(phone){
 const box=await pg.evaluate(()=>{const e=document.querySelector('#list .pcard [data-f="kouhou"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
 if(phone) await pg.touchscreen.tap(box.x,box.y); else await pg.mouse.click(box.x,box.y); await pg.waitForTimeout(200);
 if(phone) await pg.touchscreen.tap(20,300); else await pg.mouse.click(20,300); await pg.waitForTimeout(300);
 const q=await pg.evaluate(()=>({open:document.getElementById('nnSelPop').classList.contains('open'),sels:document.querySelectorAll('#list .pcard select').length}));
 ok(!q.open&&q.sels===0,(phone?'スマホ':'PC')+' 外を押すと閉じて欄も元に戻る',q);
 }
 ok(errs.length===0,'JSエラーなし',errs);
 await pg.screenshot({path:'cardsel_'+(phone?'p':'pc')+'.png'});
 await ctx.close();}
 await b.close();
})();
