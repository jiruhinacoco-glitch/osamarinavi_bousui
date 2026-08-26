/* ★2026-08-26b 「ボタンを押してからのラグ」対策（なぞりの光）の検証
   ・タップ（動かさない指）ではキャンバスを作らない・描かない
   　（以前は押した瞬間から画面いっぱいのキャンバスを毎コマ描き直していた）
   ・7px以上なぞったときだけ描く（なぞりの光は今までどおり）
   ・描く画素は等倍（以前は2倍＝4倍の画素）
   ・ナビのタップで今までどおりページが移動する（音まわりの変更で壊れていないか）
   使い方: node _check/trail1.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(900);

  /* --- タップでは何も描かない --- */
  await p.evaluate(()=>{
    const ev=t=>new PointerEvent(t,{pointerId:9,pointerType:'touch',isPrimary:true,
      clientX:200, clientY:400, bubbles:true});
    window.dispatchEvent(ev('pointerdown'));
    window.dispatchEvent(ev('pointerup'));
  });
  await p.waitForTimeout(120);
  ok('タップでは光のキャンバスを作らない（＝描く仕事ゼロ）',
     await p.evaluate(()=>!document.getElementById('nnTrail')));

  /* --- 7px未満のゆれでも描かない --- */
  await p.evaluate(()=>{
    const ev=(t,x)=>new PointerEvent(t,{pointerId:9,pointerType:'touch',isPrimary:true,
      clientX:x, clientY:400, bubbles:true});
    window.dispatchEvent(ev('pointerdown',200));
    window.dispatchEvent(ev('pointermove',203));
    window.dispatchEvent(ev('pointerup',203));
  });
  await p.waitForTimeout(120);
  ok('指のわずかなゆれ（7px未満）でも描かない',
     await p.evaluate(()=>!document.getElementById('nnTrail')));

  /* --- なぞると描く（光はついてくる） --- */
  await p.evaluate(()=>{
    const ev=(t,x)=>new PointerEvent(t,{pointerId:9,pointerType:'touch',isPrimary:true,
      clientX:x, clientY:400, bubbles:true});
    window.dispatchEvent(ev('pointerdown',100));
    for(let x=110;x<=260;x+=15) window.dispatchEvent(ev('pointermove',x));
  });
  await p.waitForTimeout(80);
  const tr=await p.evaluate(()=>{
    const cv=document.getElementById('nnTrail'); if(!cv)return null;
    const r=cv.getBoundingClientRect();
    /* なぞりの途中＝どこかに色が乗っている */
    const ctx=cv.getContext('2d');
    const d=ctx.getImageData(0,0,cv.width,cv.height).data;
    let lit=0; for(let i=3;i<d.length;i+=40) if(d[i]>0)lit++;
    return {w:cv.width, cssW:Math.round(r.width), lit};
  });
  ok('なぞると光がついてくる（キャンバスに描かれている）', !!tr && tr.lit>0, JSON.stringify(tr));
  ok('描く画素は等倍（2倍で4倍の画素を描いていない）', !!tr && tr.w===tr.cssW,
     tr && (tr.w+' / css '+tr.cssW));
  await p.evaluate(()=>{
    window.dispatchEvent(new PointerEvent('pointerup',{pointerId:9,pointerType:'touch',
      isPrimary:true, clientX:260, clientY:400, bubbles:true}));
  });
  await p.waitForTimeout(600);   /* 0.42秒で光が消え、描くのも止まる */
  ok('離すと光が消えて描くのが止まる', await p.evaluate(()=>new Promise(res=>{
    /* rafが止まっていれば、次のコマでキャンバスは透明のまま */
    setTimeout(()=>{ const cv=document.getElementById('nnTrail');
      const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
      let lit=0; for(let i=3;i<d.length;i+=40) if(d[i]>0)lit++;
      res(lit===0); },100);
  })));

  /* --- ナビのタップで今までどおり移動する（音の変更で壊れていないか） --- */
  const ni=await p.$('nav .ni[onclick*="kiroku"]');
  const bb=await ni.boundingBox();
  await p.touchscreen.tap(bb.x+bb.width/2, bb.y+bb.height/2);
  try{ await p.waitForURL('**/kirokucho_demo.html*',{timeout:4000}); ok('ナビのタップで移動する', true); }
  catch(_){ ok('ナビのタップで移動する', false, p.url()); }
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
