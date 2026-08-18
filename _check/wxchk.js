const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/_land_kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  await p.evaluate(()=>showView('zentai')); await p.waitForTimeout(900);
  const r=await p.evaluate(()=>{
    const pp=[...document.querySelectorAll('.hd-wx .pp')].map(e=>e.textContent);
    const bad=pp.filter(t=>{const v=parseInt(t); return isNaN(v)||v<0||v>100;});
    /* 1年ぶん機械的にも確認 */
    let bad2=0;
    for(let m=0;m<12;m++)for(let d=1;d<=28;d++){
      for(const c of ['札幌','東京']){
        const w=wxOf(c,new Date(2026,m,d)); if(!w)continue;
        if(w.p<0||w.p>100||w.h<w.l)bad2++;
      }
    }
    return {shown:pp.slice(0,16), bad, bad2};
  });
  console.log(JSON.stringify(r));
  console.log(r.bad.length===0&&r.bad2===0?'○ 天気の異常値なし':'★NG');
  await b.close();
})();
