try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'_land.html';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  const r=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard'); if(!c)return{err:'no card'};
    const g=e=>{const b=e.getBoundingClientRect();return[Math.round(b.left),Math.round(b.right),Math.round(b.top),Math.round(b.bottom)];};
    const sh=c.querySelector('.pshots'), dc=c.querySelector('.pdocs'), pm=c.querySelector('.pmain');
    const dbs=[...c.querySelectorAll('.pdocs .db')].map(g);
    const docs=[...c.querySelectorAll('.pdocs .doc')].map(g);
    const psh=[...c.querySelectorAll('.psh')].map(g);
    const head=c.querySelector('.rhead');
    return {pmain:g(pm), pshots:sh?g(sh):null, pdocs:dc?g(dc):null, dbs, docsR:docs.map(d=>d[1]),
      pshR:psh.map(d=>d[1]), headH:Math.round(head.getBoundingClientRect().height),
      cardW:Math.round(c.getBoundingClientRect().width),
      over: sh&&dc? (g(sh)[1] > g(dc)[0]) : null,
      docOverflow: dc? Math.max(...docs.map(d=>d[1])) - g(dc)[1] : null};
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})();
