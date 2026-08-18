/* PCの表示倍率：モニター幅が違っても見え方が同じか／副作用が無いか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const PAGES=['index.html','kirokucho_demo.html','genba_map_v36.html','zumen_sekisan.html','library.html','kokkosho.html'];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

  /* --- ① モニター幅ごとの倍率と「見た目の大きさ」 --- */
  const sizes=[[1366,768],[1600,900],[1920,1080],[2560,1440]];
  const meas=[];
  for(const [w,h] of sizes){
    const p=await b.newPage({viewport:{width:w,height:h}});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(2200);
    const d=await p.evaluate(()=>{
      const hd=document.querySelector('header').getBoundingClientRect();
      const ht=document.querySelector('.httl');
      const nav=document.querySelector('nav').getBoundingClientRect();
      return {z:window.nnPZ, hdH:+hd.height.toFixed(1), navW:+nav.width.toFixed(1),
        httl:ht?+getComputedStyle(ht).fontSize.replace('px','')*window.nnPZ:null,
        docW:document.documentElement.scrollWidth, innerW:innerWidth,
        docH:document.documentElement.scrollHeight, innerH:innerHeight,
        nnvh:getComputedStyle(document.documentElement).getPropertyValue('--nnvh').trim(),
        pz:!!document.getElementById('nnPz')};
    });
    meas.push([w,h,d]);
    console.log(w+'x'+h, JSON.stringify(d));
    ok(w+'px：横にはみ出さない', d.docW<=d.innerW+1, d.docW+'/'+d.innerW);
    ok(w+'px：たてに余分なスクロールが出ない', d.docH<=d.innerH+2, d.docH+'/'+d.innerH);
    ok(w+'px：倍率ボタンは出さない', d.pz===false);
    ok(w+'px：JSエラーなし', errs.length===0, errs[0]||'');
    await p.close();
  }
  /* 実画面に対する見出しの大きさの割合が、どの幅でもほぼ同じか */
  const ratio=meas.map(([w,h,d])=>d.httl/ (w/100));  /* 画面幅1%あたりの実px */
  console.log('見出しの実サイズ:', meas.map(([w,,d])=>w+'→'+d.httl.toFixed(1)+'px(z='+d.z+')').join(' / '));
  /* 1600px以上のモニターで、画面幅に対する見出しの大きさがそろっているか
     （1366pxは倍率の下限1.0で止めるので対象外＝これ以上小さくできないため） */
  const rr=meas.filter(([w])=>w>=1600).map(([w,,d])=>d.httl/w*1000);
  ok('1600px以上のモニターで見え方がそろう（±5%以内）',
     (Math.max(...rr)-Math.min(...rr))/Math.min(...rr) < 0.05,
     rr.map(x=>x.toFixed(2)).join(' / '));

  /* --- ② 説明文の削除・倍率ボタンが無いこと（見出しの見た目は pwchk.js で確認） --- */
  const p=await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2200);
  const hh=await p.evaluate(()=>({note:!!document.querySelector('.hsnote'), pz:!!document.getElementById('nnPz')}));
  ok('①並び順の説明文が消えている', hh.note===false);
  ok('①倍率ボタンが無い', hh.pz===false);
  await p.close();

  /* --- ③ 他ページも壊れていないか --- */
  for(const f of PAGES){
    const q=await b.newPage({viewport:{width:1920,height:1080}});
    const errs=[]; q.on('pageerror',e=>errs.push(e.message));
    await q.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await q.waitForTimeout(2200);
    const d=await q.evaluate(()=>({z:window.nnPZ,docW:document.documentElement.scrollWidth,innerW:innerWidth,
      docH:document.documentElement.scrollHeight,innerH:innerHeight,
      app:(document.getElementById('app')||{}).offsetHeight||null}));
    ok(f.replace('.html','')+'：倍率がかかる', Math.abs(d.z-1.2)<1e-6, String(d.z));
    ok(f.replace('.html','')+'：横はみ出し0', d.docW<=d.innerW+1, d.docW+'/'+d.innerW);
    ok(f.replace('.html','')+'：JSエラーなし', errs.length===0, errs[0]||'');
    if(f.startsWith('genba')) ok('現場マップの地図の高さが妥当', d.app>600, String(d.app));
    await q.close();
  }

  /* --- ④ スマホは今までどおり倍率なし --- */
  const m=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await m.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await m.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await m.waitForTimeout(2000);
  const md=await m.evaluate(()=>({z:window.nnPZ, zoom:document.documentElement.style.zoom,
     pz:!!document.getElementById('nnPz'),
     nnvh:getComputedStyle(document.documentElement).getPropertyValue('--nnvh').trim(), innerH:innerHeight}));
  ok('スマホ：倍率をかけない', md.z===1 && !md.zoom, JSON.stringify(md));
  ok('スマホ：倍率ボタンを出さない', md.pz===false, String(md.pz));
  ok('スマホ：--nnvh が今までどおり', parseFloat(md.nnvh)>md.innerH*0.9, md.nnvh+' / '+md.innerH);

  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
