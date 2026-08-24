try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/_land.html',{waitUntil:'load'});
  await p.waitForTimeout(1600);
  const r=await p.evaluate(()=>{
    const g=s=>document.querySelector(s);
    const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {l:+r.left.toFixed(1),r:+r.right.toFixed(1),w:+r.width.toFixed(1)};};
    const sb=g('.stbar');
    const kpi=g('#dashboard .kgrp');
    return {vw:innerWidth, main:box(g('main')), mainPad:getComputedStyle(g('main')).paddingLeft+' / '+getComputedStyle(g('main')).paddingRight,
      stbar:box(sb), stbarScroll:sb?{sw:sb.scrollWidth, cw:sb.clientWidth}:null,
      kpi:box(kpi), dash:box(g('#dashboard'))};
  });
  console.log(JSON.stringify(r,null,1));
  await p.screenshot({path:'land_dash.png'});
  await b.close();
})();
