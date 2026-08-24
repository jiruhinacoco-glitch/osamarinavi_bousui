const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const W of [1366,1600,2000,2560]){
    const p=await b.newPage({viewport:{width:W,height:900}});
    await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1800);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);
    const d=await p.evaluate(()=>{
      const Z=window.nnPZ||1, g=e=>{const b=e.getBoundingClientRect();return{l:b.left/Z,r:b.right/Z,w:b.width/Z,h:b.height/Z};};
      const cs=[...document.querySelectorAll('#list .pcard')].slice(0,8);
      return cs.map(c=>{const h=c.querySelector('.rhead'),t=c.querySelector('.ebox.ttl');
        const hs=getComputedStyle(h), pad=parseFloat(hs.paddingTop)+parseFloat(hs.paddingBottom);
        const mk=Math.max(...[...h.children].map(e=>g(e).h));
        return {one:(g(h).h-pad)<=mk+3, ttlW:Math.round(g(t).w),
          over:Math.round(Math.max(...[...h.children].map(e=>g(e).r))-g(h).r)};});
    });
    ok(W+'px：現場名の行が1行', d.every(x=>x.one));
    ok(W+'px：はみ出しなし', d.every(x=>x.over<=1), d.map(x=>x.over).join(','));
    ok(W+'px：物件名の幅が確保されている', d.every(x=>x.ttlW>=64), d.map(x=>x.ttlW).join(','));
    await p.close();
  }
  /* その場編集：請負金額（現場名の行）とメモ */
  const p=await b.newPage({viewport:{width:1600,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);
  await p.click('#list .pcard .horder'); await p.waitForTimeout(300);
  ok('請負金額の囲みをタップすると入力欄になる', await p.evaluate(()=>!!document.querySelector('#list .pcard .horder input')));
  await p.evaluate(()=>{const i=document.querySelector('#list .pcard .horder input'); i.value='5000000';
    i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});
  await p.waitForTimeout(500);
  ok('入力した金額が反映される', await p.evaluate(()=>/5,000,000/.test(document.querySelector('#list .pcard .horder').textContent)),
     await p.evaluate(()=>document.querySelector('#list .pcard .horder').textContent));
  await p.click('#list .pcard .pmemo'); await p.waitForTimeout(300);
  ok('メモをタップすると書き込める', await p.evaluate(()=>!!document.querySelector('#list .pcard .pmemo textarea')));
  ok('メモの見出し（メモ）が消えない', await p.evaluate(()=>!!document.querySelector('#list .pcard .pmemo b')));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
