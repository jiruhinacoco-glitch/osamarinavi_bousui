/* 枠内の物件・表・円グラフを、行列の操作とは別につまんで配置する。 */
(function(){
 const root=document.getElementById('dashboard');if(!root)return;
 const KEY='nn_dash_widgets_v1';let prefs={};try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))prefs=v;}catch(e){}
 const style=document.createElement('style');style.textContent=`
 html body #dashboard .dpanel[data-panel-id="taio"] .scrollbox.nn-widget-canvas{height:var(--widget-height)!important;}
 #dashboard .nyuflex>div{min-width:0!important;max-width:100%;}
 #dashboard .nn-widget{position:relative;box-sizing:border-box;min-width:0;max-width:100%;margin-bottom:10px;flex:none;}
 #dashboard .nn-widget-move{height:18px;line-height:18px;display:block;text-align:right;color:#58665c;font-size:10px;font-weight:700;cursor:move;touch-action:none;user-select:none;}
 #dashboard .nn-widget-content{overflow:auto;box-sizing:border-box;min-height:0;}
 #dashboard .nn-widget-sized>.nn-widget-content{height:calc(100% - 18px);}
 #dashboard .nn-widget-content>.tblside{height:100%;min-width:0;}
 #dashboard .nn-widget-sized .tblside>table{height:100%;}
 #dashboard .nn-widget[data-widget-key*=chart] .nn-widget-content>div{height:100%;min-width:0!important;}
 #dashboard .nn-widget[data-widget-key="nyukin-table"] .nn-widget-content>div{height:100%;display:flex;flex-direction:column;}
 #dashboard .nn-widget[data-widget-key="nyukin-table"] .nn-widget-content>div>div:last-child{flex:1;min-height:0;overflow:auto;}
 #dashboard .nn-widget-sized[data-widget-key="nyukin-table"] table{height:100%;}
 #dashboard .nn-widget-content>table{width:100%;}
 #dashboard .nn-widget-sized>.nn-widget-content>table{height:100%;}
 #dashboard .nn-widget-content>.alert-row{margin:0;min-height:100%;box-sizing:border-box;flex-wrap:wrap;}
 #dashboard .nn-widget-content>.alert-row .nm{white-space:normal;overflow:visible;flex:1;min-width:140px;}
 #dashboard .nn-widget[data-widget-key*=chart] .nn-widget-content{text-align:center;overflow:hidden;}
 #dashboard .nn-widget[data-widget-key*=chart] svg{width:100%;height:calc(100% - 26px);min-height:80px;display:block;}
 #dashboard .nn-widget[data-widget-key*=chart]:not(.nn-widget-sized) .nn-widget-content{height:246px;}
 #dashboard .nn-widget-edge{position:absolute;z-index:14;touch-action:none;}
 #dashboard .nn-widget-edge[data-edge=n],#dashboard .nn-widget-edge[data-edge=s]{left:10px;right:10px;height:6px;cursor:ns-resize;}
 #dashboard .nn-widget-edge[data-edge=n]{top:-3px}#dashboard .nn-widget-edge[data-edge=s]{bottom:-3px}
 #dashboard .nn-widget-edge[data-edge=w],#dashboard .nn-widget-edge[data-edge=e]{top:10px;bottom:10px;width:6px;cursor:ew-resize;}
 #dashboard .nn-widget-edge[data-edge=w]{left:-3px}#dashboard .nn-widget-edge[data-edge=e]{right:-3px}
 #dashboard .nn-widget-edge[data-edge=nw],#dashboard .nn-widget-edge[data-edge=ne],#dashboard .nn-widget-edge[data-edge=sw],#dashboard .nn-widget-edge[data-edge=se]{width:12px;height:12px;z-index:15;}
 #dashboard .nn-widget-edge[data-edge=nw]{top:-3px;left:-3px;cursor:nwse-resize}#dashboard .nn-widget-edge[data-edge=ne]{top:-3px;right:-3px;cursor:nesw-resize}
 #dashboard .nn-widget-edge[data-edge=sw]{bottom:-3px;left:-3px;cursor:nesw-resize}#dashboard .nn-widget-edge[data-edge=se]{bottom:-3px;right:-3px;cursor:nwse-resize}
 #dashboard .nn-widget:has(.nn-widget-move:hover){outline:1px dashed #748476;}
 #dashboard .nyuflex{display:flex!important;flex-wrap:wrap!important;gap:12px;align-items:flex-start!important;}
 #dashboard .nyuflex>.nn-widget{flex:0 0 auto!important;max-width:100%;margin:0;}
 #dashboard .nyuflex>.nn-widget .nn-widget-content{background:#fff;}
 #dashboard .nyuflex .nn-widget-content>div{height:auto!important;display:block!important;}
 #dashboard .nyuflex .nn-widget-content>div>div:last-child{overflow:visible!important;}
 #dashboard .nyuflex .nn-col-scroll{overflow:visible!important;max-height:none!important;}
 #dashboard .nyuflex table{height:auto!important;}
 #dashboard .nyuflex table:not(.nn-col-sized){width:100%!important;}
 #dashboard .nyuflex .ncal{display:block!important;width:100%;}
 #dashboard .nyuflex .nn-widget-content{overflow:auto;}
 #dashboard .nyuflex .nn-widget-move{height:24px;line-height:24px;background:#f3f5ef;padding-right:6px;}
 #dashboard .nyuflex .nn-widget-sized>.nn-widget-content{height:calc(100% - 24px);}
 @media print{.nn-widget-move,.nn-widget-edge{display:none!important;}}
 `;document.head.appendChild(style);
 const mode=()=>document.documentElement.dataset.nnvm||'pc';
 function conf(w){return prefs[mode()+'|'+w.dataset.widgetKey]||{};}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(e){}}
 function apply(w){const c=conf(w);if(w.dataset.widgetKey.startsWith('nyukin-')){applyPayment(w);return;}if(Number.isFinite(c.width))w.style.width=Math.max(100,Math.min(w.parentElement.clientWidth,c.width))+'px';if(Number.isFinite(c.height)){w.style.height=Math.max(60,c.height)+'px';w.classList.add('nn-widget-sized');}if(Number.isFinite(c.x)&&Number.isFinite(c.y)){w.style.position='absolute';w.style.left=Math.max(0,Math.min(w.parentElement.clientWidth-w.offsetWidth,c.x))+'px';w.style.top=Math.max(0,c.y)+'px';}extent(w.parentElement);}
 function applyPayment(w){let c=conf(w);if(c.flowVersion!==1){c={...c,flowVersion:1};delete c.x;delete c.y;delete c.height;prefs[mode()+'|'+w.dataset.widgetKey]=c;save();}const parent=w.parentElement;w.style.position='relative';w.style.left='';w.style.top='';parent.style.height='';parent.classList.remove('nn-widget-canvas');const width=Math.max(Math.min(280,parent.clientWidth),Math.min(parent.clientWidth,Number.isFinite(c.width)?c.width:parent.clientWidth<600?parent.clientWidth:parent.clientWidth*(w.dataset.widgetKey==='nyukin-table'?.6:.4)-6));w.style.width=width+'px';if(Number.isFinite(c.height)){w.style.height=Math.max(180,Math.min(1000,c.height))+'px';w.classList.add('nn-widget-sized');}else{w.style.height='';w.classList.remove('nn-widget-sized');}}
 function paymentDrag(e,w,handle,edge){if(e.button!==0||e.target.closest('button'))return;e.preventDefault();e.stopPropagation();const parent=w.parentElement,r=w.getBoundingClientRect(),z=r.width/w.offsetWidth,x=e.clientX,y=e.clientY,old={...conf(w)};let active=false,after=null;handle.setPointerCapture(e.pointerId);
  function move(ev){if(!active&&Math.hypot(ev.clientX-x,ev.clientY-y)<5)return;active=true;if(edge){const c={...old};if(/[we]/.test(edge))c.width=Math.max(Math.min(280,parent.clientWidth),Math.min(parent.clientWidth,(r.width+(ev.clientX-x)*(edge.includes('w')?-1:1))/z));if(/[ns]/.test(edge))c.height=Math.max(180,Math.min(1000,(r.height+(ev.clientY-y)*(edge.includes('n')?-1:1))/z));prefs[mode()+'|'+w.dataset.widgetKey]=c;applyPayment(w);}else{const other=[...parent.children].find(v=>v!==w&&v.classList.contains('nn-widget'));if(other){const q=other.getBoundingClientRect();after=Math.abs(ev.clientY-(q.top+q.height/2))>q.height/2?ev.clientY>q.top+q.height/2:ev.clientX>q.left+q.width/2;other.style.outline='2px dashed #748476';}}}
  function done(ev){handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',done);handle.removeEventListener('pointercancel',done);if(handle.hasPointerCapture(ev.pointerId))handle.releasePointerCapture(ev.pointerId);[...parent.children].forEach(v=>v.style.outline='');if(!active)return;if(ev.type==='pointercancel'){prefs[mode()+'|'+w.dataset.widgetKey]=old;applyPayment(w);}else if(!edge&&after!==null){const other=[...parent.children].find(v=>v!==w&&v.classList.contains('nn-widget'));if(other){if(after)other.after(w);else other.before(w);const table=parent.querySelector('[data-widget-key="nyukin-table"]');prefs[mode()+'|nyukin-table']={...conf(table),afterCalendar:parent.firstElementChild!==table};}}save();}
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',done);handle.addEventListener('pointercancel',done);
 }
 function extent(parent){if(parent.classList.contains('nyuflex'))return;const children=[...parent.children].filter(e=>e.classList.contains('nn-widget'));if(children.some(e=>e.style.position==='absolute')){parent.style.position='relative';parent.classList.add('nn-widget-canvas');const h=Math.max(60,...children.map(e=>e.offsetTop+e.offsetHeight))+10+'px';parent.style.height=h;parent.style.setProperty('--widget-height',h);}}
 const ro=new ResizeObserver(es=>es.forEach(e=>extent(e.target.parentElement)));
 function free(parent){const ws=[...parent.children].filter(e=>e.classList.contains('nn-widget'));const r=parent.getBoundingClientRect(),z=r.width/parent.offsetWidth;parent.style.position='relative';const states=ws.map(w=>{const q=w.getBoundingClientRect();return [w,{...conf(w),x:(q.left-r.left)/z,y:(q.top-r.top)/z,width:w.offsetWidth}];});for(const [w,c] of states){prefs[mode()+'|'+w.dataset.widgetKey]=c;apply(w);}}
 function stopClick(){const stop=e=>{e.preventDefault();e.stopImmediatePropagation();document.removeEventListener('click',stop,true);};document.addEventListener('click',stop,true);setTimeout(()=>document.removeEventListener('click',stop,true),350);}
 function wire(handle,w,edge){handle.addEventListener('pointerdown',e=>{if(w.dataset.widgetKey.startsWith('nyukin-')){paymentDrag(e,w,handle,edge);return;}if(e.button!==0)return;e.preventDefault();e.stopPropagation();const x=e.clientX,y=e.clientY,r=w.getBoundingClientRect(),z=r.width/w.offsetWidth,start={...conf(w)},width=w.offsetWidth,height=w.offsetHeight;let active=false,initial;handle.setPointerCapture(e.pointerId);
  function move(ev){if(!active&&Math.hypot(ev.clientX-x,ev.clientY-y)<5)return;if(!active){free(w.parentElement);initial={...conf(w)};active=true;}const dx=(ev.clientX-x)/z,dy=(ev.clientY-y)/z,c={...initial};if(!edge){c.x=Math.max(0,Math.min(w.parentElement.clientWidth-w.offsetWidth,initial.x+dx));c.y=Math.max(0,initial.y+dy);}else{if(/[we]/.test(edge))c.width=Math.max(120,Math.min(w.parentElement.clientWidth-initial.x,width+dx*(edge.includes('w')?-1:1)));if(/[ns]/.test(edge))c.height=Math.max(60,Math.min(1600,height+dy*(edge.includes('n')?-1:1)));}prefs[mode()+'|'+w.dataset.widgetKey]=c;apply(w);}
  function done(ev){handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',done);handle.removeEventListener('pointercancel',done);if(handle.hasPointerCapture(ev.pointerId))handle.releasePointerCapture(ev.pointerId);if(active){if(ev.type==='pointercancel'){prefs[mode()+'|'+w.dataset.widgetKey]=start;apply(w);}save();stopClick();}}
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',done);handle.addEventListener('pointercancel',done);
 });}
 function resetPayment(parent){for(const w of parent.querySelectorAll(':scope>.nn-widget')){delete prefs[mode()+'|'+w.dataset.widgetKey];applyPayment(w);}const t=parent.querySelector(':scope>[data-widget-key="nyukin-table"]');if(t)parent.prepend(t);save();}
 function wrap(element,key,label){if(!element||element.closest('.nn-widget'))return;const w=document.createElement('div');w.className='nn-widget';w.dataset.widgetKey=key;const handle=document.createElement('span');handle.className='nn-widget-move';handle.textContent='⠿ '+label+'を移動';handle.title='ドラッグで移動／辺・角でサイズ変更／ダブルクリックで元に戻す';if(key.startsWith('nyukin-')){handle.title='ドラッグで表とカレンダーの並び順を変更／辺・角でサイズ変更';const reset=document.createElement('button');reset.type='button';reset.textContent='配置を戻す';reset.style.cssText='font-size:10px;margin-left:8px;padding:0 5px';reset.addEventListener('click',e=>{e.stopPropagation();resetPayment(w.parentElement);});handle.append(reset);}const content=document.createElement('div');content.className='nn-widget-content';element.before(w);w.append(handle,content);content.append(element);if(key==='nyukin-table')w.style.width=w.parentElement.clientWidth<600?'100%':'60%';if(key==='stt-chart')w.style.width='246px';else if(key==='stt-table')w.style.width=w.parentElement.clientWidth<600?'100%':'calc(100% - 258px)';wire(handle,w,null);handle.addEventListener('dblclick',()=>{const parent=w.parentElement;if(key.startsWith('nyukin-')){resetPayment(parent);return;}for(const item of [...parent.children].filter(e=>e.classList.contains('nn-widget'))){delete prefs[mode()+'|'+item.dataset.widgetKey];item.style.cssText='';item.classList.remove('nn-widget-sized');}parent.style.height='';parent.classList.remove('nn-widget-canvas');parent.style.removeProperty('--widget-height');save();});for(const edge of ['n','s','w','e','nw','ne','sw','se']){const g=document.createElement('div');g.className='nn-widget-edge';g.dataset.edge=edge;g.title='ドラッグでサイズ変更';w.append(g);wire(g,w,edge);}apply(w);ro.observe(w);}
 let pending=false;function scan(){pending=false;const st=root.querySelector('[data-panel-id="stt"] .stflex');if(st){wrap(st.querySelector(':scope>.tblside'),'stt-table','表');const svg=st.querySelector(':scope>div>svg');if(svg)wrap(svg.parentElement,'stt-chart','円グラフ');}for(const id of ['bugakari','nyukin']){const t=root.querySelector('[data-panel-id="'+id+'"] table');wrap(id==='nyukin'?t?.closest('.nyuflex')?.querySelector(':scope>div:first-child'):t,id+'-table','表');if(id==='nyukin'){const parent=t?.closest('.nyuflex');wrap(parent?.querySelector(':scope>.ncal'),'nyukin-calendar','カレンダー');if(parent){const table=parent.querySelector(':scope>[data-widget-key="nyukin-table"]'),cal=parent.querySelector(':scope>[data-widget-key="nyukin-calendar"]');if(table&&cal){if(conf(table).afterCalendar&&parent.firstElementChild!==cal)parent.prepend(cal);if(!conf(table).afterCalendar&&parent.firstElementChild!==table)parent.prepend(table);}}}}}
 new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(scan);}}).observe(root,{childList:true,subtree:true});window.addEventListener('resize',()=>root.querySelectorAll('.nn-widget').forEach(apply));scan();
})();
