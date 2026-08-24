/* 10ページがよこ向き＋通常たてで開けて、JSエラーが無いか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGES=['kirokucho_demo','hacchu','camera','library','yougo','kokkosho','shiyo_toroku','zairyo_toroku','zumen_sekisan','genba_map_v36','index'];
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  let bad=0;
  for(const f of PAGES){
    for(const v of [[852,393],[393,852]]){
      const ctx=await b.newContext({viewport:{width:v[0],height:v[1]},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
      const p=await ctx.newPage();
      const errs=[]; p.on('pageerror',e=>errs.push(e.message));
      try{
        await p.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load',timeout:20000});
        await p.waitForTimeout(1200);
        /* ★2026-08-24r 「中身の幅」ではなく「実際に横へ動かせるか」で見る。
           画面の外に隠してある引き出し（transform で外へ出したパネル）は
           中身の幅としては数えられるが、横へ動かせなければ利用者には影響しない。
           動かせてしまうと、作図中に指を横へ払っただけで画面がずれる（それが不具合）。 */
        const over=await p.evaluate(async()=>{
          const b0=window.scrollX; window.scrollTo(9999,0);
          await new Promise(s=>setTimeout(s,220));
          const d=window.scrollX-b0; window.scrollTo(0,0); return Math.max(0,d);
        });
        if(errs.length||over>2){ bad++; console.log('★NG', f, v.join('x'), 'over='+over, errs.slice(0,1).join('')); }
      }catch(e){ bad++; console.log('★NG', f, v.join('x'), String(e).slice(0,50)); }
      await ctx.close();
    }
  }
  console.log(bad===0?'全ページ○（横はみ出し0・JSエラーなし）':'NG '+bad+'件');
  await b.close();
})();
