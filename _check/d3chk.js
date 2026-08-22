const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:1100,height:760}});
  const errs=[],warns=[];
  p.on('pageerror',e=>errs.push(e.message));
  /* icon_zumen.png は未着（絵文字📐に自動で戻る仕様）なので除外する */
  /* ★icon_zumen.png と ツールバーの btn_*.png は未着。無ければ文字に戻る作りなので404は正常 */
  p.on('response',r=>{ if(r.status()>=400 && !/icon_zumen\.png|\/icons\/btn_/.test(r.url())) warns.push(r.status()+' '+r.url()); });
  const net=[]; p.on('request',r=>{ if(/three/i.test(r.url())) net.push(r.url()); });
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1800);

  ok('ページを開いた時点では three.js を読まない', net.length===0, JSON.stringify(net));
  ok('外部CDNを見に行かない', !net.some(u=>/^https?:\/\/(?!localhost)/.test(u)), JSON.stringify(net));

  // サンプル形状を入れて 3D タブへ
  await p.evaluate(()=>{ if(window.loadSample) loadSample(); else if(window.sampleShape) sampleShape(); });
  await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForTimeout(2500);

  ok('3Dタブで同梱版を読む', net.some(u=>/vendor\/three\.min\.js/.test(u)), JSON.stringify(net.map(u=>u.split('/').pop())));

  const d=await p.evaluate(()=>{
    if(typeof THREE==='undefined') return {no:'THREEなし'};
    const r=T&&T.renderer, sc=T&&T.scene;
    const kinds={}; let cast=0,recv=0,meshes=0;
    sc&&sc.traverse(o=>{ if(o.isMesh){ meshes++; kinds[o.material.type]=(kinds[o.material.type]||0)+1;
      if(o.castShadow)cast++; if(o.receiveShadow)recv++; } });
    const rough=[],metal=[];
    T.group.traverse(o=>{ if(o.isMesh&&o.material.roughness!==undefined){
      rough.push(+o.material.roughness.toFixed(2)); metal.push(+o.material.metalness.toFixed(2)); } });
    return {rev:THREE.REVISION, meshes, kinds, cast, recv,
      pr:r.getPixelRatio(), dpr:window.devicePixelRatio,
      tone:r.toneMapping, cs:r.outputColorSpace, shadow:r.shadowMap.enabled,
      env:!!sc.environment, envI:sc.environmentIntensity,
      sunShadow:!!(T.sun&&T.sun.castShadow), sc:T.sun?[T.sun.shadow.camera.right.toFixed(1),T.sun.shadow.camera.far.toFixed(1)]:null,
      roughSet:[...new Set(rough)].sort(), metalSet:[...new Set(metal)].sort()};
  });
  console.log(JSON.stringify(d,null,1));
  ok('three.js は r159（同梱）', String(d.rev)==='159', 'r'+d.rev);
  ok('立体が組み上がっている', d.meshes>10, d.meshes+'個');
  ok('材質はすべてPBR（Lambertが残っていない）', !d.kinds.MeshLambertMaterial && d.kinds.MeshStandardMaterial>0, JSON.stringify(d.kinds));
  ok('ざらつきを部材ごとに変えている', d.roughSet.length>=3, JSON.stringify(d.roughSet));
  ok('金属（アルミ笠木）がある', d.metalSet.some(v=>v>0.5), JSON.stringify(d.metalSet));
  ok('影が有効', d.shadow && d.sunShadow && d.cast>0 && d.recv>0, '落とす'+d.cast+'／受ける'+d.recv);
  ok('影の範囲を建物に合わせている', d.sc && +d.sc[0]>0 && +d.sc[1]>0, JSON.stringify(d.sc));
  ok('空の光（環境）がある', d.env, '強さ'+d.envI);
  ok('明るさの階調調整（ACES）', d.tone===4, 'toneMapping='+d.tone);
  ok('色の扱いがsRGB', d.cs==='srgb', d.cs);
  ok('画素密度は2倍まで', d.pr<=2, d.pr+'（端末は'+d.dpr+'）');

  // ダークモード
  await p.evaluate(()=>nnSetTheme('dark')); await p.waitForTimeout(900);
  const dk=await p.evaluate(()=>({bg:T.scene.background.getHexString(), envI:T.scene.environmentIntensity, sun:T.sun.intensity}));
  ok('ダークモードで背景も光も変わる', dk.bg==='0d161d' && dk.envI<1 && dk.sun<2, JSON.stringify(dk));
  await p.evaluate(()=>nnSetTheme('light')); await p.waitForTimeout(900);

  // 画面が実際に描かれているか（真っ白・真っ黒でない）
  await p.screenshot({path:'d3_after.png',clip:{x:0,y:120,width:1100,height:600}});
  const px=require('child_process').execSync('python3 -c "'+
    'from PIL import Image;import numpy as np;a=np.array(Image.open(\'d3_after.png\').convert(\'RGB\')).reshape(-1,3);'+
    'print(len(set(map(tuple,a[::37]))))"').toString().trim();
  ok('絵が描かれている（色数が十分）', +px>60, px+'色');
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  ok('コンソールのエラーなし', warns.length===0, warns.slice(0,2).join(' / '));
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
