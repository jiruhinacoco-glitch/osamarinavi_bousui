const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  for(const W of [1366,1920,2560]){
    const p=await b.newPage({viewport:{width:W,height:900}});
    await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1400);
    await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
    await p.evaluate(()=>setTab('d3'));
    await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:20000});
    await p.waitForTimeout(1200);
    const d=await p.evaluate(()=>{
      const el=T.renderer.domElement, r=el.getBoundingClientRect();
      return {zoom:window.nnPZ||1, pr:T.renderer.getPixelRatio(),
        buf:el.width+'x'+el.height,                    /* 実際に描いている画素数 */
        css:Math.round(el.clientWidth)+'x'+Math.round(el.clientHeight),
        disp:Math.round(r.width)+'x'+Math.round(r.height)}; /* 画面に出ている大きさ（倍率後） */
    });
    const rough=(d.buf.split('x')[0]/ (+d.disp.split('x')[0]*window_dpr())).toFixed(2);
    function window_dpr(){return 1;}
    console.log(`幅${W}  zoom=${d.zoom}  描いている画素=${d.buf}  画面に出ている大きさ=${d.disp}  → 1画面画素あたり ${rough} 描画画素 ${rough<0.99?'★粗い':'○'}`);
    await p.close();
  }
  await b.close();
})();
