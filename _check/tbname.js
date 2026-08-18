const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const OUT='/tmp/claude-0/-home-user-osamarinavi-bousui/b1be0cae-0477-5376-b744-be793bfc684f/scratchpad/out';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(2600);
  /* 削除ボタンを長押し → 名前が出る・離すと消える・機能（confirm）は動かない */
  let dialog=0; p.on('dialog',d=>{dialog++; d.dismiss();});
  const r0=await p.evaluate(()=>{const b=document.getElementById('tl_del'); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2};});
  await p.mouse.move(r0.x,r0.y); await p.mouse.down();
  await p.waitForTimeout(700);
  const shown=await p.evaluate(()=>{const t=document.getElementById('nnTbName'); return {disp:getComputedStyle(t).display, text:t.textContent};});
  await p.screenshot({path:OUT+'/chk_tbname.png'});
  await p.mouse.up(); await p.waitForTimeout(900);
  const hidden=await p.evaluate(()=>getComputedStyle(document.getElementById('nnTbName')).display);
  /* ふつうのタップは今までどおり動く（confirmが出る＝smartDelete が動く） */
  await p.mouse.click(r0.x,r0.y); await p.waitForTimeout(400);
  console.log(JSON.stringify({長押しで表示:shown, 離すと消える:hidden, 長押し中confirm:dialog<=0?'抑止OK(0)':'NG('+dialog+')'}));
  const dialogAfter=dialog;
  console.log('タップでは機能が動く(confirm発生):', dialogAfter>=1?'○':'★NG');
  console.log('JSエラー', errs.length?errs:'なし');
  await b.close();
})();
