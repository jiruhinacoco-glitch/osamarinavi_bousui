const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const v of [[1999,990],[1600,900],[1366,768]]){
    const p=await (await b.newContext({viewport:{width:v[0],height:v[1]}})).newPage();
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1800);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
    console.log(v[0]+'x'+v[1], JSON.stringify(await p.evaluate(()=>{
      const tb=document.querySelector('.toolbar')||document.querySelector('#toolbar');
      const cs=tb?getComputedStyle(tb):null; const r=tb?tb.getBoundingClientRect():null;
      const card=document.querySelector('#list .pcard').getBoundingClientRect();
      const Z=window.nnPZ||1;
      return {tb:!!tb, disp:cs&&cs.display, vis:cs&&cs.visibility,
        rect:r?{t:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width)}:null,
        chips:document.querySelectorAll('#chips .dfil').length,
        q:!!document.getElementById('q'), Z:+Z.toFixed(2),
        cardH:Math.round(card.height/Z)};
    })));
    await p.close();
  }
  await b.close();
})();
