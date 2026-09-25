/* 2026-09-25c スマホ：枠の中の表・カード一覧が指で縦横斜めに自由に動いてしまう（本人の画面録画2本）。
   ・横に送る表（施工中の現場など）は縦に動かない＝指で斜めに引いても表の縦位置（scrollTop）が0のまま
   ・カード一覧（#list）は横に動かない＝斜めに引いても scrollLeft が0のまま
   ・施工中の現場の表は先頭列（物件名）が固定 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,220):''));
 const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo')+'.html',{waitUntil:'load'}); await pg.waitForTimeout(2500);
 const cdp=await ctx.newCDPSession(pg);
 async function drag(x0,y0,dx,dy){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
  for(let i=1;i<=10;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+dx*i/10,y:y0+dy*i/10}]}); await pg.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(600);
 }
 // 施工中の現場の表
 const box=await pg.evaluate(()=>{const w=document.querySelector('#dashboard .sekou-wrap');w.scrollIntoView({block:'center'});const r=w.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+Math.min(r.height/2,120)}});
 await drag(box.x,box.y,-120,-160); // 斜め上へ
 await drag(box.x,box.y,60,140);    // 斜め下へ
 let q=await pg.evaluate(()=>{const w=document.querySelector('#dashboard .sekou-wrap');const td=w.querySelector('tbody td');return {top:w.scrollTop,oy:getComputedStyle(w).overflowY,sticky:td&&getComputedStyle(td).position}});
 ok(q.top===0&&q.oy==='hidden','施工中の現場の表：斜めに引いても表は縦に動かない',q);
 ok(q.sticky==='sticky','施工中の現場の表：先頭列（物件名）は固定',q);
 await pg.evaluate(()=>showView('list')); await pg.waitForTimeout(1200);
 const c=await pg.evaluate(()=>{const r=document.getElementById('list').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+200}});
 await drag(c.x,c.y,-150,-100); await drag(c.x,c.y,150,-60);
 q=await pg.evaluate(()=>{const l=document.getElementById('list');return {left:l.scrollLeft,ox:getComputedStyle(l).overflowX,page:document.scrollingElement.scrollLeft}});
 ok(q.left===0&&q.page===0,'カード一覧：斜めに引いても横に動かない',q);
 ok(errs.length===0,'JSエラーなし',errs);
 await b.close();
})();
