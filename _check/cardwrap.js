/* 2026-09-25b 現場記録帳カード（スマホ表示・▼詳細を開いた状態）：既存・区分・構造の行がカードからはみ出さない（本人の写真「露出アスファルト防水」） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const pg=await ctx.newPage();
 await pg.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo')+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
 await pg.evaluate(()=>{openModal();document.getElementById('f_name').value='札幌';document.getElementById('f_amt').value='5000000';saveProperty();});
 await pg.waitForTimeout(300);
 await pg.evaluate(()=>{const p=props[0];p.kizon='露出アスファルト防水';p.kouzou='S';showView('list');});
 await pg.waitForTimeout(800);
 await pg.evaluate(()=>{const b=document.querySelector('#list .pcard .sp-more');b.click();});
 await pg.waitForTimeout(600);
 const r=await pg.evaluate(()=>{const c=document.querySelector('#list .pcard');const cr=c.getBoundingClientRect();return {card:[Math.round(cr.left),Math.round(cr.right)],W:document.documentElement.clientWidth,over:[...c.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>cr.right+1}).slice(0,10).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)+' '+e.textContent.trim().slice(0,10))}});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''));
 ok(r.over.length===0,'スマホ：既存防水の名前が長くてもカードの中身がカードの右へはみ出さない',r);
 await b.close();
})();
