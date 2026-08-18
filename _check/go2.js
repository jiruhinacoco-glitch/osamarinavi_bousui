/* ★2026-08-17a 詳細へは「詳細」ボタンからだけ（2回タップの移動は廃止） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'pc';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage(M==='pc'?{viewport:{width:1600,height:900}}
    :{viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  if(M!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  const inDetail=()=>p.evaluate(()=>document.getElementById('mainview').classList.contains('show-detail'));
  /* 何も無い場所（日付）を2回タップしても移動しない */
  const pos=await p.evaluate(()=>{const e=document.querySelector('#list .pcard .pdate');
    const r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2};});
  await p.mouse.click(pos.x,pos.y); await p.waitForTimeout(300);
  ok('1回タップ＝選ばれる（黄色）', await p.evaluate(()=>document.querySelector('#list .pcard').classList.contains('sel')));
  await p.mouse.click(pos.x,pos.y); await p.waitForTimeout(500);
  ok('2回タップしても詳細へ移動しない', !(await inDetail()));
  await p.mouse.click(pos.x,pos.y); await p.mouse.click(pos.x,pos.y); await p.waitForTimeout(500);
  ok('何度タップしても移動しない', !(await inDetail()));
  /* 「詳細」ボタンで移動する */
  const bp=await p.evaluate(()=>{const e=document.querySelector('#list .pcard .pgo');
    const r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, w:r.width/(window.nnPZ||1), h:r.height/(window.nnPZ||1)};});
  ok('④詳細ボタンは大きい（幅60px・高さ30px以上）', bp.w>=60&&bp.h>=30, Math.round(bp.w)+'x'+Math.round(bp.h));
  await p.mouse.click(bp.x,bp.y); await p.waitForTimeout(700);
  ok('⑦「詳細」ボタンで詳細ページへ移る', await inDetail());
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('['+M+']'); console.log(R.join('\n'));
  await b.close();
})();
