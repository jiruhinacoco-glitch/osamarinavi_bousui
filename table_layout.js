/* 表の行高・全体高さ・列/行の順序。セル単体の値は入れ替えない。 */
(function(){
 const KEY='nn_table_layout_v1';let prefs={};const known=new WeakMap();
 try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))prefs=v;}catch(e){}
 const css=document.createElement('style');css.textContent=`
 .nn-row-anchor{position:relative!important;}
 .nn-row-grip{position:absolute;bottom:-3px;left:0;right:0;height:6px;z-index:9;cursor:ns-resize;touch-action:none;}
 .nn-table-height{caption-side:bottom;padding:0!important;height:0;position:relative;}
 .nn-table-height>div{position:absolute;left:0;right:0;top:-3px;height:6px;cursor:ns-resize;touch-action:none;z-index:10;}
 .nn-row-drop{outline:2px dashed #8d6232!important;outline-offset:-3px;}
 .nn-th-label .hbarmt{display:inline!important;}
 .nn-cell-drop{outline:2px dashed #8d6232!important;outline-offset:-3px;}
 .nn-th-label{display:inline-flex;align-items:center;white-space:nowrap;gap:3px;}
 .nn-th-label .sortbtn{display:inline-block;flex:none;margin:0;}
 table th.nn-col-head{background:#f4dfb5!important;color:#3d3428;}
 @media print{.nn-row-grip,.nn-table-height{display:none!important;}}
 `;document.head.appendChild(css);
 function text(c){const n=c.cloneNode(true);n.querySelectorAll('button,.sortbtn,.nn-row-grip,.nn-col-grip,input').forEach(x=>x.remove());return n.textContent.trim().replace(/\s+/g,' ');}
 function key(t){return location.pathname+'|'+(t.id||((t.closest('.dpanel')?.querySelector('.httl')?.textContent.trim()||'')+'|'+[...t.rows[0].cells].map(text).sort().join('|')));}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(e){if(typeof toast==='function')toast('表の配置は今回の表示に反映しました。端末には保存できません。');}}
 function rowId(r){return r.getAttribute('onclick')||[...r.cells].map(c=>c.getAttribute('data-row-id')||text(c)).sort().join('|');}
 function config(t){const k=t.dataset.tableLayoutKey;if(!prefs[k]||typeof prefs[k]!=='object'||Array.isArray(prefs[k]))prefs[k]={};const c=prefs[k];if(c.rowsHeight&&(typeof c.rowsHeight!=='object'||Array.isArray(c.rowsHeight)))delete c.rowsHeight;return c;}
 window.nnClearTableRowOrder=function(t){if(t?.dataset.tableLayoutKey){delete config(t).rows;save();}};
 function notice(){if(typeof toast==='function')toast('結合された行・列は、対応を保つためこの位置へ移動できません。');}
 function columnMove(t,from,to){const rows=[...t.rows],n=Math.max(...rows.map(r=>r.cells.length));if(rows.some(r=>[...r.cells].some(c=>c.rowSpan!==1)||r.cells.length!==n&&!(r.cells.length===1&&r.cells[0].colSpan===n))||rows.some(r=>r.cells.length===n&&[...r.cells].some(c=>c.colSpan!==1))){notice();return false;}
  rows.filter(r=>r.cells.length===n).forEach(r=>{const a=[...r.cells],m=a.splice(from,1)[0];a.splice(to,0,m);a.forEach(c=>r.appendChild(c));});if(window.nnRefreshTableResize)window.nnRefreshTableResize(t,from,to);return true;
 }
 function bodyRows(t){return [...t.rows].filter(r=>!r.querySelector('th')&&![...r.cells].some(c=>c.colSpan>1||c.rowSpan>1));}
 function suppress(){document.addEventListener('click',block,true);setTimeout(()=>document.removeEventListener('click',block,true),350);function block(e){e.preventDefault();e.stopImmediatePropagation();document.removeEventListener('click',block,true);}}
 function heightGrip(grip,target,t,all){grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const r=target.getBoundingClientRect(),z=r.height/target.offsetHeight,start=e.clientY,h=target.offsetHeight,old=target.style.height;grip.setPointerCapture(e.pointerId);
  function move(ev){target.style.height=Math.max(all?80:24,Math.min(2400,h+(ev.clientY-start)/z))+'px';}
  function done(ev){grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',done);grip.removeEventListener('pointercancel',cancel);if(grip.hasPointerCapture(ev.pointerId))grip.releasePointerCapture(ev.pointerId);const c=config(t);if(all)c.height=parseFloat(target.style.height);else{c.rowsHeight||={};c.rowsHeight[rowId(target)]=parseFloat(target.style.height);}save();suppress();}
  function cancel(ev){target.style.height=old;done(ev);}grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',done);grip.addEventListener('pointercancel',cancel);
 });}
 function decorate(t){if(!t.rows.length)return;let state=known.get(t);if(!state){t.dataset.tableLayoutKey=key(t);state={};known.set(t,state);wire(t);}
  for(const th of t.querySelectorAll('th')){const sort=th.querySelector(':scope>.sortbtn');if(sort){const wrap=document.createElement('span');wrap.className='nn-th-label';const nodes=[...th.childNodes].filter(n=>n===sort||n.nodeType===3||n.nodeType===1&&n.matches('.hbarmt'));th.insertBefore(wrap,nodes[0]||th.firstChild);nodes.forEach(n=>wrap.appendChild(n));}}
  const c=config(t);for(const r of [...t.rows]){const cell=r.cells[0];if(!cell)continue;if(!r.querySelector('.nn-row-grip')){cell.classList.add('nn-row-anchor');const g=document.createElement('div');g.className='nn-row-grip';g.title='上下にドラッグで行の高さを変更';cell.appendChild(g);heightGrip(g,r,t,false);}const h=c.rowsHeight?.[rowId(r)];if(Number.isFinite(h)&&h>=24&&h<=2400)r.style.height=h+'px';}
  if(!t.querySelector(':scope>.nn-table-height')){const cap=document.createElement('caption');cap.className='nn-table-height';const g=document.createElement('div');g.title='上下にドラッグで表全体の高さを変更';cap.appendChild(g);t.appendChild(cap);heightGrip(g,t,t,true);}
  if(Number.isFinite(c.height)&&c.height>=80&&c.height<=2400)t.style.height=c.height+'px';
  if(!state.restored){state.restored=true;const head=[...t.rows].find(r=>r.querySelector('th'));if(head&&Array.isArray(c.columns)){for(let i=0;i<c.columns.length;i++){const from=[...head.cells].findIndex(x=>text(x)===c.columns[i]);if(from>=0&&from!==i)columnMove(t,from,i);}}
   if(Array.isArray(c.rows)){const rows=bodyRows(t),parents=new Set(rows.map(r=>r.parentElement));for(const par of parents){const group=rows.filter(r=>r.parentElement===par),ordered=[...group].sort((a,b)=>{const ia=c.rows.indexOf(rowId(a)),ib=c.rows.indexOf(rowId(b));return (ia<0?1e6:ia)-(ib<0?1e6:ib);});const mark=document.createComment('row-order');group[0]?.before(mark);ordered.forEach(r=>mark.before(r));mark.remove();}}
  }
 }
 function wire(t){t.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button,input,select,textarea,a,.sortbtn,.nn-col-grip,.nn-row-grip,.nn-table-height'))return;const cell=e.target.closest('td,th');if(!cell||cell.closest('table')!==t)return;const row=cell.parentElement,isCol=cell.tagName==='TH',startX=e.clientX,startY=e.clientY;let drag=false,target=null;
  function mark(c,on){if(c)(isCol?c:c.parentElement).classList.toggle(isCol?'nn-cell-drop':'nn-row-drop',on);}
  function move(ev){if(!drag&&Math.hypot(ev.clientX-startX,ev.clientY-startY)<7)return;if(!drag){drag=true;cell.setPointerCapture(e.pointerId);}ev.preventDefault();const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest(isCol?'th':'td');if(hit&&hit.closest('table')===t&&hit!==cell){mark(target,false);target=hit;mark(target,true);}}
  function done(ev){document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',done,true);document.removeEventListener('pointercancel',done,true);mark(target,false);if(cell.hasPointerCapture(e.pointerId))cell.releasePointerCapture(e.pointerId);if(!drag)return;suppress();if(!target||ev.type==='pointercancel')return;
   const c=config(t);if(isCol){if(target.parentElement!==row)return;const from=[...row.cells].indexOf(cell),to=[...row.cells].indexOf(target);if(columnMove(t,from,to))c.columns=[...row.cells].map(text);}
   else{const dest=target.parentElement,rows=bodyRows(t);if(row.parentElement!==dest.parentElement||!rows.includes(row)||!rows.includes(dest)){notice();return;}const after=rows.indexOf(row)<rows.indexOf(dest);if(after)dest.after(row);else dest.before(row);c.rows=bodyRows(t).map(rowId);}save();
  }
  document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',done,true);document.addEventListener('pointercancel',done,true);
 });}
 let pending=false;function scan(){pending=false;document.querySelectorAll('table:not([data-nn-static])').forEach(decorate);}function schedule(){if(!pending){pending=true;requestAnimationFrame(scan);}}new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});scan();
})();
