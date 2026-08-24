const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const r=await p.evaluate(()=>{
    const noop=function(){};
    const obj=()=>({position:{set(x,y,z){this._p=[x,y,z];},y:0},rotation:{y:0}});
    window.__zGroups=[];
    window.THREE={Vector2:function(x,y){this.x=x;this.y=y;},Shape:function(pts){this.pts=pts;this.holes=[];},
      Path:function(pts){this.pts=pts;},ExtrudeGeometry:function(sh,o){this.kind='ex';this.rotateX=noop;},
      ShapeGeometry:function(sh){this.kind='sg';this.rotateX=noop;},PlaneGeometry:function(){this.kind='pl';},
      BoxGeometry:function(a,b2,c){this.kind='box';this.dims=[a,b2,c];},
      Mesh:function(g,m){const o=obj();o.geometry=g;o.material=m;return o;},
      MeshLambertMaterial:function(){},MeshBasicMaterial:function(){},
      Group:function(){const g={children:[],add(c){g.children.push(c);},remove(c){g.children.splice(g.children.indexOf(c),1);}};window.__zGroups.push(g);return g;},
      Scene:function(){return {add:noop,background:null};},Color:function(){},HemisphereLight:function(){return{};},
      DirectionalLight:function(){return{position:{set:noop}};},
      PerspectiveCamera:function(){return{aspect:1,updateProjectionMatrix:noop,position:{set:noop},lookAt:noop};},
      GridHelper:function(){return{position:{y:0}};},
      WebGLRenderer:function(){return{domElement:document.createElement('canvas'),setPixelRatio:noop,setSize:noop,render:noop};},
      DoubleSide:2};
    state.scaleM=1; state.polys=[];
    const pts=[{x:0,y:0},{x:24,y:0},{x:32,y:2},{x:32,y:13},{x:16,y:13},{x:4,y:8},{x:0,y:7}];
    state.polys.push({name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))});
    state.active=0; show3dWari=true; dirty3d=true; build3D();
    const g=window.__zGroups[window.__zGroups.length-1];
    const ptsM=pts.map(q=>({x:q.x,y:q.y}));
    const HD=dirOf(state.polys[0])==='h';
    const seams=g.children.filter(c=>c.geometry&&c.geometry.kind==='box'&&c.geometry.dims&&c.geometry.dims[1]===0.006);
    const shortS=seams.filter(c=>HD?c.geometry.dims[0]===0.03:c.geometry.dims[2]===0.03);
    const out=[];
    shortS.forEach(c=>{
      const [px,,pz]=c.position._p;
      const len=HD?c.geometry.dims[2]:c.geometry.dims[0];
      const y0=pz-len/2, y1=pz+len/2;
      const segs=scanSegsH(ptsM.map(q=>({x:q.y,y:q.x})), [], px);
      const inside=segs.some(sg=>y0>=sg[0]-1e-6 && y1<=sg[1]+1e-6);
      if(!inside) out.push({x:+px.toFixed(3), y0:+y0.toFixed(3), y1:+y1.toFixed(3), segs:segs.map(s2=>[+s2[0].toFixed(3),+s2[1].toFixed(3)])});
    });
    return {HD, n:shortS.length, nout:out.length, out:out.slice(0,6)};
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})();
