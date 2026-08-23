/* ★2026-08-24m 全11ページ×PC/スマホで「押せるボタンを全部押して」JSエラーを探す（§181）
   node _check/allbuttons.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PAGES=['index.html','kirokucho_demo.html','zumen_sekisan.html','genba_map_v36.html',
 'hacchu.html','kokkosho.html','camera.html','library.html','shiyo_toroku.html','yougo.html','zairyo_toroku.html'];
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of PAGES){
  for(const mode of ['pc','ph']){
    const ctx=await b.newContext(mode==='ph'
      ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
      :{viewport:{width:1600,height:900}});
    if(mode==='ph') await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});
      Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
    const errs=[], warn=[];
    p.on('pageerror',e=>errs.push(String(e.message).slice(0,90)));
    p.on('console',m=>{ if(m.type()==='error'){ const t=m.text();
      if(!/favicon|404|Failed to load resource|net::ERR/.test(t)) warn.push(t.slice(0,90)); }});
    await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}).catch(()=>{});
    await p.waitForTimeout(1800);
    /* 全部のボタンを押してみる（危険なものは除く） */
    await p.evaluate(()=>{
      const skip=/全削除|削除|クリア|リセット|印刷|PDF|書き出|読み込|取り込|保存/;
      const bs=[...document.querySelectorAll('button')].filter(b=>{
        const t=(b.textContent||'')+(b.title||'')+(b.id||'');
        return !skip.test(t) && b.offsetParent!==null; });
      bs.slice(0,60).forEach(b=>{ try{ b.click(); }catch(e){} });
    }).catch(()=>{});
    await p.waitForTimeout(1200);
    if(errs.length||warn.length)
      console.log(f.padEnd(22), mode, 'JSエラー'+errs.length, errs.slice(0,2).join(' | '), warn.slice(0,1).join(''));
    else console.log(f.padEnd(22), mode, 'エラーなし');
    await ctx.close();
  }
}
await b.close();})();
