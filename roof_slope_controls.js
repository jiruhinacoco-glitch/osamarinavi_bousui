/* Direct roof arrow editing; saved endpoints use plan/grid coordinates. */
(function(){
'use strict';
let session=null;
const ns='http://www.w3.org/2000/svg';
function node(tag,attrs){const e=document.createElementNS(ns,tag);Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));return e;}
function refresh(){dirty3d=true;build3D();draw();if(session)highlight();}
function stop(accept){
  const s=session;if(!s)return;session=null;
  if(!accept)s.before.forEach((v,p)=>{delete p.slope;delete p.kbS;delete p.kbE;Object.assign(p,v);});
  if(s.highlight){s.highlight.removeFromParent();s.highlight.geometry.dispose();s.highlight.material.dispose();}
  s.panel.remove();s.svg.remove();cancelAnimationFrame(s.frame);
  for(const [name,fn] of Object.entries(s.events))window.removeEventListener(name,fn,true);
  if(T.controls)T.controls.enabled=s.controlEnabled;
  refresh();if(accept){commit();saveState();toast('勾配を保存しました');}
}
window.nnSlopeCancel=function(){stop(false);};
function remember(p){if(!session.before.has(p)){const v={};for(const k of ['slope','kbS','kbE'])if(p[k]!==undefined)v[k]=JSON.parse(JSON.stringify(p[k]));session.before.set(p,v);}}
function setModel(model){const p=state.polys[session.pi];remember(p);p.slope=nnCleanSlope(model);delete p.kbS;delete p.kbE;refresh();renderPanel();}
function arrows(){return nnCleanSlope(state.polys[session.pi].slope)?.arrows||[];}
function mode(){return session.panel.querySelector('[data-mode]').value;}
function ratio(){return Math.max(10,Math.min(1000,Math.round(+session.panel.querySelector('[data-ratio]').value||100)));}
function renderPanel(){
  const s=session,p=state.polys[s.pi],a=arrows();s.selected=a.length?Math.max(0,Math.min(s.selected,a.length-1)):-1;
  s.panel.querySelector('[data-count]').textContent=a.length+' / 8 本';
  s.panel.querySelector('[data-mode]').value=p.slope?.mode||'valley';
  if(a[s.selected])s.panel.querySelector('[data-ratio]').value=a[s.selected].s;
  s.panel.querySelector('[data-delete]').disabled=s.selected<0;
  s.panel.querySelector('[data-details]').hidden=s.armed;
  s.panel.querySelector('[data-status]').textContent=s.armed?'色のついた屋根をクリックして矢印を配置。ドラッグすると水下の方向も決められます。':'勾配がつきました。矢印の両端で向きを調整できます。';
}
function inside(p,x,z){return pointInPoly(p.pts,x,z)&&!(p.holes||[]).some(h=>pointInPoly(h.pts,x,z));}
function seed(p,x,z){
  const P=p.pts.map(q=>new THREE.Vector2(q.x,q.y)),H=(p.holes||[]).map(h=>h.pts.map(q=>new THREE.Vector2(q.x,q.y))),flat=P.concat(...H);
  const tris=THREE.ShapeUtils.triangulateShape(P,H);
  if(!Number.isFinite(x)||!inside(p,x,z)){
    let best=null,area=-1;tris.forEach(t=>{const q=t.map(i=>flat[i]),a=Math.abs((q[1].x-q[0].x)*(q[2].y-q[0].y)-(q[1].y-q[0].y)*(q[2].x-q[0].x));if(a>area){area=a;best=q;}});
    x=best.reduce((v,q)=>v+q.x,0)/3;z=best.reduce((v,q)=>v+q.y,0)/3;
  }
  const span=Math.min(Math.max(...P.map(q=>q.x))-Math.min(...P.map(q=>q.x)),Math.max(...P.map(q=>q.y))-Math.min(...P.map(q=>q.y)));
  for(let len=Math.max(.03,span*.15);len>.01;len*=.6)for(let i=0;i<16;i++){
    const ang=i*Math.PI/8,ex=x+Math.cos(ang)*len,ez=z+Math.sin(ang)*len;
    if([.25,.5,.75,1].every(t=>inside(p,x+(ex-x)*t,z+(ez-z)*t)))return {x,z,ex,ez,s:100};
  }
  return {x,z,ex:x+.02,ez:z,s:100};
}
function highlight(){
  const s=session;if(!s||!T.scene)return;
  if(s.highlight){s.highlight.removeFromParent();s.highlight.geometry.dispose();s.highlight.material.dispose();}
  const source=T.group.children.find(m=>m.isMesh&&m.userData.polyIdx===s.pi);if(!source)return;
  source.updateMatrixWorld(true);const geo=source.geometry.clone();geo.applyMatrix4(source.matrixWorld);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x19c9b2,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-12,polygonOffsetUnits:-24}));
  m.name='nnSlopeTarget';m.userData.pick=true;m.raycast=function(){};m.renderOrder=9;T.scene.add(m);s.highlight=m;T.rev=(T.rev|0)+1;
}
function ray(e){const r=T.renderer.domElement.getBoundingClientRect(),rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),T.camera);return rc;}
function onCanvas(e){const r=T.renderer.domElement.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function consume(e){e.preventDefault();e.stopImmediatePropagation();}
function down(e){
  const s=session;if(!s||e.button!==0||s.panel.contains(e.target)||!onCanvas(e))return;
  const handle=!s.armed&&e.target.closest&&e.target.closest('[data-arrow]');if(!s.armed&&!handle)return;
  const p=state.polys[s.pi],a=arrows().map(q=>({...q})),sc=state.scaleM||.5,rc=ray(e);let point,index,end;
  if(handle){index=+handle.dataset.arrow;end=handle.dataset.end;s.selected=index;const q=a[index];if(!q)return;
    point=new THREE.Vector3((end==='head'?q.ex:q.x)*sc,nnDeckHFn(p)((end==='head'?q.ex:q.x)*sc,(end==='head'?q.ez:q.z)*sc)+.04,(end==='head'?q.ez:q.z)*sc);
  }else{
    const h=rc.intersectObject(T.group,true).find(h=>h.object.userData.polyIdx===s.pi&&h.face&&h.object.visible&&!h.object.userData.pick);
    if(!h){consume(e);toast('色のついた屋根面を選んでください');return;}
    if(a.length>=8){toast('矢印は8本までです。既存の矢印を動かすか削除してください');return;}
    point=h.point;index=a.length;end='head';a.push(seed(p,point.x/sc,point.z/sc));s.selected=index;
  }
  consume(e);s.svg.setPointerCapture?.(e.pointerId);s.drag={id:e.pointerId,index,end,a,y:point.y,cx:e.clientX,cy:e.clientY};if(T.controls)T.controls.enabled=false;renderPanel();
}
function move(e){
  const s=session,d=s&&s.drag;if(!s)return;
  if(!d){if(s.armed&&onCanvas(e)&&!s.panel.contains(e.target)){const h=ray(e).intersectObject(T.group,true).find(h=>h.object.userData.polyIdx===s.pi&&h.face&&h.object.visible);if(h)s.preview=seed(state.polys[s.pi],h.point.x/(state.scaleM||.5),h.point.z/(state.scaleM||.5));}return;}
  if(d.id!==e.pointerId)return;consume(e);if(Math.hypot(e.clientX-d.cx,e.clientY-d.cy)<4)return;
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-d.y),w=ray(e).ray.intersectPlane(plane,new THREE.Vector3());if(!w)return;
  const q=d.a[d.index],sc=state.scaleM||.5;
  if(!inside(state.polys[s.pi],w.x/sc,w.z/sc))return;
  if(d.end==='head'){q.ex=w.x/sc;q.ez=w.z/sc;}else{q.x=w.x/sc;q.z=w.z/sc;}
}
function up(e){const s=session,d=s&&s.drag;if(!d||d.id!==e.pointerId)return;move(e);consume(e);s.drag=null;s.armed=false;
  s.selected=d.index;
  if(T.controls)T.controls.enabled=s.controlEnabled;
  setModel({mode:mode(),arrows:d.a});
}
function cancelDrag(e){if(!session?.drag)return;consume(e);session.drag=null;if(T.controls)T.controls.enabled=session.controlEnabled;}
function paint(){
  const s=session;if(!s)return;if(tab!=='d3'){stop(false);return;}
  const r=T.renderer.domElement.getBoundingClientRect();const Z=window.nnPZ||1;Object.assign(s.svg.style,{left:r.left/Z+'px',top:r.top/Z+'px',width:r.width/Z+'px',height:r.height/Z+'px'});
  s.svg.setAttribute('viewBox','0 0 '+r.width+' '+r.height);s.svg.replaceChildren();
  const p=state.polys[s.pi],hf=nnDeckHFn(p),sc=state.scaleM||.5;
  const project=(x,z)=>{const w=new THREE.Vector3(x*sc,hf(x*sc,z*sc)+.04,z*sc).project(T.camera);return [(w.x+1)*r.width/2,(1-w.y)*r.height/2,w.z];};
  (s.drag?s.drag.a:(s.armed?[s.preview||seed(p)]:arrows())).forEach((a,i)=>{
    const A=project(a.x,a.z),B=project(a.ex,a.ez);if(A[2]<-1||A[2]>1||B[2]<-1||B[2]>1)return;
    const color=i===s.selected?'#a82905':'#075b31',g=node('g'),dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
    g.append(node('line',{x1:A[0],y1:A[1],x2:B[0],y2:B[1],stroke:'#fff','stroke-width':6}),node('line',{x1:A[0],y1:A[1],x2:B[0],y2:B[1],stroke:color,'stroke-width':3}),node('path',{d:`M ${B[0]-ux*10-uy*5} ${B[1]-uy*10+ux*5} L ${B[0]} ${B[1]} L ${B[0]-ux*10+uy*5} ${B[1]-uy*10-ux*5}`,fill:'none',stroke:color,'stroke-width':3}));
    [A,B].forEach((P,j)=>{g.append(node('circle',{cx:P[0],cy:P[1],r:5,fill:j?color:'#fff',stroke:color,'stroke-width':3,'data-arrow':i,'data-end':j?'head':'tail',style:'pointer-events:all;cursor:grab;touch-action:none'}));});
    const label=node('text',{x:(A[0]+B[0])/2+10,y:(A[1]+B[1])/2-12,fill:color,stroke:'#fff','stroke-width':4,'paint-order':'stroke','font-size':12,'font-weight':800});label.textContent=(i+1)+'：1/'+a.s;g.append(label);s.svg.append(g);
  });s.frame=requestAnimationFrame(paint);
}
window.nnSlope3DPanel=function(){
  stop(false);if(!state.polys.length){toast('先に屋根をかいてください');return;}
  if(window.nnD3DrawCancel)nnD3DrawCancel();if(window.nnPlaceStop)nnPlaceStop();window.nnSheetMode=null;setTool('sel');
  const panel=document.createElement('section');panel.id='nnSlope3D';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','3Dで勾配を編集');
  panel.style.cssText='position:fixed;right:12px;bottom:12px;z-index:10042;width:min(320px,calc(100vw - 24px));max-height:50vh;overflow:auto;background:#fffef8;border:3px solid #176b3a;padding:12px;color:#173627;font:700 14px/1.5 system-ui;box-sizing:border-box';
  panel.innerHTML='<b>屋根に勾配をつける</b><div><label>対象 <select data-roof></select></label></div><p data-status></p><div data-details><div><button data-add>＋ 流れを追加</button> <button data-delete>選択矢印を削除</button> <span data-count></span></div><div><button data-preset="valley">→← 谷</button> <button data-preset="ridge">←→ 棟</button> <button data-flat>勾配なし</button></div><label>交わり方 <select data-mode><option value="valley">谷：流れが集まる</option><option value="ridge">棟：流れが分かれる</option></select></label><div><label>選択矢印の勾配 1／<input data-ratio type="number" min="10" max="1000" value="100" style="width:65px"></label></div></div><div><button data-apply>完了</button> <button data-cancel>取消</button></div>';
  const sel=panel.querySelector('[data-roof]');state.polys.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.name||'屋根'+(i+1);sel.append(o);});
  const pi=Math.max(0,Math.min(state.polys.length-1,state.active||0));sel.value=pi;
  const svg=node('svg',{style:'position:fixed;z-index:10041;pointer-events:none;overflow:hidden;touch-action:none'});
  session={panel,svg,pi,before:new Map(),selected:0,armed:!nnCleanSlope(state.polys[pi].slope),drag:null,preview:null,highlight:null,controlEnabled:T.controls?T.controls.enabled:true,events:{pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancelDrag,keydown:e=>{if(e.key==='Escape'){consume(e);stop(false);}}}};
  document.body.append(svg,panel);
  panel.querySelectorAll('button,select,input').forEach(e=>{e.style.cssText+=';font:inherit;margin:4px 2px;padding:6px;border:1px solid #176b3a;background:#fff;color:#173627';});
  panel.addEventListener('change',e=>{if(e.target.hasAttribute('data-roof')){session.pi=+e.target.value;session.selected=0;session.preview=seed(state.polys[session.pi]);highlight();renderPanel();return;}if(e.target.hasAttribute('data-mode')||e.target.hasAttribute('data-ratio')){const a=arrows();if(a[session.selected])a[session.selected].s=ratio();setModel({mode:mode(),arrows:a});}});
  panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-apply'))return stop(true);if(b.hasAttribute('data-cancel'))return stop(false);
    if(b.hasAttribute('data-add')){session.armed=true;session.preview=seed(state.polys[session.pi]);renderPanel();return;}
    if(b.hasAttribute('data-flat'))return setModel(null);
    if(b.hasAttribute('data-delete')){const a=arrows();a.splice(session.selected,1);setModel({mode:mode(),arrows:a});return;}
    if(b.dataset.preset){const p=state.polys[session.pi],q=seed(p),x=q.x,z=q.z,s=ratio(),ridge=b.dataset.preset==='ridge';
      let dx=q.ex-x,dz=q.ez-z;
      while(!inside(p,x-dx,z-dz)&&Math.hypot(dx,dz)>.02){dx*=.6;dz*=.6;}
      session.armed=false;setModel({mode:b.dataset.preset,arrows:[-1,1].map(sign=>ridge?{x,z,ex:x+sign*dx,ez:z+sign*dz,s}:{x:x+sign*dx,z:z+sign*dz,ex:x,ez:z,s})});}
  });
  for(const [name,fn] of Object.entries(session.events))window.addEventListener(name,fn,{capture:true,passive:false});highlight();renderPanel();paint();
};
function init(){const old=window.nnSlopePanel;window.nnSlopePanel=function(){if(tab==='d3'&&T?.camera)return nnSlope3DPanel();return old();};const b=document.getElementById('tl_slope');if(b)b.onclick=window.nnSlopePanel;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
