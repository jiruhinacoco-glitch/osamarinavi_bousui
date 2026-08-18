const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:1280,height:860}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('サンプル形状')); if(b)b.click(); });
  await p.waitForTimeout(600);
  const r = await p.evaluate(()=>{
    const noop=function(){};
    const obj=()=>({position:{set(x,y,z){this._p=[x,y,z];},y:0},rotation:{y:0}});
    window.__added=[]; window.__grid=0;
    window.THREE={ Vector2:function(x,y){this.x=x;this.y=y;}, Shape:function(pts){this.pts=pts;this.holes=[];},
      Path:function(pts){this.pts=pts;}, ExtrudeGeometry:function(sh,o){this.kind='ex';this.shape=sh;this.depth=o.depth;this.rotateX=noop;},
      ShapeGeometry:function(){this.kind='sg';this.rotateX=noop;}, PlaneGeometry:function(){this.kind='pl';},
      BoxGeometry:function(a,b,c){this.kind='box';this.dims=[a,b,c];},
      Mesh:function(g,m){const o=obj();o.geometry=g;return o;}, MeshLambertMaterial:function(){}, MeshBasicMaterial:function(){},
      Group:function(){const g={children:[],add(c){g.children.push(c);},remove(c){g.children.splice(g.children.indexOf(c),1);}};window.__g=g;return g;},
      Scene:function(){return{add:function(o){window.__added.push(o&&o.__isGrid?'grid':'other');},background:null};},
      Color:function(c){this.c=c;}, HemisphereLight:function(){return{};},
      DirectionalLight:function(){return{position:{set:noop}};},
      PerspectiveCamera:function(){return{aspect:1,updateProjectionMatrix:noop,position:{set:noop},lookAt:noop};},
      GridHelper:function(){ window.__grid++; return {__isGrid:true, position:{y:0}}; },
      WebGLRenderer:function(){return{domElement:document.createElement('canvas'),setPixelRatio:noop,setSize:noop,render:noop};},
      DoubleSide:2 };
    T=null; init3D(); dirty3d=true; build3D();
    return { gridMade:window.__grid, gridAdded:window.__added.filter(x=>x==='grid').length,
             parts:(window.__g&&window.__g.children.length)||0 };
  });
  ok('3Dの地面の網が作られない', r.gridMade===0, 'GridHelper '+r.gridMade+'個');
  ok('3Dの地面の網が置かれない', r.gridAdded===0);
  ok('建物はちゃんと描かれる', r.parts>10, '部品 '+r.parts+'個');
  // 図面タブのマスは今までどおり
  const g = await p.evaluate(()=>({on:nnGridOn(), btn:!!document.getElementById('tl_grid')}));
  ok('図面のマスは今までどおり使える', g.on===true && g.btn);
  console.log(R.join('\n'));
  console.log(errs.length?'JSエラー:\n'+errs.join('\n'):'JSエラーなし');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
