/* ★2026-08-27e コンクリートの質感を「本物の写真」にした（§225）の検証
   ・3Dタブを開くまで写真を読まない（ページを開く速さは今までどおり）
   ・読めたら躯体・外壁が写真になる／読めなければ今までの手描きのまま
   ・写真は横長（2:1）なので、世界の上でも 2:1 に貼る（粒が縦につぶれない）
   使い方: node _check/tex1.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const scene=()=>{
  state.scaleM=1;
  state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:14,y:0},{x:14,y:8},{x:0,y:8}],
    edges:[0,1,2,3].map(()=>({h:400,w:250,k:'para'}))}];
  state.active=0; saveState(); renderPolyList(); recalc(); draw();
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

  /* ---- ① 3Dタブを開くまで写真を読まない ---- */
  const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const got=[]; p.on('request',r=>{ if(/textures\/.*\.jpg/.test(r.url())) got.push(r.url()); });
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(scene); await p.waitForTimeout(600);
  ok('①図面をかいた時点では写真を読まない', got.length===0, got.length+'件');
  ok('読み込み前の状態は「まだ」', (await p.evaluate(()=>nnPhotoTexState()))===0);

  /* ---- ② 3Dタブで読み、躯体・外壁に貼られる ---- */
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.renderer; }catch(_){return false;} },null,{timeout:20000});
  await p.waitForFunction(()=>{ try{ return nnPhotoTexState()>=2; }catch(_){ return false; } },null,{timeout:20000});
  /* ★2026-09-02a 屋根の質感（roof_*.jpg）も同じタイミングで読むようになったので、
     「3枚ちょうど」ではなく「コンクリの3枚が入っている」で見る */
  const conc=got.filter(u=>/concrete_/.test(u));
  ok('3Dタブを開いたらコンクリの写真を読む（色・凸凹・つやの3枚）', conc.length===3,
     got.map(u=>u.split('/').pop()).join(','));
  ok('★同じ名前で差し替えても古い絵が使われないよう版名が付く（§66）',
     got.every(u=>/\?v=/.test(u)), got[0]?got[0].split('/').pop():'');

  const m=await p.evaluate(()=>{
    let hit=null, other=null;
    T.group.traverse(o=>{
      if(!o.material||!o.material.map) return;
      const im=o.material.map.image;
      const src=(im&&(im.currentSrc||im.src))||'';
      if(/concrete_color/.test(src) && !hit) hit={
        rep:[o.material.map.repeat.x, o.material.map.repeat.y],
        nrm:!!o.material.normalMap, bump:!!o.material.bumpMap,
        rgh:!!o.material.roughnessMap, rghv:o.material.roughness,
        w:im.naturalWidth, h:im.naturalHeight,
        srgb:o.material.map.colorSpace===THREE.SRGBColorSpace,
        nsrgb:o.material.normalMap? (o.material.normalMap.colorSpace!==THREE.SRGBColorSpace):null,
        wrap:o.material.map.wrapS===THREE.RepeatWrapping};
      if(/canvas|^$/.test(src)===false && !/concrete_color/.test(src) && !other) other=src;
    });
    return {hit, per:(typeof NN_TEX_PER_M!=='undefined')?NN_TEX_PER_M:null};
  });
  ok('躯体・外壁に写真が貼られている', !!m.hit, m.hit?'あり':'なし');
  if(m.hit){
    ok('凸凹（法線マップ）も付く／古い bumpMap は外れる', m.hit.nrm===true && m.hit.bump===false,
       'normal='+m.hit.nrm+' bump='+m.hit.bump);
    ok('つやの具合（roughnessMap）も付き、掛け算の元は 1.0',
       m.hit.rgh===true && Math.abs(m.hit.rghv-1)<1e-6, 'map='+m.hit.rgh+' roughness='+m.hit.rghv);
    /* 1タイルの実寸＝1÷(1mあたりのタイル数×repeat) */
    const tw=1/(m.per*m.hit.rep[0]), th=1/(m.per*m.hit.rep[1]);
    ok('1タイル＝よこ2m・たて1m（写真の 2:1 と同じ形）',
       Math.abs(tw-2)<0.01 && Math.abs(th-1)<0.01, tw.toFixed(2)+'m × '+th.toFixed(2)+'m');
    ok('★写真の縦横比と、貼る四角の縦横比が同じ（粒がつぶれない）',
       Math.abs((m.hit.w/m.hit.h)-(tw/th))<0.02, (m.hit.w+'×'+m.hit.h)+' → '+tw+':'+th);
    ok('色は sRGB・凸凹は sRGBでない（正しい扱い）', m.hit.srgb===true && m.hit.nsrgb===true,
       'color='+m.hit.srgb+' normal='+m.hit.nsrgb);
    ok('くり返して貼れる設定', m.hit.wrap===true);
  }

  /* ---- ③ 見た目が本当に変わっている（画素で比べる） ---- */
  await p.evaluate(()=>{ try{nnRoofFold(true);}catch(_){} T.phi=1.40; T.theta=0.9; T.r*=0.5; T.sig=''; });
  await p.waitForTimeout(1500);
  const shotA=await p.screenshot({clip:{x:300,y:400,width:500,height:300}});
  ok('JSエラーなし（写真あり）', errs.length===0, errs.join(' / '));
  await p.close();

  /* ---- ④ 写真が置いていない・圏外のときは、今までの質感のまま ---- */
  const q=await b.newPage({viewport:{width:1400,height:900}});
  const errs2=[]; q.on('pageerror',e=>errs2.push(e.message));
  /* ★URLに版名（?v=…）が付くので、glob の *.jpg では止められない。正規表現で止める。 */
  await q.route(/\/textures\//, r=>r.abort());
  await q.goto('http://localhost:8899/zumen_sekisan.html'); await q.waitForTimeout(1200);
  await q.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await q.evaluate(scene);
  await q.evaluate(()=>setTab('d3'));
  await q.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.renderer; }catch(_){return false;} },null,{timeout:20000});
  await q.waitForFunction(()=>{ try{ return nnPhotoTexState()===3; }catch(_){ return false; } },null,{timeout:20000})
    .catch(()=>{});
  ok('読めなかったときは「だめだった」の印が立つ', (await q.evaluate(()=>nnPhotoTexState()))===3);
  const still=await q.evaluate(()=>{
    let n=0; T.group.traverse(o=>{ if(o.material&&o.material.map&&o.material.bumpMap) n++; });
    return n;
  });
  ok('今までの手描きの質感のまま（絵は消えない）', still>0, still+'個');
  await q.evaluate(()=>{ try{nnRoofFold(true);}catch(_){} T.phi=1.40; T.theta=0.9; T.r*=0.5; T.sig=''; });
  await q.waitForTimeout(1500);
  const shotB=await q.screenshot({clip:{x:300,y:400,width:500,height:300}});
  ok('JSエラーなし（写真なし）', errs2.length===0, errs2.join(' / '));
  ok('★写真ありとなしで、見た目がはっきり違う', Buffer.compare(shotA,shotB)!==0);
  await q.evaluate(()=>{ state.polys=[]; state.active=-1; saveState(); });
  await q.close();

  console.log(R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
