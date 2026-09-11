/* 辺ごとの断面。屋根どうしは独立。寸法はmm、横方向は屋根内側から外周へ。 */
(function(){
'use strict';
window.nnProfileClean=function(value){
  if(!value||!Array.isArray(value.steps)||!value.steps.length||value.steps.length>6)return null;
  var steps=[],height=0,width=0;
  for(var i=0;i<value.steps.length;i++){
    var s=value.steps[i];if(!s||typeof s!=='object')return null;var up=Number(s.up),out=Number(s.out);
    if(!Number.isFinite(up)||!Number.isFinite(out)||Math.abs(up)>3000||out<0||out>3000||(!up&&!out))return null;
    if(i&&steps[i-1].out===0&&steps[i-1].up*up<0)return null;
    height+=up;width+=out;if(Math.abs(height)>6000||width>6000)return null;
    steps.push({up:up,out:out});
  }
  return {steps:steps};
};
window.nnProfilePath=function(value){
  var p=nnProfileClean(value);if(!p)return null;
  var depth=p.steps.reduce(function(n,s){return n+s.out;},0)/1000;
  var x=depth+(depth?0.006:0),y=0,points=[[x,y]];
  p.steps.forEach(function(s){if(s.up){y+=s.up/1000;points.push([x,y]);}if(s.out){x-=s.out/1000;points.push([x,y]);}});
  return {points:points,depth:depth};
};
window.nnProfileFaces=function(poly,ring,ei,pi,ri){
  var e=ring.edges[ei],path=nnProfilePath(e.profile);if(!path)return [];
  var scale=state.scaleM||1,a=ring.pts[ei],b=ring.pts[(ei+1)%ring.pts.length],
    length=Math.hypot(b.x-a.x,b.y-a.y)*scale;
  if(length<.001)return [];
  var n=ringNormal(poly,ring.pts,a,b),out=[],hf=window.nnDeckHFn?nnDeckHFn(poly):null,lv=+poly.lv||0;
  function wp(pt,cross){
    var x=pt.x*scale+n.x*cross[0],z=pt.y*scale+n.y*cross[0];
    return new THREE.Vector3(x,lv+cross[1]+.012+(hf?hf(x,z)-lv:0),z);
  }
  for(var j=1;j<path.points.length;j++){
    var A=path.points[j-1],B=path.points[j],P0=wp(a,A),P1=wp(b,A),P2=wp(b,B),P3=wp(a,B);
    var uv=new THREE.Vector3().subVectors(P1,P0),vv0=new THREE.Vector3().subVectors(P3,P0);
    var normal=new THREE.Vector3().crossVectors(uv,vv0).normalize();
    if(normal.y<-.999)normal.negate();
    var u=uv.clone().normalize(),v=new THREE.Vector3().crossVectors(normal,u).normalize();
    var corners=[P0,P1,P2,P3].map(function(P){var d=P.clone().sub(P0);return[d.dot(u),d.dot(v)];});
    var sl=Math.hypot(B[0]-A[0],B[1]-A[1]);
    out.push({p:P0.toArray(),
      u:u.toArray(),v:v.toArray(),n:normal.toArray(),pts:corners,sl:sl,
      id:{pi:pi,ri:ri,ei:ei,k:'profile'+(j-1)}});
  }
  return out;
};
window.nnProfileGroundY=function(polys){
  var ground=-.002;
  (polys||[]).forEach(function(poly){[poly].concat(poly.holes||[]).forEach(function(r){(r.edges||[]).forEach(function(e){
    var p=nnProfilePath(e.profile);if(!p)return;
    var low=(+poly.lv||0)+.012+Math.min.apply(null,p.points.map(function(q){return q[1];}))-(p.depth>0?.05:0);
    if(low<-.002)ground=Math.min(ground,low-.05);
  });});});return ground;
};
window.nnProfileMesh=function(poly,ring,ei,pi,ri,deckY){
  var path=nnProfilePath(ring.edges[ei].profile),group=new THREE.Group();group.name='nnEdgeProfile';if(!path)return group;
  var points=path.points.map(function(p){return p.slice();}),first=points[0],last=points[points.length-1];
  if(path.depth>0){
    var base=Math.min(0,Math.min.apply(null,points.map(function(p){return p[1];})))-.05;
    points.push([last[0],base],[first[0],base]);
  }else{
    // 横幅なしの立下りにも50mmの下地を設ける。厚みは屋根の内側。
    points.push([last[0]+.05,last[1]],[first[0]+.05,first[1]]);
  }
  var a=ring.pts[ei],b=ring.pts[(ei+1)%ring.pts.length],scale=state.scaleM||1,L=Math.hypot(b.x-a.x,b.y-a.y)*scale;
  var nr=ringNormal(poly,ring.pts,a,b),u=new THREE.Vector3(nr.x,0,nr.y),v=new THREE.Vector3(0,1,0),
    axis=new THREE.Vector3((b.x-a.x)*scale/L,0,(b.y-a.y)*scale/L);
  var sh=new THREE.Shape(points.map(function(p){return new THREE.Vector2(p[0],p[1]);}));
  var gm=new THREE.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false});
  var M=new THREE.Matrix4().makeBasis(u,v,axis);M.setPosition(new THREE.Vector3(a.x*scale,(+poly.lv||0)+.012,a.y*scale));gm.applyMatrix4(M);
  // 内向き法線と辺方向の基底が鏡像になる場合、頂点順も戻す。
  // 両面材質だけで隠すと天端が下面として照明され、茶色くなる。
  if(M.determinant()<0){
    Object.keys(gm.attributes).forEach(function(key){var at=gm.attributes[key];
      for(var t=0;t<at.count;t+=3)for(var k=0;k<at.itemSize;k++){
        var j=(t+1)*at.itemSize+k,l=(t+2)*at.itemSize+k,tmp=at.array[j];at.array[j]=at.array[l];at.array[l]=tmp;
      }at.needsUpdate=true;
    });
  }
  gm.computeVertexNormals();
  if(window.nnSplitSlopeGeometry)gm=nnSplitSlopeGeometry(gm,deckY);
  if(deckY&&!deckY.flat&&gm.attributes&&gm.attributes.position){
    var gp=gm.attributes.position,baseLv=+poly.lv||0;
    for(var gi=0;gi<gp.count;gi++) gp.setY(gi,gp.getY(gi)+deckY(gp.getX(gi),gp.getZ(gi))-baseLv);
    gp.needsUpdate=true;gm.computeVertexNormals();gm.computeBoundingBox();gm.computeBoundingSphere();
  }
  var material=typeof nnMat==='function'?nnMat('concrete',0xd8d0c2,true):new THREE.MeshStandardMaterial({color:0xd8d0c2,side:THREE.DoubleSide});
  var mesh=new THREE.Mesh(gm,material);mesh.userData.profileEdge={p:pi,r:ri-1,e:ei};mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return group;
};
var draft=null,target=null;
function close(){var d=document.getElementById('nnProfileEditor');if(d)d.remove();draft=null;target=null;}
function preview(){
  var d=document.getElementById('nnProfilePreview'),path=nnProfilePath(draft);if(!d)return;if(!path){d.textContent=draft.steps.length?'数値を確認してください':'立上りなし（平場の端で終わる）';return;}
  var P=path.points,minY=Math.min.apply(null,P.map(function(p){return p[1];})),maxY=Math.max.apply(null,P.map(function(p){return p[1];}));
  var width=Math.max(.1,path.depth),height=Math.max(.1,maxY-minY),scale=Math.min(310/width,115/height);
  var pts=P.map(function(p){return (25+(path.depth-p[0])*scale)+','+(20+(maxY-p[1])*scale);}).join(' ');
  d.innerHTML='<svg viewBox="0 0 360 165" role="img" aria-label="屋根内側から外周に向かう断面"><polyline points="'+pts+'" fill="none" stroke="#1b7540" stroke-width="5"/><text x="10" y="160" font-size="13">屋根内側 → 外周　（断面の予告）</text></svg>';
}
function paint(){
  var host=document.getElementById('nnProfileRows');if(!host)return;
  host.innerHTML=draft.steps.map(function(s,i){return '<div class="nn-prof-row"><b>'+(i+1)+'</b><label>上下 <input aria-label="'+(i+1)+'段目の上下mm" type="number" inputmode="decimal" step="10" min="-3000" max="3000" data-i="'+i+'" data-k="up" value="'+s.up+'"> mm</label><label>外へ <input aria-label="'+(i+1)+'段目の横幅mm" type="number" inputmode="decimal" step="10" min="0" max="3000" data-i="'+i+'" data-k="out" value="'+s.out+'"> mm</label><button data-del="'+i+'" aria-label="'+(i+1)+'段目を削除">×</button></div>';}).join('');preview();
}
window.nnProfileOpen=function(){
  if(typeof sel==='undefined'||!sel||sel.f==='deck'){toast('「選択」で変更したい辺をタップしてから「辺の形」を押してください');return;}
  var ring=selRing();if(!ring||!ring.edges[sel.e])return;
  close();target={p:sel.p,r:sel.r,e:sel.e,edge:ring.edges[sel.e]};
  draft=nnProfileClean(target.edge.profile)||{steps:[{up:target.edge.h||300,out:target.edge.w||250}]};
  var box=document.createElement('div');box.id='nnProfileEditor';
  box.innerHTML='<section role="dialog" aria-modal="true" aria-label="この辺の形を変更"><h3>この辺の形を変更 <button id="nnProfileClose">閉じる</button></h3><p>屋根 '+(target.p+1)+' ／ 辺 '+(target.e+1)+' だけを変更します。隣の屋根は変えません。</p><div class="nn-prof-presets"><button data-preset="thin">薄い立上り</button><button data-preset="steps">階段状</button><button data-preset="down">立下り</button><button data-preset="none">立上りなし</button></div><p>各段を「上下 → 外へ」の順に作ります。上下の − は立下りです。</p><div id="nnProfilePreview"></div><div id="nnProfileRows"></div><button id="nnProfileAdd">＋ 段を追加</button><p id="nnProfileError" role="alert"></p><p>直線の辺用の試験機能です。隣の辺との角の接合・詳細図への反映は未対応です。既存の増し貼りがある辺は先にその増し貼りを外してください。</p><footer><button id="nnProfileRange">この辺の一部だけ選び直す</button><button id="nnProfileApply">この辺に適用</button></footer></section>';
  document.body.appendChild(box);paint();
  box.addEventListener('input',function(e){var el=e.target;if(el.dataset.k){draft.steps[+el.dataset.i][el.dataset.k]=Number(el.value);preview();}});
  box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    if(b.id==='nnProfileClose'){close();return;}
    if(b.dataset.preset){var presets={thin:[{up:300,out:50}],steps:[{up:150,out:250},{up:150,out:250}],down:[{up:-300,out:0}],none:[]};draft={steps:presets[b.dataset.preset]};paint();return;}
    if(b.dataset.del!=null){draft.steps.splice(+b.dataset.del,1);paint();return;}
    if(b.id==='nnProfileAdd'){if(draft.steps.length<6){draft.steps.push({up:150,out:250});paint();}return;}
    if(b.id==='nnProfileRange'){close();nnEdgeRangeAsk();return;}
    if(b.id==='nnProfileApply'){
      var ringNow=state.polys[target.p]&&(target.r<0?state.polys[target.p]:(state.polys[target.p].holes||[])[target.r]);
      if(!ringNow||ringNow.edges[target.e]!==target.edge){document.getElementById('nnProfileError').textContent='選択した辺が変わりました。閉じて選び直してください。';return;}
      var prof=draft.steps.length?nnProfileClean(draft):null;
      if(prof&&target.edge.arc!=null){document.getElementById('nnProfileError').textContent='弧の辺はまだ断面編集に対応していません。直線の辺を選んでください。';return;}
      if(prof){
        var poly=state.polys[target.p],a=ringNow.pts[target.e],b=ringNow.pts[(target.e+1)%ringNow.pts.length],n=ringNormal(poly,ringNow.pts,a,b),depth=nnProfilePath(prof).depth/(state.scaleM||1);
        var fits=[.2,.5,.8].every(function(t){var x=a.x+(b.x-a.x)*t+n.x*depth,y=a.y+(b.y-a.y)*t+n.y*depth;
          return depth===0||pointInPoly(poly.pts,x,y)&&!(poly.holes||[]).some(function(h){return pointInPoly(h.pts,x,y);});});
        if(!fits){document.getElementById('nnProfileError').textContent='断面の横幅が屋根内に収まりません。横幅を小さくしてください。';return;}
      }
      if(draft.steps.length&&!prof){document.getElementById('nnProfileError').textContent='各段の数値を確認してください。上下±3000mm・横0〜3000mm、合計6000mmまでです。';return;}
      var hasSheet=(state.d3sheet||[]).some(function(s){return (s.faces||[]).some(function(f){return f.id&&f.id.pi===target.p&&f.id.ri===target.r+1&&f.id.ei===target.e;});});
      if(hasSheet){document.getElementById('nnProfileError').textContent='この辺には増し貼りがあります。形を変更する前にその増し貼りを外してください。';return;}
      var ed=target.edge;ed.profile=prof;ed.k=prof?'profile':'free';ed.h=0;ed.w=0;ed.ago=false;ed.kasagi=false;ed.tesuri=false;
      close();afterEdgeChange();recalc();dirty3d=true;if(tab==='d3')build3D();toast('選んだ辺だけ形を変更しました');
    }
  });
};
function init(){
  var anchor=document.getElementById('tl_split');if(anchor&&!document.getElementById('tl_profile')){
    var b=document.createElement('button');b.id='tl_profile';b.className='tbtn';b.textContent='辺の形';b.onclick=nnProfileOpen;anchor.parentNode.insertBefore(b,anchor.nextSibling);
  }
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&draft)close();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
