/* 道具：人工情報・追加工事に記録を何件か入れて写しを撮り、字のはみ出しを数える（○／★NGなし）
   使い方: node _check/_tools/kfill.js [写しの置き場] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp';
const DATA=[['人工情報',[['高圧洗浄・下地処理（ケレン）とプライマー塗布','3','3','12000','雨のため午後から'],['シート張り','4','4','','']]],
            ['追加工事',[['ジャンカ補修・パラテックス緊急手配（予定外）','185000','山田','増設ドレンの穴あけ費も含む'],['笠木の交換','52000','佐藤','']]]];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const W of [1366,1900]){ const p=await b.newPage({viewport:{width:W,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1000);
await p.evaluate(()=>{ goProperty(props[0].id); }); await p.waitForTimeout(1500);
for(const [tab,rows] of DATA){
  await p.evaluate(t=>[...document.querySelectorAll('#detail .dmenu button')].find(b=>b.textContent.trim()===t).click(),tab); await p.waitForTimeout(800);
  for(const r of rows){
    const all=await p.$$('#detail input:not([type=date]):not([type=hidden])'); const vis=[];
    for(const e of all){ if(await e.isVisible()&&!(await e.evaluate(x=>!!x.closest('.dhead,.dsrow')))) vis.push(e); }
    /* 文字の欄には文字、数の欄には数だけを入れる（欄の並びは画面ごとに違う） */
    const txt=r.filter(v=>!/^\d+$/.test(v)), num=r.filter(v=>/^\d+$/.test(v)); let ti=0, ni=0;
    for(const e of vis){ const t=await e.getAttribute('type'); if(t==='number'){ if(ni<num.length) await e.fill(num[ni++]); } else { if(ti<txt.length&&txt[ti]) await e.fill(txt[ti]); ti++; } }
    await p.evaluate(()=>{ const b=[...document.querySelectorAll('#detail button')].find(x=>x.textContent.trim()==='追加'&&x.offsetParent); b&&b.click(); }); await p.waitForTimeout(500); }
  const r=await p.evaluate(()=>{ const D=document.getElementById('detail'); const out=[];
    [...D.querySelectorAll('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.offsetParent).forEach(e=>{ const ce=getComputedStyle(e); if(ce.textOverflow==='ellipsis') return;
      if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+3) out.push([e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,20)]);
      let a=e.parentElement; while(a&&a!==D){ const c=getComputedStyle(a); if(/(hidden|clip)/.test(c.overflowX)) break; a=a.parentElement; }
      if(a&&a!==D){ const q=e.getBoundingClientRect(),A=a.getBoundingClientRect(); if(q.right>A.right+3&&q.top<A.bottom&&q.bottom>A.top) out.push(['外',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,20),Math.round(q.right-A.right)]); } });
    return out.slice(0,10);});
  console.log('===',W,tab,'切れ'+r.length,JSON.stringify(r),'エラー',JSON.stringify(errs.splice(0)));
  await p.screenshot({path:OUT+'/kf_'+W+'_'+tab+'.png'}); }
await p.close(); }
await b.close();})();
