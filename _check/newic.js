/* 新しい設定・用語集アイコンの見え方と大きさ */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const mode of ['pc','phone']){
    console.log('\n===== '+mode+' =====');
    const ctx = mode==='pc' ? await b.newContext({viewport:{width:1600,height:900}})
      : await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    if(mode==='phone') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('file:///home/user/osamarinavi_bousui/index.html'); await p.waitForTimeout(900);
    const r=await p.evaluate(()=>{
      const o={};
      document.querySelectorAll('.qbtn').forEach(bt=>{
        const k=bt.querySelector('.lbl').textContent.trim();
        const im=bt.querySelector('img'); const w=bt.querySelector('.icwrap');
        const wb=w.getBoundingClientRect(), ib=im.getBoundingClientRect();
        o[k]={src:im.getAttribute('src'), ok:im.naturalWidth>0, nat:[im.naturalWidth,im.naturalHeight],
          tile:[Math.round(wb.width),Math.round(wb.height)], img:[Math.round(ib.width),Math.round(ib.height)],
          inside: ib.top>=wb.top-0.6 && ib.bottom<=wb.bottom+0.6 && ib.left>=wb.left-0.6 && ib.right<=wb.right+0.6};
      });
      const q=document.querySelector('.quick').getBoundingClientRect();
      o._right=Math.round(q.right); o._win=innerWidth;
      return o;
    });
    for(const k of ['設定','用語集']){
      const d=r[k];
      ok(d.ok, k+'：絵が読める', d.nat.join('x'));
      ok(/\?v=/.test(d.src), k+'：版名つきURL（古い絵が残らない）', d.src);
      /* ★2026-08-24y 白いタイル（背景・角丸・影）は §135（2026-08-18b）で本人の指示により削除。
         いまは絵だけなので、決め打ちの大きさではなく「まわりが崩れていないか」で見る。 */
      ok(d.tile[0]>=60 && d.tile[0]<=80 && d.tile[1]>=30 && d.tile[1]<=46,
         k+'：絵の入る枠が想定の大きさ', d.tile.join('x'));
      ok(d.inside, k+'：絵がタイルに収まって切れていない', d.img.join('x'));
    }
    ok(r._right<=r._win, '画面から はみ出していない', r._right+' ≦ '+r._win);
    ok(errs.length===0,'JSエラーなし',errs.join(' / '));
    await p.evaluate(()=>{document.querySelector('.quick').style.zoom=6;}); await p.waitForTimeout(250);
    await (await p.$('.quick')).screenshot({path:'newic_'+mode+'.png'});
    await ctx.close();
  }
  await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');
})();
