/* 反応の速さを測る（CPUを4倍重くして実機に近づける） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PH=process.argv[2]==='ph';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(PH
    ?{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(2500);
  const t=async(label,fn)=>{
    const ms=await p.evaluate(fn);
    console.log(label.padEnd(34), ms+'ms');
    return ms;
  };
  await t('現場一覧を開く(showView+render)', ()=>{const a=performance.now(); showView('list'); return Math.round(performance.now()-a);});
  await p.waitForTimeout(900);
  await t('render() 100件（2回目）', ()=>{const a=performance.now(); render(); return Math.round(performance.now()-a);});
  await p.waitForTimeout(900);
  await t('カードを1枚たたく(arm)', ()=>{
    const c=document.querySelectorAll('#list .pcard')[2]; const r=c.getBoundingClientRect();
    const a=performance.now();
    c.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+300,clientY:r.top+10,bubbles:true,isPrimary:true,pointerId:1}));
    c.dispatchEvent(new MouseEvent('click',{clientX:r.left+300,clientY:r.top+10,bubbles:true}));
    return Math.round(performance.now()-a);});
  await p.waitForTimeout(600);
  await t('検索欄に1文字入れる', ()=>{
    const i=document.querySelector('.search input')||document.querySelector('#toolbar input');
    const a=performance.now(); i.value='札幌'; i.dispatchEvent(new Event('input',{bubbles:true}));
    return Math.round(performance.now()-a);});
  await p.waitForTimeout(900);
  await p.evaluate(()=>{const i=document.querySelector('.search input'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true}));});
  await p.waitForTimeout(900);
  await t('ダッシュボードへ切替', ()=>{const a=performance.now(); showView('dash'); return Math.round(performance.now()-a);});
  await p.waitForTimeout(1200);
  await t('renderDash() 再計算', ()=>{const a=performance.now(); renderDash(); return Math.round(performance.now()-a);});
  await p.waitForTimeout(800);
  /* DOMの重さ */
  console.log('DOMノード数', await p.evaluate(()=>document.querySelectorAll('*').length));
  console.log('一覧のノード数', await p.evaluate(()=>document.getElementById('list').querySelectorAll('*').length));
  await b.close();
})();
