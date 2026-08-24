/* iPhone SE / 8 のよこ向き（667×375・ノッチなし）を再現 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:667,height:375},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>375});Object.defineProperty(screen,'height',{get:()=>667});}catch(e){}});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
  const c=await p.$('#list .pcard'); await c.screenshot({path:'se_card.png'});
  console.log(JSON.stringify(await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const g=e=>{const r=e.getBoundingClientRect();return[Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.bottom)];};
    const sh=c.querySelector('.rfiles .pshots'), dc=c.querySelector('.rfiles .pdocs'), card=g(c);
    return {card, sh:g(sh), dc:g(dc), over: g(sh)[1]>g(dc)[0],
      dcOverflowCard: g(dc)[1]>card[1],
      shTxt: JSON.stringify(sh.innerText), pshN:c.querySelectorAll('.rfiles .psh').length,
      docRights:[...c.querySelectorAll('.pdocs .doc')].map(e=>g(e)[1])};
  }),null,1));
  await b.close();
})();
