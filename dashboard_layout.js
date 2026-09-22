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
 #dashboard .nn-panel-body{min-height:0;}
 #dashboard .nn-panel-fixed{display:flex;flex-direction:column;}
 #dashboard .nn-panel-fixed>.nn-panel-body{flex:1;overflow:auto;}
 html[data-nnphone="1"][data-nnvm="mobile"] #dashboard .nn-panel-grid{grid-template-columns:repeat(100,minmax(0,1fr));}
 @media print{.nn-panel-edge{display:none}}
 `;document.head.appendChild(css);
 function save(){try{localStorage.setItem(KEY,JSON.stringify(pref));}catch(e){if(typeof toast==='function')toast('今回の配置に反映しました。端末には保存できません。');}}
 const id=p=>p.dataset.panelId;
 function dimensions(p){const k=id(p),s=pref.sizes[k]||{},mobile=document.documentElement.dataset.nnvm==='mobile',span=Number.isFinite(s.span)?Math.max(20,Math.min(100,s.span)):mobile?100:base[k]||100;p.style.gridColumn='span '+Math.round(span);p.style.gridRow=k==='taio'&&!pref.moved&&!mobile?'span 2':'auto';if(Number.isFinite(s.height)&&s.height>=100){p.style.height=s.height+'px';p.classList.add('nn-panel-fixed');}else{p.style.height='';p.classList.remove('nn-panel-fixed');}}
 let pending=false;
 function scan(){pending=false;let grid=root.querySelector('.nn-panel-grid');const panels=[...root.querySelectorAll('.dpanel')].filter(p=>p.querySelector(':scope>h4>.dash-settings-btn'));if(!panels.length)return;if(!grid){grid=document.createElement('div');grid.className='nn-panel-grid';root.querySelector('#dtlbox').after(grid);}
  for(const p of panels){if(!p.dataset.panelId){const b=p.querySelector('.dash-settings-btn'),m=b.getAttribute('onclick').match(/'([^']+)'/);if(!m)continue;p.dataset.panelId=m[1];const body=document.createElement('div');body.className='nn-panel-body';[...p.childNodes].filter(n=>n!==p.querySelector('h4')).forEach(n=>body.appendChild(n));p.appendChild(body);wire(p);}
   if(p.parentElement!==grid)grid.appendChild(p);dimensions(p);
  }
  const wanted=pref.order.map(k=>panels.find(p=>id(p)===k)).filter(Boolean);if(wanted.some((p,i)=>grid.children[i]!==p))wanted.forEach(p=>grid.appendChild(p));
  root.querySelectorAll('.dash-top2,.dash-bot2').forEach(e=>{if(!e.querySelector('.dpanel'))e.remove();});
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(scan);}}
 function suppressClick(){document.addEventListener('click',stop,true);setTimeout(()=>document.removeEventListener('click',stop,true),400);function stop(e){e.preventDefault();e.stopImmediatePropagation();document.removeEventListener('click',stop,true);}}
 function wire(p){
  const head=p.querySelector('h4');head.title='ドラッグで枠を移動／四辺をドラッグでサイズ変更／見出しをダブルクリックでサイズを戻す';
  head.addEventListener('dblclick',e=>{if(e.target.closest('button,.zx'))return;delete pref.sizes[id(p)];dimensions(p);save();});
  head.addEventListener('pointerdown',e=>{
   if(e.button!==0||e.target.closest('button,.zx,input,select,a'))return;e.preventDefault();e.stopPropagation();const x=e.clientX,y=e.clientY;let dragging=false,target=null;head.setPointerCapture(e.pointerId);
   function move(ev){if(!dragging&&Math.hypot(ev.clientX-x,ev.clientY-y)<6)return;dragging=true;p.classList.add('nn-panel-drag');const next=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.dpanel[data-panel-id]');if(next&&next!==p&&root.contains(next)){target?.classList.remove('nn-panel-target');target=next;target.classList.add('nn-panel-target');}const rr=root.getBoundingClientRect();if(ev.clientY>rr.bottom-30)root.scrollTop+=18;if(ev.clientY<rr.top+30)root.scrollTop-=18;}
   function done(ev){head.removeEventListener('pointermove',move);head.removeEventListener('pointerup',done);head.removeEventListener('pointercancel',cancel);p.classList.remove('nn-panel-drag');target?.classList.remove('nn-panel-target');if(head.hasPointerCapture(ev.pointerId))head.releasePointerCapture(ev.pointerId);if(dragging&&target&&ev.type!=='pointercancel'){const a=pref.order.filter(k=>k!==id(p)),at=a.indexOf(id(target));a.splice(at,0,id(p));pref.order=a;pref.moved=true;save();schedule();suppressClick();}}
   function cancel(ev){done(ev);}head.addEventListener('pointermove',move);head.addEventListener('pointerup',done);head.addEventListener('pointercancel',cancel);
  });
  for(const edge of ['n','s','w','e']){const grip=document.createElement('div');grip.className='nn-panel-edge';grip.dataset.edge=edge;grip.title=edge==='n'||edge==='s'?'ドラッグで枠の高さを変更':'ドラッグで枠の幅を変更';p.appendChild(grip);grip.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;e.preventDefault();e.stopPropagation();const startX=e.clientX,startY=e.clientY,r=p.getBoundingClientRect(),z=r.width/p.offsetWidth,grid=p.parentElement,gw=grid.getBoundingClientRect().width,old={...(pref.sizes[id(p)]||{})};grip.setPointerCapture(e.pointerId);
   function move(ev){const s={...old};if(edge==='n'||edge==='s')s.height=Math.max(100,Math.min(2400,(r.height+(ev.clientY-startY)*(edge==='n'?-1:1))/z));else s.span=Math.max(20,Math.min(100,Math.round((r.width+12*z+(ev.clientX-startX)*(edge==='w'?-1:1))/gw*100)));pref.sizes[id(p)]=s;dimensions(p);}
   function done(ev){grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',done);grip.removeEventListener('pointercancel',cancel);if(grip.hasPointerCapture(ev.pointerId))grip.releasePointerCapture(ev.pointerId);save();suppressClick();}
   function cancel(ev){pref.sizes[id(p)]=old;dimensions(p);done(ev);}grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',done);grip.addEventListener('pointercancel',cancel);
  });}
 }
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});window.addEventListener('resize',schedule);scan();
})();
