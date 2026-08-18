const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [W,H,mob] of [[1366,1000,false],[1920,1000,false],[2560,1000,false],[393,852,true]]){
    const o={viewport:{width:W,height:H}};
    if(mob){o.deviceScaleFactor=3;o.isMobile=true;o.hasTouch=true;}
    const p=await b.newPage(o);
    if(mob) await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
    const r=await p.evaluate(()=>{
      const z=window.nnPZ||1;
      const sel='#dashboard .stchip, #dashboard .cta, #dashboard .zx, #dashboard .colgear, #dashboard .sortbtn, #dashboard .httl, #dashboard .kgb *[onclick], #dashboard .dpanel';
      const es=[...document.querySelectorAll(sel)];
      let bad=[], n=0;
      es.forEach(e=>{
        const b=e.getBoundingClientRect();
        if(b.width<6||b.height<6||b.top<0||b.bottom>innerHeight) return;
        n++;
        const hit=document.elementFromPoint(b.left+b.width/2, b.top+b.height/2);
        if(!hit) { bad.push([e.className+'','なし']); return; }
        if(hit!==e && !e.contains(hit) && !hit.contains(e))
          bad.push([(e.tagName+'.'+(e.className+'').split(' ')[0]), (hit.tagName+'.'+(hit.className+'').split(' ')[0])]);
      });
      return {z, n, bad:bad.slice(0,8), total:bad.length};
    });
    console.log(`幅${W}${mob?'(スマホ)':''} zoom=${r.z}  調べた${r.n}か所 → 指した先が別物 ${r.total}件`);
    r.bad.forEach(x=>console.log('    ',x[0],'→',x[1]));
    await p.close();
  }
  await b.close();
})();
