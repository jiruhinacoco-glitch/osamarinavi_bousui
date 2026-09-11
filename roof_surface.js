/* Roof directions and finite visible surfaces. Coordinates in saved arrows are grid units. */
(function(){
'use strict';
const cache=new WeakMap();
window.nnCleanSlope=function(value){
  if(!value||!Array.isArray(value.arrows))return null;
  const arrows=value.arrows.slice(0,8).filter(a=>a&&[a.x,a.z,a.ex,a.ez,a.s].every(Number.isFinite)&&
    Math.hypot(a.ex-a.x,a.ez-a.z)>.01&&a.s>=10&&a.s<=1000).map(a=>({...a}));
  return arrows.length?{mode:value.mode==='ridge'?'ridge':'valley',arrows}:null;
};
window.nnDrawSlopeArrows2D=function(ctx,p,px,py){
  const s=nnCleanSlope(p.slope);if(!s)return;ctx.save();ctx.setLineDash([]);ctx.strokeStyle='#1663b3';ctx.fillStyle='#1663b3';ctx.lineWidth=2;
  s.arrows.forEach(a=>{const x=px(a.x),y=py(a.z),ex=px(a.ex),ey=py(a.ez),L=Math.hypot(ex-x,ey-y);if(L<1)return;const u=(ex-x)/L,v=(ey-y)/L;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-u*10-v*5,ey-v*10+u*5);ctx.lineTo(ex-u*10+v*5,ey-v*10-u*5);ctx.closePath();ctx.fill();
    ctx.font='800 11px sans-serif';ctx.fillText('1/'+a.s,(x+ex)/2+5,(y+ey)/2-8);
  });ctx.restore();
};
function clip(P,L,positive){
  const out=[];
  for(let i=0;i<P.length;i++){
    const a=P[i],b=P[(i+1)%P.length],da=(L[0]*a[0]+L[1]*a[1]+L[2])*(positive?1:-1),db=(L[0]*b[0]+L[1]*b[1]+L[2])*(positive?1:-1);
    if(da>=-1e-9)out.push(a);
    if(da>1e-9&&db< -1e-9||da< -1e-9&&db>1e-9){const t=da/(da-db);out.push(a.map((v,j)=>v+(b[j]-v)*t));}
  }return out;
}
window.nnSlopeField=function(poly){
  const s=nnCleanSlope(poly.slope);if(!s)return null;
  const scale=state.scaleM||.5,key=JSON.stringify([s,poly.pts,poly.lv,scale]),old=cache.get(poly);if(old&&old.key===key)return old.f;
  const planes=s.arrows.map(a=>{
    const dx=a.ex-a.x,dz=a.ez-a.z,len=Math.hypot(dx,dz),nx=-dx/len/a.s,nz=-dz/len/a.s;
    return [nx,nz,-nx*a.ex*scale-nz*a.ez*scale];
  });
  const lines=[];
  for(let i=0;i<planes.length;i++)for(let j=0;j<i;j++){
    const L=planes[i].map((v,k)=>v-planes[j][k]);if(Math.hypot(L[0],L[1])>1e-12)lines.push(L);
  }
  const raw=(x,z)=>(s.mode==='ridge'?Math.min:Math.max)(...planes.map(p=>p[0]*x+p[1]*z+p[2]));
  const P=poly.pts.map(p=>[p.x*scale,p.y*scale]);let samples=P.slice();
  // Extrema of a piecewise affine roof occur at boundary/crease intersections.
  lines.forEach(L=>P.forEach((a,i)=>{const b=P[(i+1)%P.length],da=L[0]*a[0]+L[1]*a[1]+L[2],db=L[0]*b[0]+L[1]*b[1]+L[2];
    if(da*db<0){const t=da/(da-db);samples.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}));
  lines.forEach((a,i)=>lines.slice(0,i).forEach(b=>{const d=a[0]*b[1]-a[1]*b[0];if(Math.abs(d)<1e-12)return;
    const x=(a[1]*b[2]-a[2]*b[1])/d,z=(a[2]*b[0]-a[0]*b[2])/d;
    if(pointInPoly(poly.pts,x/scale,z/scale))samples.push([x,z]);}));
  const low=Math.min(...samples.map(p=>raw(...p))),lv=+poly.lv||0;
  const f=(x,z)=>lv+raw(x,z)-low;
  f.breakLines=lines;f.planes=planes;f.mode=s.mode;f.flat=false;f.rise=Math.max(...samples.map(p=>raw(...p)))-low;
  cache.set(poly,{key,f});return f;
};
/* Subdivide triangles at every crease BEFORE lifting vertices. Keeps UVs, bottom and side faces. */
window.nnSplitSlopeGeometry=function(geometry,field){
  const lines=field&&(field.breakLines||(field.base&&field.base.breakLines));if(!lines||!lines.length)return geometry;
  const model=field.planes?field:field.base;
  const src=geometry.index?geometry.toNonIndexed():geometry,keys=Object.keys(src.attributes),offset={},sizes={};let size=0;
  keys.forEach(k=>{offset[k]=size;sizes[k]=src.attributes[k].itemSize;size+=sizes[k];});
  const data=[];
  for(let i=0;i<src.attributes.position.count;i+=3){
    const tri=[];
    for(let j=0;j<3;j++){const q=[src.attributes.position.getX(i+j),src.attributes.position.getZ(i+j)];
      keys.forEach(k=>{const a=src.attributes[k];for(let n=0;n<a.itemSize;n++)q.push(a.array[(i+j)*a.itemSize+n]);});tri.push(q);}
    // Intersect each active plane's region, avoiding partitions at hidden creases.
    let cells=[];
    model.planes.forEach((plane,pi)=>{
      let P=tri;
      model.planes.forEach((other,oi)=>{if(oi===pi||P.length<3)return;
        const L=plane.map((v,k)=>v-other[k]);
        if(L.every(v=>Math.abs(v)<1e-12)){if(oi<pi)P=[];return;}
        if(P.every(q=>Math.abs(L[0]*q[0]+L[1]*q[1]+L[2])<1e-9)){if(oi<pi)P=[];return;}
        P=clip(P,L,model.mode!=='ridge');
      });if(P.length>=3)cells.push(P);
    });
    cells.forEach(P=>{for(let j=1;j+1<P.length;j++)data.push(P[0],P[j],P[j+1]);});
  }
  const out=new THREE.BufferGeometry();
  keys.forEach(k=>{const a=new Float32Array(data.length*sizes[k]);data.forEach((q,i)=>{for(let j=0;j<sizes[k];j++)a[i*sizes[k]+j]=q[2+offset[k]+j];});out.setAttribute(k,new THREE.BufferAttribute(a,sizes[k]));});
  if(src!==geometry)src.dispose();geometry.dispose();return out;
};
const roofs=new Map(),extras=new Map(),roofObjects=new WeakSet();window.nnSurfaceRevision=0;
window.nnPaintMeshVisible=function(mesh){
  if(!mesh||!mesh.isMesh||(typeof T!=='undefined'&&mesh===T.ground)||mesh.userData.pick||/ghost|pv|pick|lab|helper|bead|seam|slopeTarget/i.test(mesh.name))return false;
  let o=mesh;while(o){if(!o.visible)return false;o=o.parent;}
  const m=mesh.material;return !!m&&!(m.userData&&m.userData.nnBead)&&!(m.transparent&&m.opacity<.1)&&m.depthTest!==false;
};
function facesOf(root,pi,index){
  const out=[];root.updateMatrixWorld(true);
  root.traverse(mesh=>{
    if(!nnPaintMeshVisible(mesh)||!mesh.geometry)return;
    const gm=mesh.geometry,at=gm.attributes.position;if(!at)return;
    const ix=gm.index,groups=new Map(),count=ix?ix.count:at.count;
    for(let i=0;i<count;i+=3){const W=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(at,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      const n=W[1].clone().sub(W[0]).cross(W[2].clone().sub(W[0]));if(n.lengthSq()<1e-16)continue;n.normalize();
      // Negative-determinant extrusions still carry authoritative vertex normals.
      if(gm.attributes.normal){const nn=new THREE.Vector3().fromBufferAttribute(gm.attributes.normal,ix?ix.getX(i):i).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld));if(n.dot(nn)<0)n.negate();}
      if(mesh.userData.polyIdx!=null&&n.y<0)n.negate();
      const d=n.dot(W[0]),key=[n.x,n.y,n.z,d].map(v=>Math.round(v*1e5)).join('/');
      let G=groups.get(key);if(!G){const u=W[1].clone().sub(W[0]).normalize(),v=n.clone().cross(u).normalize();G={p:W[0],u,v,n,tris:[]};groups.set(key,G);}
      G.tris.push(W.map(w=>{const d=w.clone().sub(G.p);return [d.dot(G.u),d.dot(G.v)];}));
    }
    groups.forEach(G=>{
      const pieces=window.nnMergePaintTriangles?nnMergePaintTriangles(G.tris):G.tris;
      pieces.forEach(P=>{const f={p:G.p.toArray(),u:G.u.toArray(),v:G.v.toArray(),n:G.n.toArray(),pts:P,
        id:{pi,ri:-2,ei:index.value++,k:'mesh'},actual:1,sl:0};Object.defineProperty(f,'mesh',{value:mesh});out.push(f);});
    });
  });return out;
}
window.nnCaptureRoofFaces=function(poly,pi,objects){
  objects.forEach(o=>o.traverse(m=>{roofObjects.add(m);m.userData.nnRoofOwner=pi;}));
  const index={value:0};roofs.set(pi,{poly,faces:objects.flatMap(o=>facesOf(o,pi,index))});window.nnSurfaceRevision++;
};
window.nnActualPaintFaces=function(){
  const out=[];roofs.forEach((r,pi)=>{if(state.polys[pi]===r.poly)out.push(...r.faces.filter(f=>nnPaintMeshVisible(f.mesh)));});
  extras.forEach((r,key)=>{let o=r.root,live=false;while(o){if(o===T.scene||o===T.group){live=true;break;}o=o.parent;}if(live)out.push(...r.faces.filter(f=>nnPaintMeshVisible(f.mesh)));else extras.delete(key);});return out;
};
window.nnRegisterPaintHit=function(hit){
  if(!hit||!hit.object||roofObjects.has(hit.object))return;
  let root=hit.object;
  while(root.parent&&root.parent.name!=='nnSolG'&&root.parent!==T.group&&root.parent!==T.scene)root=root.parent;
  if(root===T.group||root===T.scene||root===T.ground)return;
  const key=root.uuid,stamp=[root.geometry&&root.geometry.uuid,root.position.toArray(),root.quaternion.toArray(),root.scale.toArray()].join('/');
  if(extras.get(key)?.stamp===stamp)return;
  root.userData.paintAll=true;
  const owner=100000+root.id;extras.set(key,{root,stamp,faces:facesOf(root,owner,{value:0})});window.nnSurfaceRevision++;
};
})();

