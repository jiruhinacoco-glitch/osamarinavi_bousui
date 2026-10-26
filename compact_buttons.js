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
/* ★2026-10-25p 下のメニューの絵（icons/nav_*.png）は横に広い入れ物（300×168）。真ん中の 223×168 が今までの絵の幅で、
   左右は大きい文字がはみ出すための余白。並びの幅（となりとの間隔）は今までどおりにするため、
   表示された実際の大きさから、はみ出す分だけ左右の余白をマイナスにする（文字は左右にはみ出して見える）。
   ★offsetWidth／offsetHeight＝表示倍率をかける前の大きさ（style の margin と同じ物差し・罠1 §61） */
(function(){
 'use strict';
 const BASE=223/168;
 const WIDE=300/168;
 function fix(im){ const nat=im.naturalWidth&&im.naturalHeight?im.naturalWidth/im.naturalHeight:0;
   if(nat&&nat<BASE+0.05){ im.style.marginLeft=im.style.marginRight=''; im.style.removeProperty('width'); return; }   /* 古い幅の絵（キャッシュ）ならそのまま */
   const nav=im.closest('nav'), col=nav&&getComputedStyle(nav).flexDirection.indexOf('column')===0, ic=im.parentElement;
   if(col&&ic){ /* パソコンの縦並び：幅が決まっている（入れ物の幅）→ 高さを今までどおりにするため、絵を横に広げて左右へはみ出させる */
     /* ★基準は外の枠（.ni）の中身の幅。ic.clientWidth は絵を広げると一緒に広がり、際限なく大きくなる */
     const ni=im.closest('.ni')||ic, cs=getComputedStyle(ni), w0=Math.min(ni.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0), 200); if(!(w0>0)) return; /* 縦並びの枠（nav）の外は切れて見えないので、広げるのは枠の幅まで */
     /* ★2026-10-26u 本人「PCだとメインアイコンが小さい」→ 帯の幅（78px）の 1.24倍に広げ、右へはみ出させる。
        絵の左の透明なあき（幅の4.3%）は画面の左端の外へ。帯は「中身が入りきる」ときだけはみ出しを見せる（nnOvf）。
        入りきらない（画面の高さが低い）ときは今までどおり帯の幅に収める（上下に動かせるように）。
        ★style の px は倍率をかける前の値。getBoundingClientRect は後なので、帯の幅の比で割り戻す（§61） */
     const fits=nav.scrollHeight<=nav.clientHeight+1; nav.classList.toggle('nnOvf',fits);
     if(fits && nav.offsetWidth){ const zr=(nav.getBoundingClientRect().width/nav.offsetWidth)||1;
       const w=nav.offsetWidth*1.24, icL=(ic.getBoundingClientRect().left-nav.getBoundingClientRect().left)/zr;
       const ml=-icL-w*0.043, mr=w0-w-ml;
       im.style.setProperty('width',w.toFixed(1)+'px','important'); im.style.setProperty('max-width','none','important');
       im.style.setProperty('margin-left',ml.toFixed(1)+'px','important'); im.style.setProperty('margin-right',mr.toFixed(1)+'px','important'); return; }
     const w=Math.min(w0*WIDE/BASE, Math.max(w0, nav.clientWidth-4)), m=((w0-w)/2).toFixed(1)+'px';
     im.style.setProperty('width',w.toFixed(1)+'px','important'); im.style.setProperty('max-width','none','important'); im.style.setProperty('margin-left',m,'important'); im.style.setProperty('margin-right',m,'important'); return; }
   /* スマホ・横並び：高さが決まっている → 広がった横幅の分だけ左右の余白をマイナスに */
   /* ★スマホでは横幅も CSS で決まっている（押しつぶされて小さく見えた）→ 横幅を「高さ×広い入れ物の比」にはっきり指定 */
   const h=im.offsetHeight; if(!h) return; const w=h*WIDE;
   const m=((h*BASE-w)/2).toFixed(1)+'px', ws=w.toFixed(1)+'px';
   if(im.style.getPropertyValue('width')!==ws) im.style.setProperty('width',ws,'important');
   if(im.style.marginLeft!==m){ im.style.marginLeft=m; im.style.marginRight=m; } im.style.setProperty('max-width','none','important'); }
 function scan(){ document.querySelectorAll('nav img[src*="icons/nav_"]').forEach(im=>{   /* メニューの中だけ（ほかで使う所は絵だけの icons/zumen_art.png など） */
   if(!/nav_(home|kiroku|map|hacchu|kokkou|camera|library|zumen|shiyou)(_on)?\.png/.test(im.getAttribute('src')||'')) return;
   if(!im.dataset.nnWide){ im.dataset.nnWide='1'; im.addEventListener('load',()=>fix(im)); try{ new ResizeObserver(()=>fix(im)).observe(im); }catch(_){} }
   if(im.complete) fix(im); }); }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',scan); else scan();
 setTimeout(scan,300); setTimeout(scan,1500);
 try{ new MutationObserver(()=>{ clearTimeout(scan._t); scan._t=setTimeout(scan,60); }).observe(document.documentElement,{childList:true,subtree:true}); }catch(_){}
 window.addEventListener('resize',()=>{ clearTimeout(scan._r); scan._r=setTimeout(scan,80); });
})();
