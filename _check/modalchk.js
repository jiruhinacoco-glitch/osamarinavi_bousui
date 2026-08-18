const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const v of [[2000,1010],[1600,900],[1366,720]]){
    const p=await (await b.newContext({viewport:{width:v[0],height:v[1]}})).newPage();
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1700);
    await p.evaluate(()=>openModal()); await p.waitForTimeout(500);
    console.log(v[0]+'x'+v[1], JSON.stringify(await p.evaluate(()=>{
      const Z=window.nnPZ||1;
      const m=document.querySelector('#modalbg .modal'), r=m.getBoundingClientRect();
      const bg=document.getElementById('modalbg');
      const name=document.getElementById('f_name').getBoundingClientRect();
      const cs=getComputedStyle(m);
      return {Z:+Z.toFixed(2), vh:innerHeight,
        modal:{top:Math.round(r.top), bottom:Math.round(r.bottom), h:Math.round(r.height)},
        maxH:cs.maxHeight, overflow:cs.overflowY,
        nameTop:Math.round(name.top), nameVisible:name.top>=0 && name.bottom<=innerHeight,
        bgScroll:bg.scrollHeight-bg.clientHeight, modalScroll:m.scrollHeight-m.clientHeight,
        inputFont:getComputedStyle(document.getElementById('f_addr')).fontSize,
        inputH:Math.round(document.getElementById('f_addr').getBoundingClientRect().height/Z)};
    })));
    await p.close();
  }
  await b.close();
})();
