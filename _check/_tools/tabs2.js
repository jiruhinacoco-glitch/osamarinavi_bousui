const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const v of [[1600,900],[1999,990]]){
    const p=await (await b.newContext({viewport:{width:v[0],height:v[1]}})).newPage();
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1700);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);
    console.log(v[0], JSON.stringify(await p.evaluate(()=>{
      const Z=window.nnPZ||1, H=e=>Math.round(e.getBoundingClientRect().height/Z);
      const c=document.querySelector('#list .pcard');
      const ex=c.querySelector('.exicon').getBoundingClientRect();
      return {tabs:H(document.getElementById('viewtabs')), card:H(c),
        listTop:Math.round(document.getElementById('list').getBoundingClientRect().top/Z),
        prog:H(c.querySelector('.pprog')), lbl:c.querySelector('.plbl').textContent,
        exicon:Math.round(ex.width/Z)+'x'+Math.round(ex.height/Z),
        exN:document.querySelectorAll('#list .pcard .exicon').length};
    })));
    await p.close();
  }
  await b.close();
})();
