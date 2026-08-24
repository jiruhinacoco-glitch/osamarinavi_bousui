try{ require('./mkbefore')(); }catch(_){}   /* ★変更前のファイル _before.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  for(const [file,name] of [['__before.html','前（r128・Lambert）'],['zumen_sekisan.html','後（r159・PBR＋影）']]){
    const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});
      window.__n=0; const raf=window.requestAnimationFrame;});
    await p.goto('http://localhost:8899/'+file,{waitUntil:'load'}); await p.waitForTimeout(1400);
    /* ★2026-08-24y 入口メニュー（§151）が作図面にかぶさるので閉じてから始める */
    await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    await p.evaluate(()=>loadSample()); await p.waitForTimeout(500);
    await p.evaluate(()=>setTab('d3'));
    await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
    await p.waitForTimeout(1500);
    // ① 何も触っていないとき、実際に描いている回数
    const idle=await p.evaluate(()=>new Promise(res=>{
      let n=0; const o=T.renderer.render.bind(T.renderer);
      T.renderer.render=function(a,c){ n++; return o(a,c); };
      setTimeout(()=>{ T.renderer.render=o; res(n); },1000);}));
    // ② 指で回している間のなめらかさ
    const move=await p.evaluate(()=>new Promise(res=>{ let n=0,s=performance.now();
      (function f(){ T.theta+=0.02; n++; if(n<60) requestAnimationFrame(f);
        else res(Math.round(60000/(performance.now()-s))); })();}));
    console.log(name.padEnd(24),'止めている間の描画', String(idle).padStart(3)+'回/秒   回している間', String(move).padStart(3)+'コマ/秒');
    await p.close();
  }
  await b.close();
})();