/* Remove only the old asphalt bead area covered by a new sheet, before instancing. */
window.nnMaskSheetBeads=function(group){
  if(!window.nnCutOpeningGeometry||!(state.d3sheet||[]).length)return;
  const meshes=[];group.traverse(m=>{if(m.isMesh&&m.material?.userData?.nnBead)meshes.push(m);});
  if(!meshes.length)return;
  for(const sheet of state.d3sheet)for(const saved of sheet.faces||[]){
    const f=window.nnSheetFaceNow?nnSheetFaceNow(saved):saved,V=q=>new THREE.Vector3().fromArray(q);
    const p=V(f.p),u=V(f.u),v=V(f.v),n=V(f.n),rings=[f.pts,...(f.hole?[f.hole]:[])],flat=rings.flat();
    const C=rings.map(P=>P.map(q=>new THREE.Vector2(...q))),tris=THREE.ShapeUtils.triangulateShape(C[0],C.slice(1));
    for(const tri of tris){
      const P=tri.map(i=>flat[i]);if((P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[1][1]-P[0][1])*(P[2][0]-P[0][0])<0)P.reverse();
      const planes=P.map((a,i)=>{const b=P[(i+1)%3],dx=b[0]-a[0],dy=b[1]-a[1];return [dy,-dx,0,dy*a[0]-dx*a[1]];});
      planes.push([0,0,1,Math.max(.001,+sheet.t||.004)+.03],[0,0,-1,.02]);
      for(const m of meshes){m.updateMatrixWorld(true);const old=m.geometry,next=nnCutOpeningGeometry(old,m.matrixWorld,p,u,v,n,1,1,planes);
        if(next!==old){m.geometry=next;if(!old.userData.nnShared)old.dispose();}}
    }
  }
};
