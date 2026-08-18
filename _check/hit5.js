const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const W of [1920,2560]){
    const p=await b.newPage({viewport:{width:W,height:1000}});
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
    const n=await p.evaluate(()=>document.querySelectorAll('#dashboard .dpanel .zx').length);
    console.log(`--- 幅${W}  拡大ボタン ${n}個`);
    for(let i=0;i<n;i++){
      const info=await p.evaluate(i=>{
        const zs=[...document.querySelectorAll('#dashboard .dpanel .zx')];
        const e=zs[i]; e.scrollIntoView({block:'center'});
        return null;
      },i);
      await p.waitForTimeout(250);
      const box=await p.evaluate(i=>{
        const e=[...document.querySelectorAll('#dashboard .dpanel .zx')][i];
        const r=e.getBoundingClientRect();
        const want=e.closest('.dpanel').querySelector('.httl').textContent.trim().slice(0,10);
        return {x:r.x+r.width/2, y:r.y+r.height/2, want};
      },i);
      await p.mouse.click(box.x,box.y); await p.waitForTimeout(500);
      const got=await p.evaluate(()=>{
        const z=document.getElementById('zoom');
        if(!z||getComputedStyle(z).display==='none') return '(拡大が開かない)';
        const t=z.querySelector('.httl'); return t?t.textContent.trim().slice(0,10):'(見出しなし)';
      });
      const ok = got===box.want;
      console.log(`  ${ok?'○':'★NG'} 押した=「${box.want}」 → 開いた=「${got}」`);
      await p.evaluate(()=>{ const c=document.querySelector('#zoom .zclose,#zoom .close,#zclose'); if(c)c.click(); else if(window.closeZoom)closeZoom(); });
      await p.waitForTimeout(350);
    }
    await p.close();
  }
  await b.close();
})();
