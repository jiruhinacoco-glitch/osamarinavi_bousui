const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const v of [[1999,990],[1600,900],[1366,768]]){
    const p=await (await b.newContext({viewport:{width:v[0],height:v[1]}})).newPage();
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1700);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);
    console.log(v[0]+'x'+v[1], JSON.stringify(await p.evaluate(()=>{
      const Z=window.nnPZ||1, R=e=>e.getBoundingClientRect();
      const c=document.querySelector('#list .pcard');
      const psh=R(c.querySelector('.psh')), ph=R(c.querySelector('.pph'));
      const pb=R(c.querySelector('.pprog'));
      return {card:Math.round(R(c).height/Z), r1:Math.round(R(c.querySelector('.r1')).height/Z),
        photo:Math.round(ph.width/Z)+'x'+Math.round(ph.height/Z),
        cell:Math.round(psh.width/Z)+'x'+Math.round(psh.height/Z),
        prog:Math.round(pb.width/Z)+'x'+Math.round(pb.height/Z),
        vis:Math.floor((R(document.getElementById('list')).height/Z)/(R(c).height/Z)*10)/10,
        tb:getComputedStyle(document.getElementById('toolbar')).display};
    })));
    await p.close();
  }
  await b.close();
})();
