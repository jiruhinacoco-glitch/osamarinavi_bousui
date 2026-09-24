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
 #recordTable .nn-col-source,#recordTable .nn-col-target{border-left:2px dashed #8d6232!important;border-right:2px dashed #8d6232!important;background:#fff1c9!important;}
 #recordTable th.nn-col-source,#recordTable th.nn-col-target{border-top:2px dashed #8d6232!important;}
 #recordTable tr:last-child td.nn-col-source,#recordTable tr:last-child td.nn-col-target{border-bottom:2px dashed #8d6232!important;}
 #recordTable .nn-col-source{background:#e4f0dd!important;}#recordTable .nn-row-source{outline:2px dashed #467542;outline-offset:-3px;}
 .nn-cell-drop{outline:2px dashed #8d6232!important;outline-offset:-3px;}
 .nn-th-label{display:inline-flex;align-items:center;white-space:nowrap;gap:3px;}
 .nn-th-label .sortbtn{display:inline-block;flex:none;margin:0;}
 table th.nn-col-head{background:#f4dfb5!important;color:#3d3428;}
 @media print{.nn-row-grip,.nn-table-height{display:none!important;}}
 /* 2026-09-24b スマホ（指）：長押しで選ぶ→「移動中」の印→移動先をタップ。長押しで文字選択・呼び出しメニューが出ないように */
 html[data-nnphone="1"] table:not([data-nn-static]) td,html[data-nnphone="1"] table:not([data-nn-static]) th{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;}
 html body table.nn-picking :is(th,td,tr).nn-pick-src:not(#nn-x){background:#ffe07a!important;outline:3px solid #b07a12!important;outline-offset:-3px;}
 html body table.nn-picking tr.nn-pick-src>td:not(#nn-x){background:#ffe07a!important;}
 table.nn-picking th,table.nn-picking td{cursor:pointer;}
 table.nn-picking.nn-pick-col th:not(.nn-pick-src){outline:2px dashed #8d6232;outline-offset:-3px;}
 table.nn-picking.nn-pick-row tr:not(.nn-pick-src)>td:first-child{box-shadow:inset 4px 0 0 #8d6232;}
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
 function suppress(t){document.addEventListener('click',block,true);setTimeout(()=>document.removeEventListener('click',block,true),350);function block(e){if(t?.id==='recordTable'&&!t.contains(e.target)){document.removeEventListener('click',block,true);return;}e.preventDefault();e.stopImmediatePropagation();document.removeEventListener('click',block,true);}}
 function heightGrip(grip,target,t,all){grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const r=target.getBoundingClientRect(),z=r.height/target.offsetHeight,start=e.clientY,h=target.offsetHeight,old=target.style.height;grip.setPointerCapture(e.pointerId);
  function move(ev){target.style.height=Math.max(all?80:24,Math.min(2400,h+(ev.clientY-start)/z))+'px';}
  function done(ev){grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',done);grip.removeEventListener('pointercancel',cancel);if(grip.hasPointerCapture(ev.pointerId))grip.releasePointerCapture(ev.pointerId);const c=config(t);if(all)c.height=parseFloat(target.style.height);else{c.rowsHeight||={};c.rowsHeight[rowId(target)]=parseFloat(target.style.height);}save();suppress(t);}
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
 /* 列・行を実際に入れ替える（マウスのドラッグと、指の「長押し→タップ」の両方がここを通る） */
 function doMove(t,cell,target,isCol){const row=cell.parentElement,c=config(t);if(isCol){if(target.parentElement!==row)return false;const from=[...row.cells].indexOf(cell),to=[...row.cells].indexOf(target);if(columnMove(t,from,to))c.columns=[...row.cells].map(text);else return false;}
  else{const dest=target.parentElement,rows=bodyRows(t);if(row.parentElement!==dest.parentElement||!rows.includes(row)||!rows.includes(dest)){notice();return false;}const after=rows.indexOf(row)<rows.indexOf(dest);if(after)dest.after(row);else dest.before(row);c.rows=bodyRows(t).map(rowId);}save();return true;}
 /* 2026-09-24b 指で触ったとき：ドラッグでは動かさない（表をスクロールしただけで列が入れ替わっていた）。
    ①約0.5秒の長押しで選ぶ → 黄色の「移動中」の印と、移動できる先に点線 ②移動先をタップで入れ替え
    ③選んだものをもう一度タップ・表の外をタップ・Esc で取り消し。途中で指が動いたら長押しにしない（スクロール優先）。 */
 let pick=null;
 function pickClear(){if(!pick)return;const {t,cell,isCol}=pick;t.classList.remove('nn-picking','nn-pick-col','nn-pick-row');(isCol?cell:cell.parentElement).classList.remove('nn-pick-src');pick=null;}
 function pickStart(t,cell,isCol){pickClear();const row=cell.parentElement;if(!isCol&&!bodyRows(t).includes(row)){notice();return;}pick={t,cell,isCol,at:Date.now()};t.classList.add('nn-picking',isCol?'nn-pick-col':'nn-pick-row');(isCol?cell:row).classList.add('nn-pick-src');try{navigator.vibrate&&navigator.vibrate(15);}catch(_){}if(typeof toast==='function')toast((isCol?'列':'行')+'を選びました。移動先の'+(isCol?'見出し':'行')+'をタップしてください（もう一度タップで取り消し）');}
 document.addEventListener('click',e=>{if(!pick)return;const {t,cell,isCol}=pick;e.preventDefault();e.stopImmediatePropagation();
  if(Date.now()-pick.at<300)return;   /* 長押しの指を離した直後のクリック＝選んだ操作の続き。移動先のタップではない */const hit=e.target.closest&&e.target.closest(isCol?'th':'td');
  if(!hit||hit.closest('table')!==t||hit===cell||(!isCol&&hit.parentElement===cell.parentElement)){pickClear();if(typeof toast==='function')toast('移動を取り消しました');return;}
  const ok=doMove(t,cell,hit,isCol);pickClear();if(ok&&typeof toast==='function')toast((isCol?'列':'行')+'を移動しました');},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')pickClear();});
 function wireTouch(t,e,cell,isCol){const x=e.clientX,y=e.clientY;let fired=false;const tm=setTimeout(()=>{fired=true;pickStart(t,cell,isCol);},480);
  function mv(ev){if(Math.hypot(ev.clientX-x,ev.clientY-y)>10)end();}
  function up(){if(fired){suppress(t);if(pick)pick.at=Date.now();}end();}
  function end(){clearTimeout(tm);document.removeEventListener('pointermove',mv,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',end,true);}
  document.addEventListener('pointermove',mv,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',end,true);}
 function wire(t){t.addEventListener('contextmenu',e=>{if(pick||document.documentElement.dataset.nnphone==='1')e.preventDefault();});
  t.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button,input,select,textarea,a,.sortbtn,.nn-col-grip,.nn-row-grip,.nn-table-height'))return;const cell=e.target.closest('td,th');if(!cell||cell.closest('table')!==t)return;
  if(e.pointerType==='touch'||e.pointerType==='pen'){if(!pick)wireTouch(t,e,cell,cell.tagName==='TH');return;}
  const row=cell.parentElement,isCol=cell.tagName==='TH',startX=e.clientX,startY=e.clientY;let drag=false,target=null;
  function colMark(c,on,cls){if(!c)return;const i=c.cellIndex;for(const r of t.rows)if(r.cells[i])r.cells[i].classList.toggle(cls,on);}
  function mark(c,on){if(isCol&&t.id==='recordTable'){colMark(c,on,'nn-col-target');return;}if(c)(isCol?c:c.parentElement).classList.toggle(isCol?'nn-cell-drop':'nn-row-drop',on);}
  function move(ev){if(!drag&&Math.hypot(ev.clientX-startX,ev.clientY-startY)<7)return;if(!drag){drag=true;cell.setPointerCapture(e.pointerId);if(t.id==='recordTable'){if(isCol)colMark(cell,true,'nn-col-source');else row.classList.add('nn-row-source');}}ev.preventDefault();const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest(isCol?'th':'td');if(hit&&hit.closest('table')===t&&hit!==cell){mark(target,false);target=hit;mark(target,true);}}
  function done(ev){document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',done,true);document.removeEventListener('pointercancel',done,true);mark(target,false);if(t.id==='recordTable'){colMark(cell,false,'nn-col-source');row.classList.remove('nn-row-source');}if(cell.hasPointerCapture(e.pointerId))cell.releasePointerCapture(e.pointerId);if(!drag)return;suppress(t);if(!target||ev.type==='pointercancel')return;
   doMove(t,cell,target,isCol);
  }
  document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',done,true);document.addEventListener('pointercancel',done,true);
 });}
 let pending=false;function scan(){pending=false;document.querySelectorAll('table:not([data-nn-static])').forEach(decorate);}function schedule(){if(!pending){pending=true;requestAnimationFrame(scan);}}new MutationObserver(records=>{if(records.some(r=>(r.target.nodeType===1&&r.target.closest('table'))||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('table')||n.querySelector('table')))))schedule();}).observe(document.body,{childList:true,subtree:true});scan();
})();
