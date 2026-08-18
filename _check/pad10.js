/* 10ページのよこ向きで、本文の左端が画面端から何pxか（=左右の余白）を測る */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGES=[
 ['kirokucho_demo','#dashboard .kgrp'],
 ['hacchu','main .site-card, main .card, main section, main>*'],
 ['camera','main>*, .cambar, #camwrap, body>*:not(header):not(nav)'],
 ['library','.liblist .lrow, #grid>*, main>*'],
 ['yougo','#content>*'],
 ['kokkosho','main>*'],
 ['shiyo_toroku','main>*, .cols, #list'],
 ['zairyo_toroku','main>*, .cols, #list'],
 ['zumen_sekisan','#canvaswrap, main>*'],
 ['genba_map_v36','#app, main>*'],
];
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const [f,sel] of PAGES){
    const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage();
    try{
      await p.goto('http://localhost:8899/_land_'+f+'.html',{waitUntil:'load',timeout:20000});
      await p.waitForTimeout(1500);
      const r=await p.evaluate(s=>{
        const cands=s.split(',').map(x=>x.trim());
        let el=null;
        for(const c of cands){ const e=[...document.querySelectorAll(c)].find(x=>{const b2=x.getBoundingClientRect(); return b2.width>80&&b2.height>20;}); if(e){el=e;break;} }
        if(!el)return null;
        const b2=el.getBoundingClientRect();
        const mainCs=document.querySelector('main')?getComputedStyle(document.querySelector('main')):null;
        return {tag:el.tagName+'.'+String(el.className).split(' ')[0], l:Math.round(b2.left), r:Math.round(innerWidth-b2.right),
          vw:innerWidth, mainPad:mainCs?mainCs.paddingLeft+'/'+mainCs.paddingRight:null};
      }, sel);
      console.log(f.padEnd(16), JSON.stringify(r));
    }catch(e){ console.log(f.padEnd(16), 'ERR', String(e).slice(0,60)); }
    await ctx.close();
  }
  await b.close();
})();
