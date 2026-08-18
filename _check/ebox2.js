/* 囲みの色分け（値=白／項目名=薄緑）とスマホの文字サイズ */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [mode,vp] of [['pc',{width:1600,height:900}],['phone',{width:393,height:852}]]){
  console.log('\n===== '+mode+' =====');
  const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);
  const r=await p.evaluate(()=>{
    const Z=window.nnPZ||1;
    const c=document.querySelector('#list .pcard');
    const eb=c.querySelector('.ebox[data-f="tan"]');
    const lb=eb.querySelector('i');
    const cs=getComputedStyle(eb), ls=getComputedStyle(lb);
    const row=getComputedStyle(c.querySelector('.prow'));
    const ttl=getComputedStyle(c.querySelector('.ebox.ttl'));
    return {boxBg:cs.backgroundColor, lblBg:ls.backgroundColor,
      rowFs:parseFloat(row.fontSize)/Z, ttlFs:parseFloat(ttl.fontSize)/Z,
      lblFs:parseFloat(ls.fontSize)/Z,
      cardH:Math.round(c.getBoundingClientRect().height/Z),
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  });
  ok(r.boxBg==='rgb(255, 255, 255)','値の部分は白', r.boxBg);
  ok(r.lblBg!=='rgba(0, 0, 0, 0)' && r.lblBg!=='rgb(255, 255, 255)','項目名は薄い緑のまま', r.lblBg);
  ok(r.overflow<=0,'横はみ出しなし', r.overflow);
  console.log('   本文'+r.rowFs+'px／物件名'+r.ttlFs+'px／項目名'+r.lblFs+'px／カード高さ'+r.cardH+'px');
  if(mode==='phone'){
    ok(r.rowFs<=11.5,'スマホの本文が小さくなった（12→11px）', r.rowFs+'px');
    /* ★2026-08-13f 物件名は「小さすぎる」の指摘で大きくした（12.5→14.5px） */
    ok(r.ttlFs>=14,'スマホの物件名が大きくなった', r.ttlFs+'px');
  }
  ok(errs.length===0,'JSエラーなし', errs.join('|').slice(0,150));
  await p.screenshot({path:'ebox2_'+mode+'.png'});
  await ctx.close();
}
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
