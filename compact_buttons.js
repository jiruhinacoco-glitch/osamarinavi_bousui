/* Text-button spacing is shared by all 11 pages. Pictorial controls keep their geometry. */
(function(){
 'use strict';
 const original=new WeakMap();const rules={'padding-top':'2px','padding-bottom':'2px','min-height':'0','height':'auto','max-height':'none','line-height':'1.35'};
 const style=document.createElement('style');style.textContent='html:root body :is(.badge,.gsp,.dsp,.mch.ms,.code,.dcode,.spec-code,.spec-tag,.c-code){font-weight:900!important;font-synthesis:weight;}'
  /* 2026-09-23ak: toasts are left:50% + translateX(-50%), so their shrink-to-fit width was only half the screen and
     short messages wrapped into a narrow column ("タイトルを入力してく/ださい"). Size them to the text instead. */
  +'#toast{width:max-content;box-sizing:border-box;}';document.head.append(style);
 function mark(e){
  if(!e.matches('button,input[type="button"],input[type="submit"]'))return;
  const label=(e.value||e.textContent||'').trim();
  if(e.matches('.nn-back,.ni,.nn-col-grip,.nn-row-grip,.nn-layout-grip,.nnEnCard')||e.querySelector('img,svg,canvas')||label.length<2){
   if(original.has(e)){for(const [k,v,priority]of original.get(e))v?e.style.setProperty(k,v,priority):e.style.removeProperty(k);original.delete(e);e.classList.remove('nn-compact');}return;
  }
  if(original.has(e))return;
  original.set(e,Object.keys(rules).map(k=>[k,e.style.getPropertyValue(k),e.style.getPropertyPriority(k)]));e.classList.add('nn-compact');
  for(const [k,v]of Object.entries(rules))e.style.setProperty(k,v,'important');
 }
 function scan(node){if(node.nodeType!==1)return;mark(node);node.querySelectorAll('button,input[type="button"],input[type="submit"]').forEach(mark);}
 scan(document.body);
 /* 2026-09-24c: pages laid out at width=980 (記録帳の一覧表示・仕様・材料・国交省) are shrunk to about 40% on a phone,
    so the bottom-right ▲ (show the menu again) became a ~16pt dot that could hardly be tapped.
    Scale it by (layout width / real screen width) so it is the same physical size as on the other pages. */
 function fitShowTab(){const t=document.getElementById('navShowTab');if(!t)return;const de=document.documentElement;
  const portrait=matchMedia('(orientation: portrait)').matches,dev=portrait?Math.min(screen.width,screen.height):Math.max(screen.width,screen.height);
  const k=de.dataset.nnphone==='1'&&dev>0?de.clientWidth/dev:1;
  if(k>1.15){t.style.setProperty('width',Math.round(40*k)+'px','important');t.style.setProperty('height',Math.round(40*k)+'px','important');
   t.style.setProperty('font-size',Math.round(16*k)+'px','important');t.style.setProperty('border-width',Math.round(2*k)+'px','important');
   t.style.setProperty('right',Math.round(10*k)+'px','important');t.style.setProperty('bottom','calc('+Math.round(10*k)+'px + env(safe-area-inset-bottom,0px))','important');}
  else['width','height','font-size','border-width','right','bottom'].forEach(x=>t.style.removeProperty(x));}
 addEventListener('resize',fitShowTab);addEventListener('orientationchange',()=>setTimeout(fitShowTab,300));
 new MutationObserver(fitShowTab).observe(document.documentElement,{attributes:true,attributeFilter:['data-nnvm','data-nnphone']});
 setTimeout(fitShowTab,0);setTimeout(fitShowTab,1500);
 new MutationObserver(records=>{const roots=new Set();for(const r of records){if(r.type==='characterData'){const b=r.target.parentElement?.closest('button');if(b)roots.add(b);}else{if(r.target.nodeType===1&&r.target.matches('button'))roots.add(r.target);for(const n of r.addedNodes)if(n.nodeType===1){roots.add(n);const b=n.closest('button');if(b)roots.add(b);}}}for(const n of roots)if(n.isConnected)scan(n);}).observe(document.body,{childList:true,characterData:true,subtree:true});
})();
