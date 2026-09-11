/* Direct roof arrow editing; saved endpoints use plan/grid coordinates. */
(function(){
'use strict';
let session=null;
const ns='http://www.w3.org/2000/svg';
function node(tag,attrs){const e=document.createElementNS(ns,tag);Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));return e;}
function refresh(){dirty3d=true;build3D();draw();}
function stop(accept){
  const s=session;if(!s)return;session=null;
  if(!accept)s.before.forEach((v,p)=>{delete p.slope;delete p.kbS;delete p.kbE;Object.assign(p,v);});
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
  s.panel.querySelector('[data-status]').textContent=s.armed?'屋根の水上から水下へドラッグしてください。':'矢印の両端をドラッグして方向を変更。背景のドラッグで視点を回転できます。';
}
function ray(e){const r=T.renderer.domElement.getBoundingClientRect(),rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),T.camera);return rc;}
function onCanvas(e){const r=T.renderer.domElement.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function consume(e){e.preventDefault();e.stopImmediatePropagation();}
function down(e){
  const s=session;if(!s||e.button!==0||s.panel.contains(e.target)||!onCanvas(e))return;
  const handle=e.target.closest&&e.target.closest('[data-arrow]');if(!s.armed&&!handle)return;
  const p=state.polys[s.pi],a=arrows().map(q=>({...q})),sc=state.scaleM||.5,rc=ray(e);let point,index,end;
  if(handle){index=+handle.dataset.arrow;end=handle.dataset.end;s.selected=index;const q=a[index];if(!q)return;
    point=new THREE.Vector3((end==='head'?q.ex:q.x)*sc,nnDeckHFn(p)((end==='head'?q.ex:q.x)*sc,(end==='head'?q.ez:q.z)*sc)+.04,(end==='head'?q.ez:q.z)*sc);
  }else{
    const h=rc.intersectObject(T.group,true).find(h=>h.object.userData.nnRoofOwner===s.pi&&h.face&&h.object.visible&&!h.object.userData.pick);
    if(!h){toast('対象の屋根面からドラッグしてください');return;}
    if(a.length>=8){toast('矢印は8本までです。既存の矢印を動かすか削除してください');return;}
    point=h.point;index=a.length;end='head';a.push({x:point.x/sc,z:point.z/sc,ex:point.x/sc,ez:point.z/sc,s:ratio()});s.selected=index;
  }
  consume(e);s.svg.setPointerCapture?.(e.pointerId);s.drag={id:e.pointerId,index,end,a,y:point.y};if(T.controls)T.controls.enabled=false;renderPanel();
}
function move(e){
  const s=session,d=s&&s.drag;if(!d||d.id!==e.pointerId)return;consume(e);
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-d.y),w=ray(e).ray.intersectPlane(plane,new THREE.Vector3());if(!w)return;
  const q=d.a[d.index],sc=state.scaleM||.5;
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
  const r=T.renderer.domElement.getBoundingClientRect();Object.assign(s.svg.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  s.svg.setAttribute('viewBox','0 0 '+r.width+' '+r.height);s.svg.replaceChildren();
  const p=state.polys[s.pi],hf=nnDeckHFn(p),sc=state.scaleM||.5;
  const project=(x,z)=>{const w=new THREE.Vector3(x*sc,hf(x*sc,z*sc)+.04,z*sc).project(T.camera);return [(w.x+1)*r.width/2,(1-w.y)*r.height/2,w.z];};
  (s.drag?s.drag.a:arrows()).forEach((a,i)=>{
    const A=project(a.x,a.z),B=project(a.ex,a.ez);if(A[2]<-1||A[2]>1||B[2]<-1||B[2]>1)return;
    const color=i===s.selected?'#a82905':'#075b31',g=node('g'),dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
    g.append(node('line',{x1:A[0],y1:A[1],x2:B[0],y2:B[1],stroke:'#fff','stroke-width':9}),node('line',{x1:A[0],y1:A[1],x2:B[0],y2:B[1],stroke:color,'stroke-width':5}),node('path',{d:`M ${B[0]-ux*18-uy*9} ${B[1]-uy*18+ux*9} L ${B[0]} ${B[1]} L ${B[0]-ux*18+uy*9} ${B[1]-uy*18-ux*9}`,fill:'none',stroke:color,'stroke-width':5}));
    [A,B].forEach((P,j)=>{g.append(node('circle',{cx:P[0],cy:P[1],r:13,fill:j?color:'#fff',stroke:color,'stroke-width':3,'data-arrow':i,'data-end':j?'head':'tail',style:'pointer-events:all;cursor:grab;touch-action:none'}));});
    const label=node('text',{x:(A[0]+B[0])/2+10,y:(A[1]+B[1])/2-12,fill:color,stroke:'#fff','stroke-width':4,'paint-order':'stroke','font-size':16,'font-weight':800});label.textContent=(i+1)+'：1/'+a.s;g.append(label);s.svg.append(g);
  });s.frame=requestAnimationFrame(paint);
}
window.nnSlope3DPanel=function(){
  stop(false);if(!state.polys.length){toast('先に屋根をかいてください');return;}
  if(window.nnD3DrawCancel)nnD3DrawCancel();if(window.nnPlaceStop)nnPlaceStop();window.nnSheetMode=null;setTool('sel');
  const panel=document.createElement('section');panel.id='nnSlope3D';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','3Dで勾配を編集');
  panel.style.cssText='position:fixed;right:12px;bottom:12px;z-index:10042;width:min(320px,calc(100vw - 24px));max-height:50vh;overflow:auto;background:#fffef8;border:3px solid #176b3a;padding:12px;color:#173627;font:700 14px/1.5 system-ui;box-sizing:border-box';
  panel.innerHTML='<b>3Dで勾配を編集</b><div><label>対象 <select data-roof></select></label></div><p data-status></p><div><button data-add>＋ 流れを追加</button> <button data-delete>選択矢印を削除</button> <span data-count></span></div><div><button data-preset="valley">→← 谷</button> <button data-preset="ridge">←→ 棟</button> <button data-flat>勾配なし</button></div><label>交わり方 <select data-mode><option value="valley">谷：流れが集まる</option><option value="ridge">棟：流れが分かれる</option></select></label><div><label>選択矢印の勾配 1／<input data-ratio type="number" min="10" max="1000" value="100" style="width:65px"></label></div><div><button data-apply>保存して終了</button> <button data-cancel>取消</button></div>';
  const sel=panel.querySelector('[data-roof]');state.polys.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.name||'屋根'+(i+1);sel.append(o);});
  const pi=Math.max(0,Math.min(state.polys.length-1,state.active||0));sel.value=pi;
  const svg=node('svg',{style:'position:fixed;z-index:10041;pointer-events:none;overflow:hidden;touch-action:none'});
  session={panel,svg,pi,before:new Map(),selected:0,armed:false,drag:null,controlEnabled:T.controls?T.controls.enabled:true,events:{pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancelDrag,keydown:e=>{if(e.key==='Escape'){consume(e);stop(false);}}}};
  document.body.append(svg,panel);
  panel.querySelectorAll('button,select,input').forEach(e=>{e.style.cssText+=';font:inherit;margin:4px 2px;padding:6px;border:1px solid #176b3a;background:#fff;color:#173627';});
  panel.addEventListener('change',e=>{if(e.target.hasAttribute('data-roof')){session.pi=+e.target.value;session.selected=0;renderPanel();return;}if(e.target.hasAttribute('data-mode')||e.target.hasAttribute('data-ratio')){const a=arrows();if(a[session.selected])a[session.selected].s=ratio();setModel({mode:mode(),arrows:a});}});
  panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-apply'))return stop(true);if(b.hasAttribute('data-cancel'))return stop(false);
    if(b.hasAttribute('data-add')){session.armed=true;renderPanel();return;}
    if(b.hasAttribute('data-flat'))return setModel(null);
    if(b.hasAttribute('data-delete')){const a=arrows();a.splice(session.selected,1);setModel({mode:mode(),arrows:a});return;}
    if(b.dataset.preset){const P=state.polys[session.pi].pts,x=P.reduce((n,q)=>n+q.x,0)/P.length,z=P.reduce((n,q)=>n+q.y,0)/P.length,d=(Math.max(...P.map(q=>q.x))-Math.min(...P.map(q=>q.x)))*.3,s=ratio(),ridge=b.dataset.preset==='ridge';
      setModel({mode:b.dataset.preset,arrows:[-1,1].map(sign=>ridge?{x,z,ex:x+sign*d,ez:z,s}:{x:x+sign*d,z,ex:x,ez:z,s})});}
  });
  for(const [name,fn] of Object.entries(session.events))window.addEventListener(name,fn,{capture:true,passive:false});renderPanel();paint();
};
function init(){const old=window.nnSlopePanel;window.nnSlopePanel=function(){if(tab==='d3'&&T?.camera)return nnSlope3DPanel();return old();};const b=document.getElementById('tl_slope');if(b)b.onclick=window.nnSlopePanel;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
