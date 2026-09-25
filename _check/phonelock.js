/* 2026-09-25b スマホ：ダッシュボードの枠は保存済みの大きさ・位置を使わず、つまみも出さない */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,200):''));
 const f=process.argv[2]||'kirokucho_demo';
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');localStorage.setItem('nn_dash_layout_v1',JSON.stringify({sizes:{yojitsu:{span:40,height:120}},positions:{mobile:{yojitsu:{x:30,y:0}}}}));}catch(e){}});
 const pg=await ctx.newPage(); await pg.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1500);
 const r=await pg.evaluate(()=>{const p=document.querySelector('[data-panel-id="yojitsu"]');const g=p.parentElement;return {pw:Math.round(p.getBoundingClientRect().width),gw:Math.round(g.getBoundingClientRect().width),h:p.style.height,pos:p.style.position,edges:document.querySelectorAll('.nn-panel-edge').length}});
 ok(r.pw>r.gw-20&&!r.h&&r.pos!=='absolute'&&r.edges===0,'スマホ：保存された小さい大きさ・位置を使わず全幅、つまみなし',r);
 await b.close();
})();
