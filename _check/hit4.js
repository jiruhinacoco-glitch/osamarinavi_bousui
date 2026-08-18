const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1920,height:1000}});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  // 現場一覧：行をクリックして、選ばれた行が同じか
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{
    const rows=[...document.querySelectorAll('#list .card, #list .prow, .pcard')].slice(0,8);
    if(!rows.length) return {no:'行が見つからない', cls:[...document.querySelectorAll('#list *')].slice(0,6).map(e=>e.className)};
    const out=[];
    for(let i=0;i<rows.length;i++){
      const e=rows[i], b=e.getBoundingClientRect();
      const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
      out.push({i, same: hit===e||e.contains(hit), hitCls:(hit&&hit.className+'')||'', top:Math.round(b.top)});
    }
    return {n:rows.length, out};
  });
  console.log('現場一覧:',JSON.stringify(r).slice(0,700));
  await b.close();
})();
