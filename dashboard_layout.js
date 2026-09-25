/* 主要枠の並べ替え・四辺サイズ変更。データと集計条件は変更しない。 */
(function(){
 const root=document.getElementById('dashboard');if(!root)return;
 const KEY='nn_dash_layout_v1',order0=['yojitsu','taio','juchu','monthly','sekou','stt','bugakari','nyukin','hou','moto'],base={yojitsu:58,taio:42,juchu:58,stt:58,bugakari:42};let pref={};
 try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))pref=v;}catch(e){}
 if(!pref.sizes||typeof pref.sizes!=='object'||Array.isArray(pref.sizes))pref.sizes={};
 if(!Array.isArray(pref.order))pref.order=order0.slice();pref.order=[...new Set(pref.order.filter(x=>order0.includes(x))),...order0.filter(x=>!pref.order.includes(x))];
 const css=document.createElement('style');css.textContent=`
 #dashboard .nn-panel-grid{display:grid;grid-template-columns:repeat(100,minmax(0,1fr));row-gap:12px;margin:0 -6px;align-items:start;}
 html body #dashboard .nn-panel-grid>.dpanel{margin:0 6px!important;min-width:0;position:relative;box-sizing:border-box;align-self:start;}
 #dashboard .nn-panel-grid>.dpanel>h4{cursor:move;touch-action:none;}
 #dashboard .nn-panel-grid>.dpanel.nn-panel-drag{opacity:.65;}
 #dashboard .nn-panel-grid>.dpanel.nn-panel-target{outline:2px dashed #6b4a24;outline-offset:-4px;}
 .nn-panel-edge{position:absolute;z-index:12;touch-action:none;}
 .nn-panel-edge[data-edge=n],.nn-panel-edge[data-edge=s]{left:10px;right:10px;height:6px;cursor:ns-resize;}
 .nn-panel-edge[data-edge=n]{top:-3px}.nn-panel-edge[data-edge=s]{bottom:-3px}
 .nn-panel-edge[data-edge=w],.nn-panel-edge[data-edge=e]{top:10px;bottom:10px;width:6px;cursor:ew-resize;}
 .nn-panel-edge[data-edge=w]{left:-3px}.nn-panel-edge[data-edge=e]{right:-3px}
 .nn-panel-edge[data-edge=nw],.nn-panel-edge[data-edge=ne],.nn-panel-edge[data-edge=sw],.nn-panel-edge[data-edge=se]{width:12px;height:12px;z-index:13;}
 .nn-panel-edge[data-edge=nw]{top:-3px;left:-3px;cursor:nwse-resize}.nn-panel-edge[data-edge=ne]{top:-3px;right:-3px;cursor:nesw-resize}
 .nn-panel-edge[data-edge=sw]{bottom:-3px;left:-3px;cursor:nesw-resize}.nn-panel-edge[data-edge=se]{bottom:-3px;right:-3px;cursor:nwse-resize}
 html:not([data-nnphone="1"]) #listsb{display:none!important;}
 #dashboard .bars-scroll{overflow-x:auto!important;}
 #dashboard .bars-scroll .bars2{min-width:var(--monthly-min,0px)!important;}
 #dashboard .bars2 .bv2,#dashboard .bars2 .bl2{font-size:var(--monthly-font,14px)!important;white-space:nowrap;}
 #dashboard .bars2 .bv2 s{font-size:.75em!important;}
 #dashboard .nn-panel-body{min-height:0;}
 #dashboard .nn-panel-fixed{display:flex;flex-direction:column;}
 #dashboard .nn-panel-fixed>.nn-panel-body{flex:1;overflow:auto;}
 html[data-nnphone="1"][data-nnvm="mobile"] #dashboard .nn-panel-grid{grid-template-columns:repeat(100,minmax(0,1fr));}
 @media print{.nn-panel-edge{display:none}}
 html[data-nnphone="1"] .nn-panel-edge{display:none!important;}
 html[data-nnphone="1"] #dashboard .nn-panel-grid>.dpanel>h4{cursor:default;touch-action:auto;}
 `;document.head.appendChild(css);
 function save(){try{localStorage.setItem(KEY,JSON.stringify(pref));}catch(e){if(typeof toast==='function')toast('今回の配置に反映しました。端末には保存できません。');}}
 const id=p=>p.dataset.panelId;
 /* ★2026-09-25b スマホでは枠の大きさ・位置を変えない（指で辺に触れて崩れ、戻せなくなった・本人の写真）。保存済みの大きさ・位置も使わない。 */
 const LOCK=document.documentElement.getAttribute('data-nnphone')==='1';
 function dimensions(p){const k=id(p),s=LOCK?{}:(pref.sizes[k]||{}),mobile=document.documentElement.dataset.nnvm==='mobile',span=Number.isFinite(s.span)?Math.max(20,Math.min(100,s.span)):mobile?100:base[k]||100;p.style.gridColumn='span '+Math.round(span);const pos=LOCK?null:pref.positions?.[document.documentElement.dataset.nnvm||'pc']?.[k];p.style.position=pos?'absolute':'';p.style.left=pos?Math.min(pos.x,100-span)+'%':'';p.style.top=pos?Math.max(0,pos.y)+'px':'';p.style.width=pos?'calc('+Math.round(span)+'% - 12px)':'';p.style.gridRow=k==='taio'&&!pref.moved&&!mobile?'span 2':'auto';if(Number.isFinite(s.height)&&s.height>=100){p.style.height=s.height+'px';p.classList.add('nn-panel-fixed');}else{p.style.height='';p.classList.remove('nn-panel-fixed');}}
 const dimensionsBase=dimensions;
 dimensions=function(p){dimensionsBase(p);const folded=pref.folded?.[id(p)]===true;p.classList.toggle('nn-panel-folded',folded);const b=p.querySelector('.nn-panel-fold');if(b){b.textContent='';b.title=folded?'展開する':'折りたたむ';b.setAttribute('aria-label',b.title);b.setAttribute('aria-expanded',String(!folded));}if(folded){p.style.height='';p.style.gridRow='auto';p.classList.remove('nn-panel-fixed');}};
 const foldStyle=document.createElement('style');foldStyle.textContent='#dashboard .nn-panel-folded>.nn-panel-body,#dashboard .nn-panel-folded>.nn-panel-edge{display:none!important;}#dashboard .nn-panel-fold{flex:none;font:inherit;font-size:12px;width:30px;height:28px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:1px solid #78776c;background:#fff5df;color:#3d3428;cursor:pointer;}#dashboard .nn-panel-fold::before{content:"";width:8px;height:8px;border-top:2px solid currentColor;border-left:2px solid currentColor;transform:translateY(2px) rotate(45deg);}#dashboard .nn-panel-fold[aria-expanded=false]::before{transform:translateY(-2px) rotate(225deg);}#dashboard .nn-panel-fold:focus-visible{outline:2px solid var(--green-deep);outline-offset:2px;}';document.head.appendChild(foldStyle);
 const charts=new WeakSet(),measure=document.createElement('canvas').getContext('2d');
 function fitChart(box){const chart=box.querySelector('.bars2'),cells=chart?.querySelectorAll('.bcol2');if(!cells?.length||!box.clientWidth)return;const labels=[...chart.querySelectorAll('.bv2,.bl2')],style=getComputedStyle(labels[0]);measure.font=style.fontWeight+' 14px '+style.fontFamily;const widest=Math.max(...labels.map(e=>measure.measureText(e.textContent).width))+6,gap=parseFloat(getComputedStyle(chart).columnGap)||0,available=(box.clientWidth-4-gap*(cells.length-1))/cells.length,font=Math.max(10,Math.min(14,available/widest*14)),min=Math.ceil(widest*font/14*cells.length+gap*(cells.length-1));chart.style.setProperty('--monthly-font',font.toFixed(2)+'px');chart.style.setProperty('--monthly-min',min+'px');}
 const chartObserver=new ResizeObserver(entries=>entries.forEach(e=>fitChart(e.target)));
 let pending=false;
 function scan(){pending=false;let grid=root.querySelector('.nn-panel-grid');const panels=[...root.querySelectorAll('.dpanel')].filter(p=>p.querySelector(':scope>h4>.dash-settings-btn'));if(!panels.length)return;if(!grid){grid=document.createElement('div');grid.className='nn-panel-grid';root.querySelector('#dtlbox').after(grid);}
  for(const p of panels){if(!p.dataset.panelId){const b=p.querySelector('.dash-settings-btn'),m=b.getAttribute('onclick').match(/'([^']+)'/);if(!m)continue;p.dataset.panelId=m[1];const body=document.createElement('div');body.className='nn-panel-body';[...p.childNodes].filter(n=>n!==p.querySelector('h4')).forEach(n=>body.appendChild(n));p.appendChild(body);wire(p);}
   if(p.parentElement!==grid)grid.appendChild(p);dimensions(p);
  }
  root.querySelectorAll('.bars-scroll').forEach(box=>{if(!charts.has(box)){charts.add(box);chartObserver.observe(box);fitChart(box);document.fonts.ready.then(()=>fitChart(box));}});
  const wanted=pref.order.map(k=>panels.find(p=>id(p)===k)).filter(Boolean);if(wanted.some((p,i)=>grid.children[i]!==p))wanted.forEach(p=>grid.appendChild(p));
  extent();
  root.querySelectorAll('.dash-top2,.dash-bot2').forEach(e=>{if(!e.querySelector('.dpanel'))e.remove();});
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(scan);}}
 function suppressClick(){document.addEventListener('click',stop,true);setTimeout(()=>document.removeEventListener('click',stop,true),400);function stop(e){e.preventDefault();e.stopImmediatePropagation();document.removeEventListener('click',stop,true);}}
 /* 2026-09-24b 枠の重なりをなくす。自由配置（左％・上px）は他の枠を見ずに置いていたので、動かした枠や
    中身が伸びた枠（折りたたみを開く・表が増える）が下の枠に重なっていた（本人のスマホ写真）。
    上にある枠から順に置き、先に置いた枠と左右が重なる範囲で上下が重なる（すき間12px未満）なら、その枠のすぐ下へずらす。
    ずらすのは下向きだけ。左右の位置と大きさは変えない。y と offsetHeight はどちらも倍率をかける前の値（§61）。 */
 const GAP=12;let resolving=false,dragActive=false;
 function resolve(){const mode=document.documentElement.dataset.nnvm||'pc',pos=LOCK?null:pref.positions?.[mode],grid=root.querySelector('.nn-panel-grid');if(!pos||!grid||resolving||dragActive)return false;
  const items=[...grid.children].filter(p=>p.dataset.panelId&&pos[id(p)]&&p.offsetHeight>0).map(p=>{const span=parseInt(p.style.gridColumn.replace('span ',''))||100,q=pos[id(p)];return {p,k:id(p),x:Math.min(q.x,100-span),w:span,y:Math.max(0,q.y),h:p.offsetHeight};});
  items.sort((a,b)=>a.y-b.y||a.x-b.x||pref.order.indexOf(a.k)-pref.order.indexOf(b.k));
  const placed=[];let changed=false;
  for(const it of items){for(let guard=0;guard<items.length+2;guard++){const hit=placed.find(o=>it.x<o.x+o.w-0.5&&o.x<it.x+it.w-0.5&&it.y<o.y+o.h+GAP&&o.y<it.y+it.h+GAP);if(!hit)break;it.y=hit.y+hit.h+GAP;}
   placed.push(it);if(Math.abs(it.y-Math.max(0,pos[it.k].y))>0.5){pos[it.k]={x:pos[it.k].x,y:it.y};changed=true;}}
  if(changed){resolving=true;try{items.forEach(it=>dimensions(it.p));}finally{resolving=false;}}
  return changed;}
 function extent(){const grid=root.querySelector('.nn-panel-grid');if(!grid)return;grid.style.position='relative';if(resolve())save();if(!LOCK&&pref.positions?.[document.documentElement.dataset.nnvm||'pc'])grid.style.height=Math.max(...[...grid.children].map(p=>p.offsetTop+p.offsetHeight),100)+12+'px';else grid.style.height='';}
 const panelObserver=new ResizeObserver(extent);
 function freePositions(){const mode=document.documentElement.dataset.nnvm||'pc';pref.positions||={};if(!pref.positions[mode]){const grid=root.querySelector('.nn-panel-grid'),gr=grid.getBoundingClientRect(),z=gr.width/grid.offsetWidth;pref.positions[mode]={};for(const p of grid.children){const r=p.getBoundingClientRect();pref.positions[mode][id(p)]={x:Math.max(0,(r.left-gr.left-6*z)/gr.width*100),y:(r.top-gr.top)/z};}for(const p of grid.children)dimensions(p);}return pref.positions[mode];}
 function wire(p){panelObserver.observe(p);
  const head=p.querySelector('h4');const fold=document.createElement('button');fold.type='button';fold.className='nn-panel-fold';fold.onclick=()=>{if(!pref.folded||typeof pref.folded!=='object'||Array.isArray(pref.folded))pref.folded={};pref.folded[id(p)]=pref.folded[id(p)]!==true;dimensions(p);extent();save();};head.appendChild(fold);head.title='ドラッグで自由に配置／辺・角でサイズ変更／ダブルクリックで配置を戻す';
  head.addEventListener('dblclick',e=>{if(e.target.closest('button,.zx'))return;delete pref.sizes[id(p)];delete pref.positions;root.querySelectorAll('.dpanel[data-panel-id]').forEach(dimensions);extent();save();});
  head.addEventListener('pointerdown',e=>{
   if(LOCK||e.button!==0||e.target.closest('button,.zx,input,select,a'))return;e.preventDefault();e.stopPropagation();const x=e.clientX,y=e.clientY,scroll=root.scrollTop,grid=p.parentElement,z=grid.getBoundingClientRect().width/grid.offsetWidth;let dragging=false,old=null,positions;head.setPointerCapture(e.pointerId);
   function move(ev){if(!dragging&&Math.hypot(ev.clientX-x,ev.clientY-y)<6)return;if(!dragging){positions=freePositions();old={...positions[id(p)]};dragging=true;dragActive=true;}p.style.zIndex='20';p.classList.add('nn-panel-drag');const rr=root.getBoundingClientRect();if(ev.clientY>rr.bottom-30)root.scrollTop+=18;if(ev.clientY<rr.top+30)root.scrollTop-=18;const span=parseInt(p.style.gridColumn.replace('span ',''))||100;positions[id(p)]={x:Math.max(0,Math.min(100-span,old.x+(ev.clientX-x)/grid.getBoundingClientRect().width*100)),y:Math.max(0,old.y+(ev.clientY-y)/z+root.scrollTop-scroll)};dimensions(p);extent();}
   function done(ev){head.removeEventListener('pointermove',move);head.removeEventListener('pointerup',done);head.removeEventListener('pointercancel',done);if(head.hasPointerCapture(ev.pointerId))head.releasePointerCapture(ev.pointerId);p.classList.remove('nn-panel-drag');p.style.zIndex='';dragActive=false;if(dragging){if(ev.type==='pointercancel')positions[id(p)]=old;dimensions(p);extent();save();suppressClick();}}
   head.addEventListener('pointermove',move);head.addEventListener('pointerup',done);head.addEventListener('pointercancel',done);
  });
  if(!LOCK)for(const edge of ['n','s','w','e','nw','ne','sw','se']){const grip=document.createElement('div');grip.className='nn-panel-edge';grip.dataset.edge=edge;grip.title=edge.length===2?'ドラッグで枠の幅と高さを変更':edge==='n'||edge==='s'?'ドラッグで枠の高さを変更':'ドラッグで枠の幅を変更';p.appendChild(grip);grip.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;e.preventDefault();e.stopPropagation();const startX=e.clientX,startY=e.clientY,r=p.getBoundingClientRect(),z=r.width/p.offsetWidth,grid=p.parentElement,gw=grid.getBoundingClientRect().width,old={...(pref.sizes[id(p)]||{})};grip.setPointerCapture(e.pointerId);
   function move(ev){const s={...old};if(/[ns]/.test(edge))s.height=Math.max(100,Math.min(2400,(r.height+(ev.clientY-startY)*(edge.includes('n')?-1:1))/z));if(/[we]/.test(edge))s.span=Math.max(20,Math.min(100,Math.round((r.width+12*z+(ev.clientX-startX)*(edge.includes('w')?-1:1))/gw*100)));pref.sizes[id(p)]=s;dimensions(p);extent();}
   function done(ev){grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',done);grip.removeEventListener('pointercancel',cancel);if(grip.hasPointerCapture(ev.pointerId))grip.releasePointerCapture(ev.pointerId);save();suppressClick();}
   function cancel(ev){pref.sizes[id(p)]=old;dimensions(p);done(ev);}grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',done);grip.addEventListener('pointercancel',cancel);
  });}
 }
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});window.addEventListener('resize',schedule);scan();
})();
