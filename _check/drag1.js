const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const W of [1366,1920,2560]){
    const p=await b.newPage({viewport:{width:W,height:1000}});
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
    const z=await p.evaluate(()=>window.nnPZ||1);
    // パネルの「何もない所」を長押し → つかんだパネルが元の位置に出るか
    const before=await p.evaluate(()=>{
      const ps=[...document.querySelectorAll('#dashboard .dpanel')];
      const e=ps[1]; e.scrollIntoView({block:'center'}); return null;});
    await p.waitForTimeout(300);
    const pt=await p.evaluate(()=>{
      const e=[...document.querySelectorAll('#dashboard .dpanel')][1];
      const r=e.getBoundingClientRect();
      return {x:r.right-30, y:r.top+8, L:Math.round(r.left), T:Math.round(r.top), Wd:Math.round(r.width)};
    });
    await p.mouse.move(pt.x,pt.y); await p.mouse.down(); await p.waitForTimeout(700);
    const after=await p.evaluate(()=>{
      const e=document.querySelector('.dpanel.lifted'); if(!e) return null;
      const r=e.getBoundingClientRect();
      return {L:Math.round(r.left), T:Math.round(r.top), Wd:Math.round(r.width)};
    });
    await p.mouse.up(); await p.waitForTimeout(200);
    if(!after){ console.log(`幅${W} zoom=${z}  つかめなかった`); }
    else{
      const dx=after.L-pt.L, dy=after.T-pt.T, dw=after.Wd-pt.Wd;
      console.log(`幅${W} zoom=${z}  つかむ前 左${pt.L} 上${pt.T} 幅${pt.Wd} → つかんだ後 左${after.L} 上${after.T} 幅${after.Wd}   ずれ ${dx},${dy} 幅${dw}  ${Math.abs(dx)<8&&Math.abs(dy)<8&&Math.abs(dw)<10?'○':'★NG ずれている'}`);
    }
    await p.close();
  }
  await b.close();
})();
