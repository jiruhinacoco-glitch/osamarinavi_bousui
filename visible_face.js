/* 面選択は描画済みの三角形から作る。見えない判定箱は使用しない。 */
(function(){
 let revision=-1,group=null,entries=[],byMesh=new WeakMap(),ringCache=new Map();
 const eq=(a,b)=>a&&b&&a.p===b.p&&a.r===b.r&&a.e===b.e&&(a.f||'out')===(b.f||'out');
 function classify(mesh,w,n){
  const pi=mesh.userData.nnRoofOwner,p=state.polys[pi];if(!p)return null;
  if(mesh.userData.polyIdx!=null&&n.y>.5)return {p:pi,r:-1,e:-1,f:'deck'};
  const scale=state.scaleM||.5,candidates=[];let rings=ringCache.get(pi);if(!rings){rings=[{r:-1,pts:p.pts,edges:p.edges},...(p.holes||[]).map((h,r)=>({...h,r}))];rings.forEach(r=>r.joint=nnWallJointCtx(p,r,scale));ringCache.set(pi,rings);}
  for(const ring of rings){
   const jc=ring.joint,N=ring.pts.length;
   ring.pts.forEach((a,i)=>{const b=ring.pts[(i+1)%N],ed=ek(ring.edges[i]),dx=(b.x-a.x)*scale,dz=(b.y-a.y)*scale,L=Math.hypot(dx,dz);if(L<1e-6)return;
    const nr=ringNormal(p,ring.pts,a,b),ux=dx/L,uz=dz/L,x=w.x-a.x*scale,z=w.z-a.y*scale,t=x*ux+z*uz,cross=x*nr.x+z*nr.y,th=nnWallTh(ed),hh=ed.h/1000,top=nnWallLv(p)+hh+(ed.ago&&hh>0?.195:0),along=n.x*ux+n.z*uz,inward=n.x*nr.x+n.z*nr.y;
    if(t< -th-1e-3||t>L+th+1e-3)return;
    function add(f,d){if(d<.035)candidates.push({pk:{p:pi,r:ring.r,e:i,f},d});}
    if(n.y>.98&&hh>0&&cross>=-.015&&cross<=th+.02)add('top',Math.abs(w.y-top-(ed.ago?0:.012)));
    if(Math.abs(n.y)<.02){if(inward<-.99)add('out',Math.abs(cross));if(inward>.99&&hh>0)add('in',Math.abs(cross-th));
     if(Math.abs(along)>.999&&hh>0&&cross>=-.01&&cross<=th+(ed.ago?Math.max(.05,(ed.agoD||100)/1000):0)+.02){const edge=jc.eds[i];if(edge){for(const [f,start] of [['endA',true],['endB',false]]){if((start&&along>0)||(!start&&along<0))continue;const end=jc.jointH(jc.eds[(i+(start?N-1:1))%N],edge,start?edge.a:edge.b,0,start?-1:1);add(f,Math.abs((w.x-end.x)*ux+(w.z-end.y)*uz));}}}
    }
    if(n.y>.1&&n.y<.98&&inward>.1&&hh>0){const ch=ed.ch!=null?Math.max(.002,Math.min(ed.ch/1000,th*.98,hh*.98)):Math.min(.02,th*.25,hh*.25);add('cham',Math.abs(cross+w.y-(th+nnWallLv(p)+hh-ch+.012))/Math.SQRT2);}
   });
  }
  candidates.sort((a,b)=>a.d-b.d||a.pk.r-b.pk.r||a.pk.e-b.pk.e);return candidates[0]?.pk||null;
 }
 function refresh(){if(group===T.group&&revision===window.nnSurfaceRevision)return;group=T.group;revision=window.nnSurfaceRevision;entries=[];byMesh=new WeakMap();ringCache.clear();T.group.updateMatrixWorld(true);
  T.group.traverse(mesh=>{if(!window.nnPaintMeshVisible||!nnPaintMeshVisible(mesh)||mesh.userData.nnRoofOwner==null)return;const g=mesh.geometry,at=g?.attributes.position;if(!at)return;const index=g.index,count=index?index.count:at.count,list=[];
   for(let i=0;i<count;i+=3){const points=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(at,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld)),normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));if(normal.lengthSq()<1e-16)continue;normal.normalize();if(g.attributes.normal){const norm=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,index?index.getX(i):i).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld));if(normal.dot(norm)<0)normal.negate();}if(mesh.userData.polyIdx!=null&&normal.y<0)normal.negate();const mid=points.reduce((s,p)=>s.add(p),new THREE.Vector3()).multiplyScalar(1/3),pick=classify(mesh,mid,normal)||classify(mesh,mid,normal.negate()),item={mesh,points,normal,pick,index:i/3};entries.push(item);list[i/3]=item;
   }byMesh.set(mesh,list);
  });
 }
 window.nnRoofFacePick=function(rc){refresh();const hit=rc.intersectObjects(T.group.children,true).find(h=>nnPaintMeshVisible(h.object));if(!hit)return null;return byMesh.get(hit.object)?.[hit.faceIndex]?.pick||null;};
 window.nnRoofFaceGeometry=function(pk){refresh();let tris=entries.filter(e=>eq(e.pick,pk));if(pk.f==='top'&&tris.length){const y=Math.max(...tris.map(t=>t.points[0].y));tris=tris.filter(t=>Math.abs(t.points[0].y-y)<1e-5);}if(!tris.length)return null;const coords=[],planes=new Map();for(const t of tris){const n=t.normal,d=n.dot(t.points[0]),key=[n.x,n.y,n.z,d].map(x=>Math.round(x*1e5)).join('/');let plane=planes.get(key);if(!plane){const p=t.points[0],u=t.points[1].clone().sub(p).normalize(),v=n.clone().cross(u);plane={p,u,v,n,tris:[]};planes.set(key,plane);}plane.tris.push(t.points.map(w=>{const d=w.clone().sub(plane.p);return [d.dot(plane.u),d.dot(plane.v)];}));}
  for(const plane of planes.values()){const polygons=window.nnMergePaintTriangles?nnMergePaintTriangles(plane.tris):plane.tris;for(const polygon of polygons){const ring=polygon.map(q=>new THREE.Vector2(q[0],q[1])),ix=THREE.ShapeUtils.triangulateShape(ring,[]);for(const tri of ix)for(const i of tri){const q=polygon[i],p=plane.p.clone().addScaledVector(plane.u,q[0]).addScaledVector(plane.v,q[1]).addScaledVector(plane.n,.001);coords.push(p.x,p.y,p.z);}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));g.computeVertexNormals();return g;};
 window.nnRoofFaceEdges=function(g){const at=g.attributes.position,ix=g.index,points=[],edges=[];for(let i=0;i<(ix?ix.count:at.count);i++)points.push(new THREE.Vector3().fromBufferAttribute(at,ix?ix.getX(i):i));for(let i=0;i<points.length;i+=3){const n=points[i+1].clone().sub(points[i]).cross(points[i+2].clone().sub(points[i])).normalize();for(let j=0;j<3;j++)edges.push({a:points[i+j],b:points[i+(j+1)%3],n});}const pieces=new Map(),key=p=>p.toArray().map(v=>Math.round(v*1e5)).join('/');for(const e of edges){const d=e.b.clone().sub(e.a),length=d.lengthSq();if(length<1e-14)continue;const cuts=[0,1];for(const p of points){const t=p.clone().sub(e.a).dot(d)/length;if(t>1e-6&&t<1-1e-6&&e.a.clone().addScaledVector(d,t).distanceToSquared(p)<1e-10)cuts.push(t);}cuts.sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){if(cuts[i]-cuts[i-1]<1e-6)continue;const a=e.a.clone().addScaledVector(d,cuts[i-1]),b=e.a.clone().addScaledVector(d,cuts[i]),ka=key(a),kb=key(b),k=ka<kb?ka+'|'+kb:kb+'|'+ka;let part=pieces.get(k);if(!part){part={a,b,n:e.n,count:0,crease:false};pieces.set(k,part);}part.count++;if(Math.abs(part.n.dot(e.n))<.999)part.crease=true;}}const arr=[];pieces.forEach(p=>{if(p.count===1||p.crease)arr.push(...p.a.toArray(),...p.b.toArray());});const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));return out;};
 window.nnRoofFaceMatch=eq;
})();
