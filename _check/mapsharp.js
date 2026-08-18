/* ★2026-08-15h 地図の面が等倍で描かれるか（＝Googleマップ本家と同じ細かさ）
   使い方: node mapsharp.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const W of [1366,1600,2000,2560]){
    const p=await b.newPage({viewport:{width:W,height:1010}});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route('**maps.googleapis.com**', r=>r.abort());
    await p.addInitScript(()=>{ localStorage.setItem('osamari_maps_key','dummy'); });
    await p.goto('http://localhost:8899/genba_map_v36.html'); await p.waitForTimeout(1500);
    const r=await p.evaluate(()=>{
      const m=document.getElementById('map2d'), pa=document.getElementById('map');
      const rm=m.getBoundingClientRect(), rp=pa.getBoundingClientRect();
      const d=document.createElement('div'); d.className='mkd'; m.appendChild(d);
      const rd=d.getBoundingClientRect(); d.remove();
      const x=document.createElement('div'); x.className='mkx';
      x.innerHTML='<div class="mkx-body"><div class="x-nm">あ</div></div>'; m.appendChild(x);
      /* ★.mkx は縦並びの箱なので幅いっぱいに広がる。中身（吹き出し本体）を測る */
      const rx=x.querySelector('.mkx-body').getBoundingClientRect(); x.remove();
      return {Z:window.nnPZ||1,
        fillW:Math.abs(rm.width-rp.width), fillH:Math.abs(rm.height-rp.height),
        ratio:+(rm.width/m.offsetWidth).toFixed(3),
        dot:+rd.width.toFixed(1), balloon:Math.round(rx.width)};
    });
    console.log(W, JSON.stringify(r));
    ok(W+'px：地図の面は等倍で描かれる（1CSSpx＝1画面px）', Math.abs(r.ratio-1)<0.01, '倍率'+r.ratio);
    ok(W+'px：地図の大きさは変わらない（枠いっぱい）', r.fillW<1 && r.fillH<1, '差 '+r.fillW.toFixed(1)+'/'+r.fillH.toFixed(1));
    ok(W+'px：自前のピンは今までと同じ大きさ', Math.abs(r.dot-10*r.Z)<0.6, r.dot+'px（倍率'+r.Z+'）');
    ok(W+'px：吹き出しも今までと同じ大きさ', Math.abs(r.balloon-262*r.Z)<4, r.balloon+'px（倍率'+r.Z+'）');
    ok(W+'px：JSエラーなし', errs.length===0, errs.join(' / '));
    await p.close();
  }
  /* スマホは倍率を掛けていないので、この指定でも見え方は変わらない */
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});
    localStorage.setItem('osamari_maps_key','dummy');});
  const p2=await ctx.newPage();
  await p2.route('**maps.googleapis.com**', r=>r.abort());
  await p2.goto('http://localhost:8899/genba_map_v36.html'); await p2.waitForTimeout(1500);
  const m=await p2.evaluate(()=>{
    const m=document.getElementById('map2d');
    return {zoom:getComputedStyle(m).zoom, Z:window.nnPZ,
      ratio:+(m.getBoundingClientRect().width/m.offsetWidth).toFixed(3)};
  });
  console.log('スマホ', JSON.stringify(m));
  ok('スマホは今までどおり（倍率なし・等倍）', Math.abs(m.ratio-1)<0.01, JSON.stringify(m));
  console.log(R.join('\n'));
  await b.close();
})();
