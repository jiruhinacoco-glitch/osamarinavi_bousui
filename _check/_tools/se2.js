/* 壊れた写真（読めないURL）を1枚入れた状態を再現（iPhoneよこ 667×375） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:667,height:375},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>375});Object.defineProperty(screen,'height',{get:()=>667});}catch(e){}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{
    const p0=props[0];
    p0.files.push({name:'施工前.jpg', size:100, cat:'photo', url:'blob:https://example/dead-object-url', date:'2026/08/17'});
    showView('list'); 
  });
  await p.waitForTimeout(1500);
  const c=await p.$('#list .pcard'); await c.screenshot({path:'se_broken.png'});
  console.log(JSON.stringify(await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const g=e=>{const r=e.getBoundingClientRect();return[Math.round(r.left),Math.round(r.right)];};
    const cells=[...c.querySelectorAll('.rfiles .psh')];
    const sh=c.querySelector('.rfiles .pshots'), dc=c.querySelector('.rfiles .pdocs');
    return {cells:cells.map(e=>({has:e.classList.contains('has'), w:Math.round(e.getBoundingClientRect().width),
        txt:e.innerText, iDisp:e.querySelector('i')?getComputedStyle(e.querySelector('i')).display:null})),
      shR:g(sh)[1], dcL:g(dc)[0], over:g(sh)[1]>g(dc)[0], errs:0};
  }),null,1), errs.join('/'));
  await b.close();
})();
