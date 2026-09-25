/* 2026-09-25b 全11画面・スマホ/PC：選択欄を押すと自前の一覧（#nnSelPop）が出て、選ぶと値が変わり change が届く（本人「iPhoneの灰色の選択肢枠をやめて」） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const pages=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'];
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,200):''));
 for(const phone of [true,false]){
 for(const f of pages){
  const ctx=await b.newContext(phone?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1600,height:900}});
  if(phone) await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
  if(f==='kirokucho_demo') await pg.evaluate(()=>{const t=[...document.querySelectorAll('#viewtabs button, .vtab, button')].find(b=>/現場一覧/.test(b.textContent)&&b.offsetParent);t&&t.click();}), await pg.waitForTimeout(800);
  const loaded=await pg.evaluate(()=>!!window.__nnSelect);
  // 画面に見えていて押せる select を1つ
  const idx=await pg.evaluate(()=>{const W=document.documentElement.clientWidth,H=document.documentElement.clientHeight;const a=[...document.querySelectorAll('select')];return a.findIndex(s=>{if(s.disabled||s.multiple||s.options.length<2)return false;s.scrollIntoView({block:'center'});const r=s.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>H)return false;const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e===s||s.contains(e);});});
  if(idx<0){ ok(loaded,(phone?'スマホ ':'PC ')+f+' 読込済・画面に押せる選択欄なし'); await ctx.close(); continue; }
  const box=await pg.evaluate(i=>{const s=document.querySelectorAll('select')[i];s.scrollIntoView({block:'center'});s.addEventListener('change',()=>window.__chg=(window.__chg||0)+1);const r=s.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,v:s.selectedIndex,n:s.options.length,id:s.id||s.className}},idx);
  if(phone) await pg.touchscreen.tap(box.x,box.y); else await pg.mouse.click(box.x,box.y);
  await pg.waitForTimeout(150);
  const st=await pg.evaluate(()=>{const p=document.getElementById('nnSelPop');return p&&{open:p.classList.contains('open'),n:p.querySelectorAll('.o').length,top:p.getBoundingClientRect().top}});
  ok(st&&st.open&&st.n>=2,(phone?'スマホ ':'PC ')+f+' 選択欄('+box.id+')を押すと自前の一覧',st);
  const want=(box.v+1)%box.n;
  if(st&&st.open){ const r=await pg.evaluate(w=>{const o=document.querySelector('#nnSelPop .o[data-i="'+w+'"]');const q=o.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2}},want);
    if(phone) await pg.touchscreen.tap(r.x,r.y); else await pg.mouse.click(r.x,r.y); await pg.waitForTimeout(150);
    const q=await pg.evaluate(i=>({v:document.querySelectorAll('select')[i].selectedIndex,chg:window.__chg||0,open:document.getElementById('nnSelPop').classList.contains('open')}),idx);
    ok(q.v===want&&q.chg>=1&&!q.open,(phone?'スマホ ':'PC ')+f+' 選ぶと値が変わりchangeが届き閉じる',q); }
  ok(errs.length===0,(phone?'スマホ ':'PC ')+f+' JSエラーなし',errs);
  await ctx.close();
 }}
 await b.close();
})();
