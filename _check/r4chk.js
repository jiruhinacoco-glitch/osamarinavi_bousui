const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));

  // ---- ①②：図面・積算 ----
  const p = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('zumen: '+e.message));
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  ok('②ボタンが「ダークモード」', (await p.evaluate(()=>document.getElementById('tl_theme').textContent)).includes('ダークモード'));
  await p.evaluate(()=>nnSetTheme('dark')); await p.waitForTimeout(300);
  ok('②切り替えると「通常モード」', (await p.evaluate(()=>document.getElementById('tl_theme').textContent)).includes('通常モード'));
  await p.evaluate(()=>nnSetTheme('light'));
  // 中抜きの既定＝パラペット
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('サンプル形状')); if(b)b.click(); });
  await p.waitForTimeout(700);
  const hole = await p.evaluate(()=>{
    // 屋根①の中に中抜きを作る
    state.active=0; setTool('hole');
    const lv0=state.polys[0].lv;
    const p0=state.polys[0].pts, cx=p0.reduce((s,q)=>s+q.x,0)/p0.length, cy=p0.reduce((s,q)=>s+q.y,0)/p0.length;
    drawPts=[{x:cx-1,y:cy-1},{x:cx+1,y:cy-1},{x:cx+1,y:cy+1},{x:cx-1,y:cy+1}];
    closeHole();
    const h=state.polys[0].holes[state.polys[0].holes.length-1];
    return { n:h.pts.length, kinds:[...new Set(h.edges.map(e=>e.k))], h:h.edges[0].h, w:h.edges[0].w, lv:state.polys[0].lv, lv0 };
  });
  ok('②中抜きの縁はパラペット', hole.kinds.length===1&&hole.kinds[0]==='para', JSON.stringify(hole));
  ok('②中抜きしてもGL(lv)は変わらない', hole.lv===hole.lv0, 'GL+'+hole.lv+'（中抜き前 GL+'+hole.lv0+'）');
  // 3Dで2.6mの壁が立たない
  const wall = await p.evaluate(()=>{
    const noop=function(){};
    const obj=()=>({position:{set(x,y,z){this._p=[x,y,z];},y:0},rotation:{y:0}});
    window.__g=[];
    window.THREE={ Vector2:function(x,y){this.x=x;this.y=y;}, Shape:function(pts){this.pts=pts;this.holes=[];},
      Path:function(pts){this.pts=pts;}, ExtrudeGeometry:function(sh,o){this.kind='ex';this.shape=sh;this.depth=o.depth;this.rotateX=noop;},
      ShapeGeometry:function(sh){this.kind='sg';this.rotateX=noop;}, PlaneGeometry:function(){this.kind='pl';},
      BoxGeometry:function(a,b,c){this.kind='box';this.dims=[a,b,c];},
      Mesh:function(g,m){const o=obj();o.geometry=g;return o;}, MeshLambertMaterial:function(){}, MeshBasicMaterial:function(){},
      Group:function(){const g={children:[],add(c){g.children.push(c);},remove(c){g.children.splice(g.children.indexOf(c),1);}};window.__g.push(g);return g;},
      Scene:function(){return{add:noop,background:null};}, Color:function(){}, HemisphereLight:function(){return{};},
      DirectionalLight:function(){return{position:{set:noop}};},
      PerspectiveCamera:function(){return{aspect:1,updateProjectionMatrix:noop,position:{set:noop},lookAt:noop};},
      GridHelper:function(){return{position:{y:0}};},
      WebGLRenderer:function(){return{domElement:document.createElement('canvas'),setPixelRatio:noop,setSize:noop,render:noop};},
      DoubleSide:2 };
    /* 穴の縁を「壁当り」に変えても、上の階と接していなければ高い壁は立たない */
    const h=state.polys[0].holes[state.polys[0].holes.length-1];
    h.edges.forEach(e=>e.k='kabe');
    dirty3d=true; build3D();
    const g=window.__g[window.__g.length-1];
    const before=g.children.filter(c=>c.geometry&&c.geometry.kind==='ex'&&c.geometry.depth>1.5).length;
    // 穴を消して比べる（差＝穴由来の高い壁）
    const keep=state.polys[0].holes.pop();
    dirty3d=true; build3D();
    const g2=window.__g[window.__g.length-1];
    const after=g2.children.filter(c=>c.geometry&&c.geometry.kind==='ex'&&c.geometry.depth>1.5).length;
    state.polys[0].holes.push(keep);
    return before-after;
  });
  ok('②3Dで穴のまわりに高い壁が立たない', wall===0, '穴由来の高い壁 '+wall+'枚');
  // ①スケールバーが平面図に無い
  const svg = await p.evaluate(()=>new Promise(res=>{
    const orig=window.open;
    window.open=function(){ return { document:{ write(h){ res(h); }, close(){} }, focus(){} }; };
    try{ nnPlanPDF(); }catch(e){ res('ERR '+e.message); }
    setTimeout(()=>res('TIMEOUT'),3000);
  }));
  ok('①スケールバーが消えた', !/>(\d+(\.\d+)?)m<\/text>/.test(svg.split('数 量 表')[0].split('凡 例')[1]||''), '凡例の下に「◯m」の目盛りが無い');
  if(errs.length) ok('図面：JSエラー', false, errs.join('|'));
  await p.close();

  // ---- ③現場マップ：2Dマーカーが画像対応 ----
  const p2 = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  await p2.addInitScript(()=>{ localStorage.setItem('osamari_gmaps_key','DUMMY'); });
  await p2.route('**maps.googleapis.com**', r=>r.fulfill({status:200, contentType:'application/javascript', body:'window.google={maps:{importLibrary:()=>Promise.resolve({}),Map:function(){},LatLng:function(){}}};'}));
  await p2.goto('http://localhost:8899/genba_map_v36.html',{waitUntil:'load'}); await p2.waitForTimeout(900);
  const dot = await p2.evaluate(()=>{
    const el=dotContent({st:'work',name:'x'});
    return { cls:el.className, hasImgHook:!!el.querySelector||true, src:(el.__im||'') };
  });
  ok('③2Dマーカーの入れ物ができる', dot.cls==='mkd');
  const css = await p2.evaluate(()=>!!document.getElementById('nn-pinimg'));
  ok('③自作アイコン用のCSSが入っている', css);
  await p2.close();

  // ---- ④ライブラリ ----
  const p3 = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  const e3=[]; p3.on('pageerror',e=>e3.push('lib: '+e.message));
  await p3.goto('http://localhost:8899/library.html',{waitUntil:'load'}); await p3.waitForTimeout(900);
  const lib = await p3.evaluate(()=>{
    const bar=document.getElementById('nnLibBar').getBoundingClientRect();
    const box=document.querySelector('#nnLibBar .box').getBoundingClientRect();
    const chips=[...document.querySelectorAll('#lchips .lfil>button')].map(b=>b.textContent.trim());
    const cnt=document.getElementById('nnLibCount').textContent;
    /* 同じ行か＝各要素の「中心のy」がほぼ同じか（高さが違うので top では判定できない） */
    const mids=[...document.querySelectorAll('#nnLibBar .box, #lchips .lfil>button, #nnLibCount')]
      .map(el=>{const b=el.getBoundingClientRect(); return Math.round((b.top+b.bottom)/2);});
    const rows=(Math.max(...mids)-Math.min(...mids))<=3?1:2;
    return { barH:+bar.height.toFixed(0), boxW:+box.width.toFixed(0), chips, cnt, rows,
             oldSel:getComputedStyle(document.querySelector('.filterbar')).display };
  });
  ok('④検索欄が短い（260px前後）', lib.boxW<=300, lib.boxW+'px');
  ok('④チップが3種＋並び', lib.chips.length>=4, lib.chips.join('/'));
  ok('④「すべて」の文言が無い', !lib.chips.join('').includes('すべて'), lib.chips.join('/'));
  ok('④件数が右に出る', /件 \/ 全/.test(lib.cnt.replace(/\s+/g,' ')), lib.cnt);
  ok('④全部が同じ行', lib.rows===1, lib.rows+'段');
  ok('④旧プルダウンは非表示', lib.oldSel==='none');
  // チップを開いてチェック
  await p3.dispatchEvent('#lchips .lfil[data-k="kou"] button','pointerdown'); await p3.waitForTimeout(350);
  const menu = await p3.evaluate(()=>{
    const p=document.getElementById('nnLibPortal');
    return { open:p&&p.classList.contains('open'), rows:p?p.querySelectorAll('label.dfrow').length:0,
             cnts:p?[...p.querySelectorAll('.vc')].map(x=>x.textContent).slice(0,3):[] };
  });
  ok('④メニューが開く（件数つき）', menu.open&&menu.rows>=3, menu.rows+'行 '+menu.cnts.join(','));
  const before = await p3.evaluate(()=>document.querySelectorAll('.lrow').length);
  await p3.evaluate(()=>{ const l=[...document.querySelectorAll('#nnLibPortal label.dfrow')][0]; l.querySelector('input').click(); });
  await p3.waitForTimeout(400);
  const after = await p3.evaluate(()=>({rows:document.querySelectorAll('.lrow').length,
    cnt:document.getElementById('nnLibCount').textContent, on:!!document.querySelector('#lchips .lfil[data-k="kou"] button.on')}));
  ok('④チェックで絞り込める', after.rows<before && after.on, before+'→'+after.rows+'件 '+after.cnt);
  await p3.evaluate(()=>nnLibClearAll()); await p3.waitForTimeout(400);
  ok('④解除で元に戻る', (await p3.evaluate(()=>document.querySelectorAll('.lrow').length))===before);
  await p3.screenshot({path:'r4_lib.png'});
  if(e3.length) ok('ライブラリ：JSエラー', false, e3.join('|'));
  await p3.close();

  console.log(R.join('\n'));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
