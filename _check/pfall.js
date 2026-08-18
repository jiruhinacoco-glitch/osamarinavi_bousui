const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  // パソコン
  const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1.5});
  const e1=[]; p.on('pageerror',e=>e1.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); 
  await p.waitForTimeout(2600);
  const d=await p.evaluate(()=>{
    const ps=[...document.querySelectorAll('#dashboard .dpanel')];
    const Z=window.nnPZ||1;
    return {n:ps.length,
      pics:[...document.querySelectorAll('#dashboard .httl img.hpic')].map(x=>({f:x.getAttribute('src').split('/').pop(), ok:x.naturalWidth>0})),
      hr:getComputedStyle(document.querySelector('#dashboard .dpanel h4')).borderBottomWidth,
      bd:getComputedStyle(ps[0]).borderTopWidth+' '+getComputedStyle(ps[0]).borderTopColor,
      br:getComputedStyle(ps[0]).borderRadius,
      grad:(getComputedStyle(ps[0],'::before').backgroundImage.match(/linear-gradient/g)||[]).length,
      innerLine:getComputedStyle(ps[0],'::after').boxShadow,
      fw:getComputedStyle(ps[0]).borderTopWidth,
      ov:document.documentElement.scrollWidth-innerWidth};
  });
  console.log('PC:',JSON.stringify(d));
  console.log('JSエラー', e1.length?e1:'なし');
  await p.screenshot({path:'pf_pc.png',clip:{x:0,y:150,width:1600,height:820}});
  await p.close();
  // スマホ たて
  const m=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await m.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const e2=[]; m.on('pageerror',e=>e2.push(e.message));
  await m.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await m.waitForTimeout(2500);
  const md=await m.evaluate(()=>({ov:document.documentElement.scrollWidth-innerWidth,
    n:document.querySelectorAll('#dashboard .dpanel').length}));
  console.log('スマホ:',JSON.stringify(md),'JSエラー',e2.length?e2:'なし');
  await m.screenshot({path:'pf_mo.png',clip:{x:0,y:150,width:393,height:620}});
  await b.close();
})();
