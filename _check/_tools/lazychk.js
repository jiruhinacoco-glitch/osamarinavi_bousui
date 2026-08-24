const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
  const before=await p.evaluate(()=>[...document.querySelectorAll('#list .pcard .pph img')].filter(i=>i.naturalWidth>0).length);
  await p.evaluate(()=>{ const l=document.getElementById('list'); l.scrollTop=l.scrollHeight/2; });
  await p.waitForTimeout(900);
  const mid=await p.evaluate(()=>{
    const l=document.getElementById('list');
    const vis=[...document.querySelectorAll('#list .pcard')].filter(c=>{
      const r=c.getBoundingClientRect(), lr=l.getBoundingClientRect();
      return r.bottom>lr.top && r.top<lr.bottom;});
    return {visible:vis.length, loaded:vis.filter(c=>{const i=c.querySelector('.pph img'); return i&&i.naturalWidth>0;}).length,
      total:[...document.querySelectorAll('#list .pcard .pph img')].filter(i=>i.naturalWidth>0).length};
  });
  console.log('最初に読めていた枚数', before, '／ 真ん中へスクロール後', JSON.stringify(mid));
  await b.close();
})();
