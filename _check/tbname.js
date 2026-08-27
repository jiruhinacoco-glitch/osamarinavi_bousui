const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const OUT='/tmp/claude-0/-home-user-osamarinavi-bousui/b1be0cae-0477-5376-b744-be793bfc684f/scratchpad/out';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(2600); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  /* ★消すものが何も無いと smartDelete は confirm を出さない（トーストだけ）ので、
     先にサンプル形状を読み込んでおく。ここを入れないと最後の判定が必ず★NGになる。 */
  await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
  await p.waitForTimeout(700);
  /* 削除ボタンを長押し → 名前が出る・離すと消える・機能（confirm）は動かない */
  let dialog=0; p.on('dialog',d=>{dialog++; d.dismiss();});
  const r0=await p.evaluate(()=>{const b=document.getElementById('tl_del'); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2};});
  await p.mouse.move(r0.x,r0.y); await p.mouse.down();
  await p.waitForTimeout(700);
  const shown=await p.evaluate(()=>{const t=document.getElementById('nnTbName'); return {disp:getComputedStyle(t).display, text:t.textContent};});
  await p.screenshot({path:OUT+'/chk_tbname.png'});
  await p.mouse.up(); await p.waitForTimeout(900);
  const hidden=await p.evaluate(()=>getComputedStyle(document.getElementById('nnTbName')).display);
  /* ★長押し中の件数は「ふつうのタップ」より前に控えること。
     後で読むと、そのタップぶんまで数えてしまい必ずNGになる。 */
  const dialogLP=dialog;
  /* ふつうのタップは今までどおり動く（confirmが出る＝smartDelete が動く） */
  await p.mouse.click(r0.x,r0.y); await p.waitForTimeout(400);
  console.log(JSON.stringify({長押しで表示:shown, 離すと消える:hidden,
    長押し中confirm:dialogLP<=0?'抑止OK(0)':'★NG('+dialogLP+')'}));
  console.log('タップでは機能が動く(confirm発生):', dialog>dialogLP?'○':'★NG');
  /* ★2026-08-27d スマホでは記号だけに短くしたボタンがある（▭ ⊡ 📂 🖼 ⇹ ⌂ ⊕ ◆）。
     短くする前の名前を data-nm に控えているので、長押しではその名前が出ること。 */
  const nm=await p.evaluate(()=>{
    const ids=['tl_box','tl_fit','tl_open','tl_uimg','tl_tor','tl_ksg','tl_addpt','tl_p_hatogoya'];
    return ids.map(id=>{const e=document.getElementById(id);
      return {id:id, sym:(e.innerText||'').trim(), nm:(e.dataset&&e.dataset.nm)||''};});
  });
  const okSym=nm.every(x=>x.sym.length<=2), okNm=nm.every(x=>x.nm.length>=3);
  console.log('記号だけに短くなっている:', okSym?'○':'★NG '+JSON.stringify(nm.filter(x=>x.sym.length>2)));
  console.log('長押しの名前は元の文字のまま:', okNm?'○':'★NG '+JSON.stringify(nm.filter(x=>x.nm.length<3)));
  const shown2=await (async()=>{
    const r=await p.evaluate(()=>{const b=document.getElementById('tl_box'); const q=b.getBoundingClientRect();
      return {x:q.left+q.width/2, y:q.top+q.height/2};});
    await p.mouse.move(r.x,r.y); await p.mouse.down(); await p.waitForTimeout(700);
    const t=await p.evaluate(()=>document.getElementById('nnTbName').textContent);
    await p.mouse.up(); await p.waitForTimeout(300); return t;
  })();
  console.log('▭ を長押しすると「長方形」が出る:', /長方形/.test(shown2)?'○':'★NG '+shown2);
  console.log('JSエラー', errs.length?errs:'なし');
  await b.close();
})();
