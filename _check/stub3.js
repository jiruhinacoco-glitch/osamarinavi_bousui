/* ニセTHREE（座標を記録するだけ）— 4本の検証スクリプトで共用する。
   ★2026-08-12 §63のPBR・影・環境光に合わせて作り直した。
     以前の各スクリプト内蔵版は shadowMap 等が無く、init3D で止まっていた。 */
module.exports = function installStub(){
  const noop=function(){};
  const V2=function(x,y){ this.x=x; this.y=y; };
  const vec3=()=>({x:0,y:0,z:0,set:noop,copy:noop,multiplyScalar:noop,toArray:()=>[0,0,0]});
  const col=()=>({set:noop, multiplyScalar:noop, getHex:()=>0});
  const obj=()=>({ position:{set(x,y,z){this._p=[x,y,z];}, x:0, y:0, z:0},
    rotation:{x:0,y:0,z:0}, scale:{set:noop}, castShadow:false, receiveShadow:false,
    renderOrder:0, visible:true, add:noop, traverse:noop,
    updateMatrixWorld:noop, updateMatrix:noop, lookAt:noop, matrixWorld:{elements:[]},
    quaternion:{setFromUnitVectors:noop}, name:'', userData:{} });   /* ★2026-08-23h §159のbodyIdx等を受ける */
  /* ★はみ出しアスの形（nnBeadGeom）は attributes.position を触るので、
       頂点0個の入れ物を持たせておく（形の中身は検証しないので空でよい）。 */
  const emptyAttr=()=>({count:0, getX:()=>0, getY:()=>0, getZ:()=>0, setX:noop, setY:noop, setZ:noop});
  /* ★2026-08-24h 形・材質にも userData を持たせる（使い回しの印 nnShared を受ける） */
  const geo=(kind,extra)=>Object.assign({kind, rotateX:noop, rotateY:noop, rotateZ:noop,
    translate:noop, scale:noop, dispose:noop, computeBoundingBox:noop, boundingBox:null,
    computeVertexNormals:noop, deleteAttribute:noop, userData:{},
    attributes:{position:emptyAttr()}}, extra||{});
  const mat=()=>({color:col(), emissive:col(), emissiveIntensity:1, dispose:noop, userData:{},
    side:0, roughness:1, metalness:0, polygonOffset:false, opacity:1, transparent:false});
  /* ★検証スクリプトによって受け皿の名前が違う（__zGroups / __g）。両方に積む。 */
  window.__zGroups=[]; window.__g=window.__zGroups;
  window.THREE={
    Vector2:V2,
    Vector3:function(x,y,z){ this.x=x||0; this.y=y||0; this.z=z||0;
      this.set=noop; this.copy=noop; this.toArray=()=>[this.x,this.y,this.z]; },
    Shape:function(pts){ this.pts=pts; this.holes=[]; },
    Path:function(pts){ this.pts=pts; },
    ExtrudeGeometry:function(sh,o){ return geo('ex',{shape:sh, depth:(o||{}).depth}); },
    ShapeGeometry:function(sh){ return geo('sg',{shape:sh}); },
    PlaneGeometry:function(w,h){ return geo('pl',{w:w,h:h}); },
    BoxGeometry:function(a,b,c){ return geo('box',{dims:[a,b,c]}); },
    /* ★継目のはみ出しアス＝丸い棒。どちらを向いているかは rotateZ/rotateX で決まるので、
         向き（alongX）を控えておく。検証はこれで x方向／z方向 を見分ける。 */
    CylinderGeometry:function(r1,r2,len){ const g=geo('cyl',{r:r1, len:len, alongX:false});
      g.rotateZ=function(){ g.alongX=true; return g; };
      g.rotateX=function(){ g.alongX=false; return g; }; return g; },
    SphereGeometry:function(r){ return geo('sph',{r:r}); },
    CanvasTexture:function(){ return {wrapS:0,wrapT:0,colorSpace:'',anisotropy:1,
      repeat:{set:noop}, needsUpdate:false, dispose:noop}; },
    RepeatWrapping:1000,
    BufferGeometry:function(){ const g=geo('buf',{}); g.setAttribute=noop; return g; },
    BufferAttribute:function(arr,n){ this.array=arr; this.itemSize=n; },
    Mesh:function(g,m){ const o=obj(); o.geometry=g; o.material=m||mat(); return o; },
    MeshLambertMaterial:function(o){ const m=mat(); m.o=o; return m; },
    MeshBasicMaterial:function(o){ const m=mat(); m.o=o; return m; },
    MeshStandardMaterial:function(o){ const m=mat(); Object.assign(m,o||{}); m.o=o; return m; },
    ShadowMaterial:function(o){ const m=mat(); m.o=o; return m; },
    Group:function(){ const g={children:[], add(c){g.children.push(c);},
      remove(c){const i=g.children.indexOf(c); if(i>=0)g.children.splice(i,1);},
      traverse(f){ f(g); g.children.forEach(f); }};
      window.__zGroups.push(g); return g; },
    Scene:function(){ const s={children:[], add(c){s.children.push(c);}, background:null,
      environment:null, environmentIntensity:1, traverse(f){ s.children.forEach(f); }}; return s; },
    Color:function(c){ const o=col(); o.c=c; o.getHex=()=>c; return o; },
    HemisphereLight:function(){ return obj(); },
    DirectionalLight:function(){ const o=obj();
      o.shadow={mapSize:{set:noop}, bias:0, normalBias:0, autoUpdate:true, needsUpdate:false,
        camera:{left:0,right:0,top:0,bottom:0,near:0,far:0,updateProjectionMatrix:noop}};
      o.target=obj(); return o; },
    PerspectiveCamera:function(){ const o=obj(); o.aspect=1; o.near=0; o.far=0;
      o.updateProjectionMatrix=noop; o.lookAt=noop; return o; },
    PMREMGenerator:function(){ return {fromScene:()=>({texture:{}}), dispose:noop,
      compileEquirectangularShader:noop}; },
    WebGLRenderer:function(){ return { domElement:document.createElement('canvas'),
      setPixelRatio:noop, setSize:noop, render:noop, dispose:noop,
      shadowMap:{enabled:false, type:0, autoUpdate:true, needsUpdate:false},
      outputColorSpace:null, toneMapping:0, toneMappingExposure:1,
      getPixelRatio:()=>1, capabilities:{isWebGL2:true} }; },
    Box3:function(){ this.min={x:0,y:0,z:0}; this.max={x:0,y:0,z:0};
      this.setFromObject=()=>this; this.getCenter=()=>vec3(); this.getSize=()=>vec3(); },
    DoubleSide:2, FrontSide:0, BackSide:1,
    SRGBColorSpace:'srgb', ACESFilmicToneMapping:4, PCFSoftShadowMap:2,
  };
};
