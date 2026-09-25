/* 2026-09-25b ダッシュボードの⤢（拡大）：歯車の絵が原寸（1254px）で画面を覆い戻せなかった。
   拡大表示の中の絵が枠に収まり、「閉じる」が見えて押せば閉じることを全部の⤢で確かめる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,200):''));
 for(const mode of ['mobile','ichiran','pc']){
  const ctx=await b.newContext(mode==='pc'?{viewport:{width:1600,height:900}}:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  if(mode!=='pc') await ctx.addInitScript(m=>{try{localStorage.setItem('nn_view_mode',m)}catch(e){}},mode);
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo')+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1500);
  const n=await pg.evaluate(()=>document.querySelectorAll('#dashboard .dpanel .zx').length);
  let bad=[];
  for(let i=0;i<n;i++){
   const r=await pg.evaluate(i=>{const e=document.querySelectorAll('#dashboard .dpanel .zx')[i];e.click();const z=document.getElementById('zoom'),w=z.querySelector('.zwrap').getBoundingClientRect();
     const big=[...z.querySelectorAll('.zbody img')].filter(im=>{const q=im.getBoundingClientRect();return q.width>w.width+2||q.height>w.height*0.6});
     const c=z.querySelector('.zclose').getBoundingClientRect();const top=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);
     const closeOk=!!top&&(top===z.querySelector('.zclose')||z.querySelector('.zclose').contains(top));
     z.querySelector('.zclose').click();return {big:big.length,closeOk,closed:!z.classList.contains('open')};},i);
   if(r.big||!r.closeOk||!r.closed) bad.push(i+':'+JSON.stringify(r));
  }
  ok(n>0&&bad.length===0,mode+' ⤢'+n+'個：拡大の中の絵が枠に収まり「閉じる」で戻れる',bad);
  ok(errs.length===0,mode+' JSエラーなし',errs);
  await ctx.close();
 }
 await b.close();
})();
