const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const W of [1366,1920,2560]){
    const p=await b.newPage({viewport:{width:W,height:1000}});
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
    const z=await p.evaluate(()=>window.nnPZ||1);
    // 押せるものを集めて、その見た目の中心に本物のクリックを送り、受け手が一致するか見る
    const targets=await p.evaluate(()=>{
      const sel='#dashboard .stchip, #dashboard .dfil, #dashboard .kgb .kcell, #dashboard .cta, #dashboard .zx, #dashboard .colgear, #dashboard .sortbtn, #dashboard .httl';
      return [...document.querySelectorAll(sel)].slice(0,60).map((e,i)=>{
        e.setAttribute('data-hitid',i); const r=e.getBoundingClientRect();
        return {i, x:r.x+r.width/2, y:r.y+r.height/2, w:r.width, h:r.height,
                t:(e.textContent||'').trim().slice(0,10), tag:e.tagName+'.'+(e.className+'').split(' ')[0]};
      }).filter(o=>o.w>4&&o.h>4&&o.y>0&&o.y<960);
    });
    await p.evaluate(()=>{ window.__got=[]; document.addEventListener('click',ev=>{
      const el=ev.target.closest('[data-hitid]');
      window.__got.push(el?+el.getAttribute('data-hitid'):-1); },true); });
    let bad=0, tested=0;
    for(const t of targets){
      await p.mouse.click(t.x,t.y); tested++;
    }
    await p.waitForTimeout(200);
    const got=await p.evaluate(()=>window.__got);
    const mism=[];
    targets.forEach((t,k)=>{ if(got[k]!==t.i) mism.push(`${t.tag}「${t.t}」→ 受けたのは ${got[k]}`); });
    console.log(`幅${W} zoom=${z}  ${tested}か所クリック → 一致しない ${mism.length}件`);
    mism.slice(0,6).forEach(m=>console.log('   ',m));
    await p.close();
  }
  await b.close();
})();
