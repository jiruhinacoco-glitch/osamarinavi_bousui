(function(){
'use strict';
var slopeBox=null,holeBox=null;
function esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});}
function closeSlope(){if(slopeBox){slopeBox.remove();slopeBox=null;}}
function closeHole(){if(holeBox){holeBox.remove();holeBox=null;}}
function roofName(p,i){return esc((p&&p.name)||('屋根'+(i+1)));}
function slopeRise(p,s,e){
  if(!p||!s||e==null||!p.pts||!p.pts.length)return 0;
  var a=p.pts[e],b=p.pts[(e+1)%p.pts.length],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
  var sign=0;for(var i=0;i<p.pts.length;i++)sign+=((p.pts[i].x-a.x)*nx+(p.pts[i].y-a.y)*ny);if(sign<0){nx=-nx;ny=-ny;}
  var mx=0;for(var j=0;j<p.pts.length;j++)mx=Math.max(mx,(p.pts[j].x-a.x)*nx+(p.pts[j].y-a.y)*ny);
  return Math.round(mx*(state.scaleM||.5)/s*1000);
}
function slopeRender(){
  if(!slopeBox)return;var pi=+(slopeBox.querySelector('#nnSlopeRoof')||{}).value||0,p=state.polys[pi];if(!p)return;
  var sv=slopeBox.querySelector('#nnSlopeValue'),ev=slopeBox.querySelector('#nnSlopeEdge');
  if(!sv||!ev)return;
  var curE=(p.kbE!=null)?(p.kbE|0):(window.nnKbLongest?nnKbLongest(p):0);
  ev.innerHTML=(p.pts||[]).map(function(_,i){return '<option value="'+i+'"'+(i===curE?' selected':'')+'>'+esc(window.nnKbEdgeLabel?nnKbEdgeLabel(p,i):('辺 '+(i+1)))+'</option>';}).join('');
  sv.value=+p.kbS||100;
  slopePreview();
}
function slopePreview(){
  if(!slopeBox)return;var pi=+(slopeBox.querySelector('#nnSlopeRoof')||{}).value||0,p=state.polys[pi];if(!p)return;
  var s=Math.max(10,Math.min(1000,+slopeBox.querySelector('#nnSlopeValue').value||100));
  var e=+slopeBox.querySelector('#nnSlopeEdge').value||0,r=slopeRise(p,s,e),d=slopeBox.querySelector('#nnSlopePreview');
  d.innerHTML='<b>水下：</b>'+esc(window.nnKbEdgeLabel?nnKbEdgeLabel(p,e):('辺 '+(e+1)))+'<br><b>勾配：</b>1/'+s+'　／　水上までの高低差 最大約 <b>'+r+'mm</b><div class="nn-slope-arrow">水上　━━━━━━▶　水下</div>';
}
window.nnSlopePanel=function(){
  closeSlope();closeHole();if(!state.polys||!state.polys.length){toast('先に屋根をかいてください');return;}
  slopeBox=document.createElement('div');slopeBox.className='nn-tool-modal';slopeBox.innerHTML='<section role="dialog" aria-modal="true" aria-label="屋根に勾配をつける"><h3>屋根に勾配をつける <button data-close>閉じる</button></h3><label>対象の屋根 <select id="nnSlopeRoof">'+state.polys.map(function(p,i){return '<option value="'+i+'">'+roofName(p,i)+'</option>';}).join('')+'</select></label><div class="nn-slope-presets"><button data-s="100">1/100</button><button data-s="50">1/50</button><button data-s="20">1/20</button><button data-flat>勾配なし</button></div><label>勾配 1／<input id="nnSlopeValue" type="number" inputmode="numeric" min="10" max="1000" step="1" value="100"></label><label>水が流れ着く辺 <select id="nnSlopeEdge"></select></label><div id="nnSlopePreview"></div><p>水下の辺を基準に、反対側へ向かって屋根面が高くなります。立上りが150mm未満になる場合は警告します。</p><footer><button id="nnSlopeApply">この屋根に適用</button></footer></section>';document.body.appendChild(slopeBox);slopeRender();
  slopeBox.addEventListener('input',function(e){if(e.target.id==='nnSlopeRoof')slopeRender();else slopePreview();});
  slopeBox.addEventListener('change',function(e){if(e.target.id==='nnSlopeRoof')slopeRender();else slopePreview();});
  slopeBox.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-close')){closeSlope();return;}if(b.dataset.s){slopeBox.querySelector('#nnSlopeValue').value=b.dataset.s;slopePreview();return;}var pi=+slopeBox.querySelector('#nnSlopeRoof').value||0;if(b.hasAttribute('data-flat')){nnKbSet(pi,0);try{commit();}catch(_){}closeSlope();toast('勾配をなしにしました');return;}if(b.id==='nnSlopeApply'){var s=Math.max(10,Math.min(1000,Math.round(+slopeBox.querySelector('#nnSlopeValue').value||100))),ed=+slopeBox.querySelector('#nnSlopeEdge').value||0;nnKbSet(pi,s,ed);try{commit();}catch(_){}closeSlope();toast('勾配 1/'+s+' を設定しました');}});
};
function addHoleStamps(){
  if(!window.nnRegisterStamp)return false;var ph=window.NN_DRAIN_PHI||[50,75,100,125,150,175,200];ph.forEach(function(f){nnRegisterStamp('floorhole'+f,{name:'床のドレン穴 '+f+'φ',kind:'hole',w:f,d:f,h:30,price:0,addM2:0,sealM:0,memo:'躯体開口のみ'});nnRegisterStamp('wallhole'+f,{name:'壁のドレン穴 '+f+'φ',kind:'hole',w:f,d:30,h:f,price:0,addM2:0,sealM:0,memo:'躯体開口のみ'});});return true;
}
window.nnHolePanel=function(type){
  if(window.nnSlopeCancel)nnSlopeCancel();
  closeHole();closeSlope();if(!state.polys||!state.polys.length){toast('先に屋根をかいてください');return;}if(!addHoleStamps()){toast('穴の準備中です。もう一度押してください');return;}
  var cur=type==='wall'?'wall':'floor',ph=window.NN_DRAIN_PHI||[50,75,100,125,150,175,200];holeBox=document.createElement('div');holeBox.className='nn-tool-modal nn-hole-modal';holeBox.innerHTML='<section role="dialog" aria-modal="true" aria-label="ドレン穴をつくる"><h3>ドレン穴をつくる <button data-close>閉じる</button></h3><div class="nn-hole-types"><button data-type="floor" class="'+(cur==='floor'?'on':'')+'">床の穴</button><button data-type="wall" class="'+(cur==='wall'?'on':'')+'">壁の穴</button></div><div class="nn-hole-grid">'+ph.map(function(f){return '<button data-phi="'+f+'">● '+f+'φ</button>';}).join('')+'</div><p><b>改修用ドレンではありません。</b> 金物・つば・ストレーナーを付けず、躯体をくり抜き、穴の内側を表示します。</p><p>'+(cur==='wall'?'径を選んだあと、穴を開けたい壁際をタップします。最寄りの辺に吸着して壁の向きも合わせます。':'径を選んだあと、屋根面をタップします。勾配がある場合はその高さに合わせます。')+'</p></section>';document.body.appendChild(holeBox);
  holeBox.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-close')){closeHole();return;}if(b.dataset.type){nnHolePanel(b.dataset.type);return;}if(b.dataset.phi){var id=cur+'hole'+b.dataset.phi;closeHole();nnStamp(id,1);}});
};
function init(){
  if(!document.getElementById('nnRoofToolStyle')){var st=document.createElement('style');st.id='nnRoofToolStyle';st.textContent='.nn-tool-modal{position:fixed;inset:0;z-index:10040;background:rgba(8,25,18,.62);display:flex;align-items:center;justify-content:center;padding:14px}.nn-tool-modal section{width:min(560px,calc(100vw - 28px));max-height:calc(100vh - 28px);overflow:auto;background:#fffef8;border:3px solid #176b3a;box-shadow:8px 8px 0 rgba(0,0,0,.28);padding:16px;color:#173627;font:700 15px/1.5 system-ui,sans-serif}.nn-tool-modal h3{margin:0 0 14px;font-size:20px;display:flex;justify-content:space-between;align-items:center}.nn-tool-modal button,.nn-tool-modal select,.nn-tool-modal input{font:700 15px system-ui,sans-serif;border:2px solid #216f43;background:#fff;padding:8px 10px;color:#173627}.nn-tool-modal label{display:block;margin:11px 0}.nn-tool-modal select{max-width:100%;margin-left:6px}.nn-tool-modal input{width:100px}.nn-slope-presets,.nn-hole-types,.nn-hole-grid{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.nn-hole-types .on,.nn-tool-modal footer button{background:#ffd51f;border-color:#9f7900}.nn-hole-grid button{min-width:92px}.nn-tool-modal footer{margin-top:14px}.nn-tool-modal p{font-weight:600;font-size:13px}.nn-slope-arrow{margin-top:8px;background:#e7f5eb;border:2px solid #79aa89;padding:8px;text-align:center;color:#075b31}#nnSlopePreview{background:#f4f1e8;border:2px solid #c9c1ad;padding:10px;margin-top:12px}@media(max-width:600px){.nn-tool-modal{align-items:flex-start;padding:8px}.nn-tool-modal section{width:calc(100vw - 16px);max-height:calc(100vh - 16px);padding:12px}.nn-tool-modal button,.nn-tool-modal select,.nn-tool-modal input{font-size:14px;padding:8px}}';document.head.appendChild(st);}
  addHoleStamps();var a=document.getElementById('tl_profile')||document.getElementById('tl_split');if(a&&!document.getElementById('tl_slope')){var s=document.createElement('button');s.id='tl_slope';s.className='tbtn';s.textContent='勾配';s.title='屋根を選んで水勾配と水下の辺を設定';s.onclick=nnSlopePanel;a.parentNode.insertBefore(s,a.nextSibling);var h=document.createElement('button');h.id='tl_drain_hole';h.className='tbtn pj';h.textContent='ドレン穴';h.title='改修用ドレンではなく、床・壁の開口だけをつくる';h.onclick=function(){nnHolePanel('floor');};s.parentNode.insertBefore(h,s.nextSibling);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* 円柱状の範囲を三角形から差し引く。黒い円盤で面を覆わない。
   材質・UV・頂点法線を保ち、対象屋根の生成直後のメッシュだけを処理する。 */
(function(){
window.nnCutOpeningGeometry=function(geometry,matrix,center,u,v,axis,radius,halfDepth){
  var source=geometry.index?geometry.toNonIndexed():geometry,attrs=source.attributes;
  if(!attrs.position)return geometry;
  var keys=Object.keys(attrs),size=keys.reduce(function(n,k){return n+attrs[k].itemSize;},0),offset={},cursor=0;
  keys.forEach(function(k){offset[k]=cursor;cursor+=attrs[k].itemSize;});
  var planes=[];
  for(var j=0;j<40;j++){var a=(j+.5)*Math.PI*2/40;planes.push([Math.cos(a),Math.sin(a),0,radius*Math.cos(Math.PI/40)]);}
  planes.push([0,0,1,halfDepth],[0,0,-1,halfDepth]);
  var output=[],changed=false;
  function dist(q,p){return q[0]*p[0]+q[1]*p[1]+q[2]*p[2]-p[3];}
  function split(poly,plane){
    var inn=[],out=[];
    for(var i=0;i<poly.length;i++){
      var a=poly[i],b=poly[(i+1)%poly.length],da=dist(a,plane),db=dist(b,plane),ai=da<=1e-10,bi=db<=1e-10;
      (ai?inn:out).push(a);
      if(ai!==bi){var t=da/(da-db),q=a.map(function(x,k){return x+(b[k]-x)*t;});inn.push(q);out.push(q);}
    }return [inn,out];
  }
  function emit(poly){for(var i=1;i+1<poly.length;i++)output.push(poly[0],poly[i],poly[i+1]);}
  for(var i=0;i<attrs.position.count;i+=3){
    var tri=[];
    for(var k=0;k<3;k++){
      var pt=new THREE.Vector3().fromBufferAttribute(attrs.position,i+k).applyMatrix4(matrix).sub(center);
      var q=[pt.dot(u),pt.dot(v),pt.dot(axis)];
      keys.forEach(function(key){var a=attrs[key];for(var c=0;c<a.itemSize;c++)q.push(a.array[(i+k)*a.itemSize+c]);});tri.push(q);
    }
    // 同じ平面の外側に三頂点ともあれば円柱と交わらない。
    if(planes.some(function(p){return tri.every(function(q){return dist(q,p)>1e-10;});})){emit(tri);continue;}
    var inside=tri,fragments=[];
    for(var n=0;n<planes.length&&inside.length>=3;n++){
      var pair=split(inside,planes[n]);inside=pair[0];if(pair[1].length>=3)fragments.push(pair[1]);
    }
    if(inside.length<3){emit(tri);continue;}
    changed=true;fragments.forEach(emit);
  }
  if(!changed){if(source!==geometry)source.dispose();return geometry;}
  var result=new THREE.BufferGeometry();
  keys.forEach(function(key){var a=attrs[key],data=new Float32Array(output.length*a.itemSize);
    output.forEach(function(q,i){for(var k=0;k<a.itemSize;k++)data[i*a.itemSize+k]=q[3+offset[key]+k];});
    result.setAttribute(key,new THREE.BufferAttribute(data,a.itemSize));
  });
  // この屋根生成処理のメッシュはいずれも単一材質。
  result.computeBoundingBox();result.computeBoundingSphere();
  if(source!==geometry)source.dispose();return result;
};
window.nnCutRoofOpenings=function(poly,pi,objects){
  var scale=state.scaleM||.5,hf=nnDeckHFn(poly);
  (state.parts||[]).forEach(function(it){
    var item=window.nnPartsLib&&nnPartsLib().find(function(p){return p.id===it.p;});
    if(!item||item.kind!=='hole'||it.pi!==pi)return;
    var phi=/(\d+)\s*[φΦ]/.exec(item.name||''),r=(phi?Number(phi[1]):75)/2000;
    var x=it.x*scale,z=it.y*scale,center,u,v,axis,depth;
    if(!it.wall&&!/壁/.test(item.name||'')){
      center=new THREE.Vector3(x,hf(x,z),z);u=new THREE.Vector3(1,0,0);v=new THREE.Vector3(0,0,1);axis=new THREE.Vector3(0,1,0);depth=10000;
    }else{
      var ei=it.ei,edge=poly.edges[ei];if(!edge||edge.arc!=null)return;
      var a=poly.pts[ei],b=poly.pts[(ei+1)%poly.pts.length],n=ringNormal(poly,poly.pts,a,b),th=nnWallTh(edge,poly);
      axis=new THREE.Vector3(n.x,0,n.y);u=new THREE.Vector3(n.y,0,-n.x);v=new THREE.Vector3(0,1,0);
      center=new THREE.Vector3(x-n.x*th/2,hf(x,z)+r+.018,z-n.y*th/2);depth=th/2+.035;
    }
    objects.forEach(function(root){root.updateMatrixWorld(true);root.traverse(function(mesh){
      if(!mesh.isMesh||!mesh.geometry||Array.isArray(mesh.material))return;
      var old=mesh.geometry,next=nnCutOpeningGeometry(old,mesh.matrixWorld,center,u,v,axis,r,depth);
      if(next!==old){mesh.geometry=next;old.dispose();}
    });});
  });
};
})();
