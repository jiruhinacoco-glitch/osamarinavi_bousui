const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1999,height:990}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  const info=async(l)=>console.log(l, JSON.stringify(await p.evaluate(()=>{
    const tb=document.querySelector('.toolbar').getBoundingClientRect();
    return {tbTop:Math.round(tb.top), tbBottom:Math.round(tb.bottom),
      pageScroll:Math.round(document.scrollingElement.scrollTop),
      listScroll:Math.round(document.getElementById('list').scrollTop),
      bodyScrollable:document.scrollingElement.scrollHeight-document.scrollingElement.clientHeight,
      mv:(()=>{const m=document.getElementById('mainview');return {sh:m.scrollHeight, ch:m.clientHeight, st:m.scrollTop};})()};
  })));
  await info('最初        ');
  await p.mouse.move(1000,600); await p.mouse.wheel(0,900); await p.waitForTimeout(600);
  await info('ホイール後  ');
  await p.screenshot({path:'tb_scrolled.png'});
  await b.close();
})();
