const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const vw of [1366,1600,1920]){
    const p=await (await b.newContext({viewport:{width:vw,height:900}})).newPage();
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1500);
    await p.evaluate(()=>{ showView('list'); }); await p.waitForTimeout(600);
    for(const w of [258,300,320,340]){
      const r=await p.evaluate(cw=>{
        let st=document.getElementById('__t'); if(!st){st=document.createElement('style');st.id='__t';document.head.appendChild(st);}
        st.textContent='html:not([data-nnphone="1"]) #list .pcard .pcol{flex:0 0 '+cw+'px !important;}';
        const c=document.querySelector('#list .pcard'), Z=window.nnPZ||1;
        const r1=c.querySelector('.r1'), ph=c.querySelector('.pph'), col=c.querySelector('.pcol');
        const rows=Math.round(r1.getBoundingClientRect().height/Z/26);
        return {card:+(c.getBoundingClientRect().height/Z).toFixed(0),
          r1h:+(r1.getBoundingClientRect().height/Z).toFixed(0),
          ph:+(ph.getBoundingClientRect().width/Z).toFixed(0)+'x'+ (ph.getBoundingClientRect().height/Z).toFixed(0),
          gap:+((c.getBoundingClientRect().height-col.getBoundingClientRect().height)/Z).toFixed(0)};
      }, w);
      console.log(vw, 'col='+w, JSON.stringify(r));
    }
    await p.close();
  }
  await b.close();
})();
