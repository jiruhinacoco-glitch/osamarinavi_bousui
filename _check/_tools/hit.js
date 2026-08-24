const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const W of [1920,1366]){
    const p=await b.newPage({viewport:{width:W,height:1080}});
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
    const z=await p.evaluate(()=>window.nnPZ);
    // 見出しの見た目の中心（画面座標）を出し、そこに本物のマウスクリックを送る
    const info=await p.evaluate(()=>{
      const e=document.querySelectorAll('.httl')[0];
      const r=e.getBoundingClientRect();
      return {r:{x:r.x,y:r.y,w:r.width,h:r.height}, txt:e.textContent};
    });
    const cx=info.r.x+info.r.w/2, cy=info.r.y+info.r.h/2;
    await p.evaluate(()=>{window.__hit=null; document.addEventListener('click',ev=>{
      window.__hit={tag:ev.target.tagName, cls:ev.target.className+'', txt:(ev.target.textContent||'').slice(0,18),
        cx:ev.clientX, cy:ev.clientY};},true);});
    await p.mouse.click(cx,cy);
    await p.waitForTimeout(120);
    const got=await p.evaluate(()=>window.__hit);
    const efp=await p.evaluate(([x,y])=>{const el=document.elementFromPoint(x,y);
      return el?el.tagName+'.'+(el.className+'').slice(0,24)+' “'+(el.textContent||'').slice(0,14)+'”':'null';},[cx,cy]);
    console.log(`--- 幅${W}  zoom=${z}`);
    console.log('  見出しの箱:',JSON.stringify(info.r),' 送った座標:',cx.toFixed(1),cy.toFixed(1));
    console.log('  elementFromPoint:',efp);
    console.log('  実クリックの受け手:',JSON.stringify(got));
    await p.close();
  }
  await b.close();
})();
