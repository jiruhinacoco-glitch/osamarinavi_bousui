/* 全画面共通：列境界のドラッグ。表示倍率を除いて幅を保存する。 */
(function(){
 'use strict';
 const KEY='nn_table_widths_v1',seen=new WeakSet(),states=new WeakMap();let saved={};
 try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))saved=v;}catch(e){}
 const style=document.createElement('style');style.textContent=`
 .nn-col-head{position:relative!important;padding-right:12px!important;}
 .nn-col-grip{position:absolute!important;right:0!important;top:0!important;bottom:0!important;width:9px!important;min-width:0!important;height:100%!important;min-height:20px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;transform:none!important;cursor:col-resize!important;touch-action:none!important;z-index:8!important;}
 .nn-col-grip:after{content:none;}
 .nn-col-sized{table-layout:fixed!important;max-width:none!important;}
 .nn-col-sized :is(th,td){min-width:0!important;max-width:none!important;overflow-wrap:anywhere;white-space:normal!important;box-sizing:border-box;}
 .nn-col-scroll{overflow-x:auto;max-width:100%;min-width:0;}
 @media print{.nn-col-grip{display:none!important;}}
 `;document.head.appendChild(style);
 function label(cell){const copy=cell.cloneNode(true);copy.querySelectorAll('button,.sortbtn,.nn-col-grip').forEach(x=>x.remove());return copy.textContent.trim().replace(/\s+/g,' ');}
 function tableKey(t){const panel=t.closest('.dpanel,.msec,section'),title=panel?.querySelector('.httl,h2,h3,h4')?.textContent.trim()||'';return location.pathname+'|'+(t.id||title+'|'+t.className.replace(/nn-col-sized/g,'').trim()+'|'+[...t.rows[0].cells].map(label).join('|'));}
 function geometry(t){
  const occupied=[],list=[];let count=0;
  [...t.rows].forEach((r,y)=>{occupied[y]??=[];let x=0;[...r.cells].forEach(c=>{while(occupied[y][x])x++;const span=c.colSpan||1,rs=c.rowSpan||1;list.push({cell:c,start:x,span});for(let a=y;a<y+rs;a++){occupied[a]??=[];for(let b=x;b<x+span;b++)occupied[a][b]=true;}x+=span;count=Math.max(count,x);});});return {list,count};
 }
 function initSizing(t,geo){
  let state=states.get(t);if(state)return state;
  const rect=t.getBoundingClientRect(),scale=rect.width/t.offsetWidth;if(!scale||!rect.width)return null;
  const widths=Array(geo.count).fill(0);
  for(const c of geo.list)if(c.span===1&&!widths[c.start])widths[c.start]=c.cell.getBoundingClientRect().width/scale;
  for(let i=0;i<widths.length;i++)if(!widths[i])widths[i]=t.offsetWidth/widths.length;
  const key=tableKey(t),stored=saved[key];if(Array.isArray(stored)&&stored.length===widths.length&&stored.every(v=>Number.isFinite(v)&&v>=24&&v<=2000))widths.splice(0,widths.length,...stored);
  const group=document.createElement('colgroup');group.className='nn-col-group';widths.forEach(()=>group.appendChild(document.createElement('col')));
  const originalGroups=[...t.children].filter(x=>x.tagName==='COLGROUP');originalGroups.forEach(x=>x.remove());t.prepend(group);
  const originalStyle=t.getAttribute('style');t.classList.add('nn-col-sized');
  if(!t.parentElement.classList.contains('nn-col-scroll')){const wrap=document.createElement('div');wrap.className='nn-col-scroll';t.before(wrap);wrap.appendChild(t);}
  const originalWidths=geo.list.map(({cell})=>({cell,width:cell.style.getPropertyValue('width'),priority:cell.style.getPropertyPriority('width')}));
  state={widths,key,group,originalGroups,originalStyle,originalWidths,geo};states.set(t,state);draw(t,state);return state;
 }
 function draw(t,s){s.widths.forEach((w,i)=>s.group.children[i].style.width=w+'px');t.style.setProperty('width',s.widths.reduce((a,b)=>a+b,0)+'px','important');for(const {cell,start,span} of s.geo.list)cell.style.setProperty('width',s.widths.slice(start,start+span).reduce((a,b)=>a+b,0)+'px','important');}
 function persist(s){saved[s.key]=s.widths.slice();try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){if(typeof window.toast==='function')window.toast('列幅は今回の表示に反映しました。端末には保存できません。');}}
 function reset(t){const s=states.get(t);if(!s)return;delete saved[s.key];try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}s.group.remove();s.originalGroups.forEach(g=>t.prepend(g));if(s.originalStyle===null)t.removeAttribute('style');else t.setAttribute('style',s.originalStyle);for(const {cell,width,priority} of s.originalWidths){if(width)cell.style.setProperty('width',width,priority);else cell.style.removeProperty('width');}t.classList.remove('nn-col-sized');states.delete(t);}
 function enhance(t){
  /* ★2026-09-25b スマホでは列幅を変えない（つまみを作らず、保存済みの幅も使わない）。指で触れて崩れ、戻せなくなるため */
  if(document.documentElement.getAttribute('data-nnphone')==='1')return;
  if(!t.rows.length||seen.has(t)&&t.querySelector('.nn-col-grip'))return;if(seen.has(t))states.delete(t);seen.add(t);const geo=geometry(t);if(!geo.count)return;
  const head=[...t.rows].find(r=>[...r.cells].some(c=>c.tagName==='TH'))||t.rows[0];
  for(const c of geo.list.filter(c=>c.cell.parentElement===head)){
   const index=c.start+c.span-1,cell=c.cell;cell.classList.add('nn-col-head');const grip=document.createElement('button');grip.type='button';grip.className='nn-col-grip';grip.setAttribute('aria-label',(label(cell)||'列')+'の幅を調整');grip.title='左右にドラッグで列幅変更／ダブルクリックで幅を戻す';cell.appendChild(grip);
   grip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});grip.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();reset(t);});
   grip.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();const s=initSizing(t,geo);if(!s)return;
    const start=e.clientX,w=s.widths[index],scale=t.getBoundingClientRect().width/t.offsetWidth;grip.setPointerCapture(e.pointerId);
    function move(ev){s.widths[index]=Math.max(24,Math.min(2000,w+(ev.clientX-start)/scale));draw(t,s);}
    function done(ev){grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',done);grip.removeEventListener('pointercancel',cancel);if(grip.hasPointerCapture(ev.pointerId))grip.releasePointerCapture(ev.pointerId);persist(s);}
    function cancel(ev){s.widths[index]=w;draw(t,s);done(ev);}
    grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',done);grip.addEventListener('pointercancel',cancel);
   });
   grip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='Home'){reset(t);return;}const s=initSizing(t,geo);if(s){s.widths[index]=Math.max(24,Math.min(2000,s.widths[index]+(e.key==='ArrowRight'?10:-10)));draw(t,s);persist(s);}});
  }
  if(saved[tableKey(t)]){const restore=()=>{if(t.getBoundingClientRect().width)initSizing(t,geo);};restore();if(!states.has(t)){const obs=new ResizeObserver(()=>{restore();if(states.has(t))obs.disconnect();});obs.observe(t);}}
 }
 window.nnRefreshTableResize=function(t,from,to){const s=states.get(t);if(s){if(Number.isInteger(from)&&Number.isInteger(to)){const w=s.widths.splice(from,1)[0];s.widths.splice(to,0,w);}s.geo=geometry(t);s.key=tableKey(t);draw(t,s);persist(s);}t.querySelectorAll('.nn-col-grip').forEach(g=>g.remove());seen.delete(t);enhance(t);};
 let pending=false;function scan(){pending=false;document.querySelectorAll('table:not([data-nn-static])').forEach(enhance);}
 function schedule(){if(!pending){pending=true;requestAnimationFrame(scan);}}
 new MutationObserver(records=>{if(records.some(r=>(r.target.nodeType===1&&r.target.closest('table'))||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('table')||n.querySelector('table')))))schedule();}).observe(document.body,{childList:true,subtree:true});scan();
})();
