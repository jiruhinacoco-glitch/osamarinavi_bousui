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
  console.log(JSON.stringify(await p.evaluate(()=>{
    const cs=e=>e?getComputedStyle(e):null;
    const root=getComputedStyle(document.documentElement);
    const sb=document.querySelector('.stbar');
    const kg=document.querySelector('#dashboard .kgrp');
    const par=[]; let e=kg; while(e&&e!==document.body){par.push(e.tagName+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:''));e=e.parentElement;}
    return {phone:document.documentElement.getAttribute('data-nnphone'),
      land:matchMedia('(orientation:landscape)').matches,
      nnhm:root.getPropertyValue('--nnhm'), nnsaf:root.getPropertyValue('--nnsaf'),
      stbarPad:cs(sb)?cs(sb).paddingLeft+'/'+cs(sb).paddingRight:null,
      stbarCls:sb?sb.className:null,
      chain:par.join(' < '),
      dashPad:cs(document.querySelector('#dashboard')).paddingLeft+'/'+cs(document.querySelector('#dashboard')).paddingRight,
      kgL:kg.getBoundingClientRect().left};
  }),null,1));
  await b.close();
})();
