/* ============================================================
   ★2026-11-27c/d うしろが暗くなる窓（確認・選択の窓）は、つかんで動かせる  §1447・§1448
   ★全11ページがこのファイルを読む（2026-11-27d に図面・積算の内蔵から共通ファイルへ移した）。
   本人の指摘：「実際確認したいところがウィンドウが邪魔で見れない。このウィンドウに限らず、全部」。
   ・窓ごとに仕込まず、ここ1か所で全部に効かせる（窓を増やしても足し忘れが起きない）。
   ・対象＝「画面いっぱいの、半透明の幕」の直下にある箱。幕が不透明な全画面の画面は対象外。
   ・ボタンの上からでもつかめる（6px 動いたらドラッグ。動かさずに離せば、いつものタップ）。
   ・入力欄・一覧の指スクロール・自前のつまみ（cursor が move/grab/◯-resize）は触らない。
   ・位置は CSS の translate で足す（transform で中央寄せしている窓を壊さない）。
   ・表示倍率(zoom)がかかっていても指と同じだけ動くよう、見た目の幅÷元の幅 で割る（罠1）。
   ・窓を閉じたら位置は元へ戻る（次に開いたときは、いつもの場所）。
   ★2026-11-28x 本人の指摘「このウィンドウ系は移動できるように依頼したはず」「この状態で画面移動（屋根移動）できない」 §1479
   ・つかむ場所が見えなかった → 窓の左上に「✥ つかんで移動」のつまみを出す（幕の子として置く。窓の中身には手を入れない）。
     窓の地の部分（ボタン・入力欄でない所）もこれまでどおりつかめる。
   ・窓を出したまま、うしろを動かせる：暗いところをドラッグ＝うしろを動かす／暗いところでホイール＝うしろへそのまま渡す（拡大・縮小・スクロール）。
     ページが window.nnVeilPan(うしろの要素, 'start'|'move'|'end', イベント, dx, dy) を用意していればそれに任せる（図面・積算の平面図と3D）。
     無ければ、うしろのスクロールできる所をスクロールする。
     動かしたあとの click は1回止める（暗いところのタップで閉じる窓が、ドラッグで閉じないように）。動かさずにタップすれば今までどおり閉じる。
   ============================================================ */
(function(){
  if(window.__nnDragWin) return; window.__nnDragWin=1;
  var D=null, moved=[], P=null, GRIPS=[];
  function vw(){ return document.documentElement.clientWidth; }
  function vh(){ return document.documentElement.clientHeight; }
  function isVeil(o){
    if(!o || o===document.body || o===document.documentElement) return false;
    var cs=getComputedStyle(o); if(cs.position!=='fixed' || cs.display==='none') return false;
    var r=o.getBoundingClientRect(); if(r.width<vw()*0.9 || r.height<vh()*0.9) return false;
    var m=/rgba?\(([^)]+)\)/.exec(cs.backgroundColor||''); if(!m) return false;
    var p=m[1].split(/[ ,\/]+/).filter(Boolean), a=p.length>3?parseFloat(p[3]):1;
    return a>0.04 && a<0.8;                        /* 半透明の幕だけ（写真の拡大表示＝ほぼ真っ黒 .88 は対象外） */
  }
  function findBox(t){
    for(var el=t; el && el.parentElement; el=el.parentElement){
      if(isVeil(el.parentElement)){
        var r=el.getBoundingClientRect();
        if(r.width>=vw()*0.97 && r.height>=vh()*0.97) return null;   /* 画面いっぱいの箱は動かさない */
        return el;
      }
    }
    return null;
  }
  function skip(t, box, touch){
    if(touch){                                     /* 指：幕そのものがスクロールする窓は、スクロールを優先 */
      var v=box.parentElement, vs=getComputedStyle(v);
      if((vs.overflowY==='auto'||vs.overflowY==='scroll') && v.scrollHeight>v.clientHeight+2) return true;
    }
    for(var el=t; el && el!==box.parentElement; el=el.parentElement){
      var tg=el.tagName;
      if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||tg==='CANVAS'||tg==='VIDEO'||tg==='IFRAME') return true;
      if(el.isContentEditable || el.getAttribute('data-nodrag')!=null) return true;
      var cs=getComputedStyle(el), c=cs.cursor||'';
      if(c==='move'||c==='grab'||c==='grabbing'||/-resize$/.test(c)) return true;      /* 自前のつまみ */
      if(touch){                                   /* 指：中身がスクロールできる所はスクロールを優先 */
        var oy=cs.overflowY, ox=cs.overflowX;
        if((oy==='auto'||oy==='scroll') && el.scrollHeight>el.clientHeight+2) return true;
        if((ox==='auto'||ox==='scroll') && el.scrollWidth>el.clientWidth+2) return true;
      }
    }
    return false;
  }
  /* ---- つまみ（窓の左上に出す・幕の子） ---- */
  function placeGrip(g){
    var box=g.__box;
    if(!box || !box.isConnected || !g.isConnected || !box.getClientRects().length || box.parentElement!==g.parentElement){ try{ g.remove(); }catch(_){} if(box) box.__nnGrip=null; return false; }
    var r=box.getBoundingClientRect(), k=(box.offsetWidth>0)?(r.width/box.offsetWidth):1; if(!(k>0.2 && k<5)) k=1;
    var gh=g.offsetHeight||20, top=r.top/k-gh;
    g.style.left=Math.max(0,r.left/k)+'px'; g.style.top=(top<0?Math.max(0,r.top/k):top)+'px';
    return true;
  }
  function gripFor(box){
    if(!box || box.getAttribute('data-nngrip')!=null) return null;
    if(box.__nnGrip && box.__nnGrip.isConnected) { placeGrip(box.__nnGrip); return box.__nnGrip; }
    var v=box.parentElement; if(!v) return null;
    var g=document.createElement('div'); g.setAttribute('data-nngrip','1'); g.textContent='✥ つかんで移動';
    g.style.cssText='position:fixed;left:0;top:0;z-index:3;background:#fff;color:#153f25;border:2px solid #1c6b3c;'
      +'font-family:inherit;font-size:11px;font-weight:800;line-height:1.5;padding:1px 8px;cursor:move;'
      +'user-select:none;-webkit-user-select:none;touch-action:none;white-space:nowrap;margin:0;border-radius:0;box-shadow:none;';
    g.__box=box; box.__nnGrip=g; v.appendChild(g); GRIPS.push(g); placeGrip(g);
    try{ if(window.ResizeObserver && !box.__nnRO){ box.__nnRO=new ResizeObserver(function(){ if(box.__nnGrip) placeGrip(box.__nnGrip); }); box.__nnRO.observe(box); } }catch(_){}
    return g;
  }
  function sweep(){ GRIPS=GRIPS.filter(placeGrip); }
  function veilBox(v){                             /* 幕の直下の箱（つまみ・画面いっぱいの箱は除く） */
    for(var c=v.firstElementChild; c; c=c.nextElementSibling){
      if(c.getAttribute('data-nngrip')!=null) continue;
      var r=c.getBoundingClientRect(); if(!r.width || !r.height) continue;
      if(r.width>=vw()*0.97 && r.height>=vh()*0.97) return null;
      return c;
    }
    return null;
  }
  function tryVeil(v){ try{ if(v && v.nodeType===1 && isVeil(v)){ var b=veilBox(v); if(b) gripFor(b); } }catch(_){} }
  try{
    var mo=new MutationObserver(function(L){
      L.forEach(function(m){ for(var i=0;i<m.addedNodes.length;i++){ (function(n){ if(n.nodeType===1 && n.getAttribute('data-nngrip')==null) setTimeout(function(){ tryVeil(n); sweep(); }, 30); })(m.addedNodes[i]); } });
      if(GRIPS.length) setTimeout(sweep, 30);
    });
    var boot=function(){ if(document.body) mo.observe(document.body,{childList:true}); };
    if(document.body) boot(); else addEventListener('DOMContentLoaded', boot);
  }catch(_){}
  /* 前からページにあって、出したり隠したりする幕：上に来たとき・押したときに付ける */
  addEventListener('pointerover', function(e){
    var t=e.target; if(!t || t.nodeType!==1 || D || P) return;
    if(t.getAttribute('data-nngrip')!=null) return;
    try{ var b=findBox(t); if(b) gripFor(b); else tryVeil(t); }catch(_){}
  }, true);
  addEventListener('resize', function(){ sweep(); });
  /* ---- うしろを動かす ---- */
  function underOf(v, x, y){
    var pe=v.style.pointerEvents, u=null;
    v.style.pointerEvents='none';
    try{ u=document.elementFromPoint(x,y); }catch(_){ u=null; }
    v.style.pointerEvents=pe;
    return (u && u!==v && !v.contains(u))?u:null;
  }
  function scrollerOf(u){
    for(var el=u; el && el!==document.documentElement; el=el.parentElement){
      var cs=getComputedStyle(el), oy=cs.overflowY, ox=cs.overflowX;
      if(((oy==='auto'||oy==='scroll') && el.scrollHeight>el.clientHeight+2) || ((ox==='auto'||ox==='scroll') && el.scrollWidth>el.clientWidth+2)) return el;
    }
    return document.scrollingElement||document.documentElement;
  }
  function killClick(){
    /* ドラッグの終わりに出る click は1回だけ止める（ボタンの上で離しても押したことにしない） */
    var kill=function(ev){ ev.stopPropagation(); ev.preventDefault(); off(); };
    var off=function(){ removeEventListener('click', kill, true); clearTimeout(tm); };
    var tm=setTimeout(off, 350);
    addEventListener('click', kill, true);
  }
  function reset(){                                /* 閉じた窓（消えた・隠れた）は位置を元へ */
    sweep();
    moved=moved.filter(function(b){
      if(!b.isConnected) return false;
      if(!b.getClientRects().length){ b.style.translate=''; b.__nnDx=0; b.__nnDy=0; return false; }
      return true;
    });
  }
  addEventListener('pointerdown', function(e){
    reset();
    if(D || P || (e.pointerType==='mouse' && e.button!==0)) return;
    var t=e.target; if(!t || t.nodeType!==1) return;
    var gr=(t.closest && t.closest('[data-nngrip]'))||null;
    var box=gr?gr.__box:findBox(t);
    if(!box){                                      /* 暗いところ＝うしろを動かす */
      if(isVeil(t)){ tryVeil(t); var u=underOf(t, e.clientX, e.clientY);
        if(u) P={veil:t, under:u, id:e.pointerId, sx:e.clientX, sy:e.clientY, lx:e.clientX, ly:e.clientY, on:false, hook:false, sc:null}; }
      return;
    }
    if(!gr){ gripFor(box); if(skip(t, box, e.pointerType==='touch')) return; }
    var r=box.getBoundingClientRect(), k=(box.offsetWidth>0)?(r.width/box.offsetWidth):1;
    if(!(k>0.2 && k<5)) k=1;
    D={box:box, id:e.pointerId, sx:e.clientX, sy:e.clientY, k:k, on:false,
       x0:+box.__nnDx||0, y0:+box.__nnDy||0, r:r};
  }, true);
  addEventListener('pointermove', function(e){
    if(P && e.pointerId===P.id){
      if(!P.on){ if(Math.hypot(e.clientX-P.sx, e.clientY-P.sy)<6) return; P.on=true; P.lx=e.clientX; P.ly=e.clientY;
        try{ P.hook=!!(window.nnVeilPan && window.nnVeilPan(P.under,'start',e,0,0)); }catch(_){ P.hook=false; }
        if(!P.hook) P.sc=scrollerOf(P.under); }
      var mx=e.clientX-P.lx, my=e.clientY-P.ly; P.lx=e.clientX; P.ly=e.clientY;
      if(P.hook){ try{ window.nnVeilPan(P.under,'move',e,mx,my); }catch(_){} }
      else if(P.sc){ try{ P.sc.scrollBy(-mx,-my); }catch(_){} }
      e.preventDefault(); return;
    }
    if(!D || e.pointerId!==D.id) return;
    var dx=e.clientX-D.sx, dy=e.clientY-D.sy;
    if(!D.on){ if(Math.hypot(dx,dy)<6) return; D.on=true;
      try{ var s=getSelection(); if(s&&s.removeAllRanges) s.removeAllRanges(); }catch(_){} }
    /* 画面の外へ出しきらない（窓の端 48px は必ず残す） */
    var W=vw(), H=vh(), r=D.r, keep=48;
    dx=Math.max(keep-r.right, Math.min(W-keep-r.left, dx));
    dy=Math.max(-r.top+(D.box.__nnGrip?22:0), Math.min(H-keep-r.top, dy));
    var x=D.x0+dx/D.k, y=D.y0+dy/D.k;
    D.box.__nnDx=x; D.box.__nnDy=y;
    D.box.style.translate=x+'px '+y+'px';
    if(moved.indexOf(D.box)<0) moved.push(D.box);
    if(D.box.__nnGrip) placeGrip(D.box.__nnGrip);
    e.preventDefault();
  }, true);
  function end(e){
    if(P && (!e || e.pointerId===P.id)){
      var p=P; P=null;
      if(p.on){ if(p.hook){ try{ window.nnVeilPan(p.under,'end',e||null,0,0); }catch(_){} } killClick(); }
      return;
    }
    if(!D || (e && e.pointerId!==D.id)) return;
    var was=D.on; D=null;
    if(!was) return;
    killClick();
  }
  addEventListener('pointerup', end, true);
  addEventListener('pointercancel', end, true);
  /* 指：つかめる所を押している間は画面のスクロールを止める（止めないとブラウザが先にスクロールを始め、ドラッグが打ち切られる） */
  addEventListener('touchmove', function(e){ if((D || (P && P.on)) && e.cancelable) e.preventDefault(); }, {passive:false, capture:true});
  addEventListener('selectstart', function(e){ if((D && D.on) || (P && P.on)) e.preventDefault(); }, true);
  /* 暗いところでホイール＝うしろへそのまま渡す（図面の拡大・縮小、一覧のスクロール） */
  addEventListener('wheel', function(e){
    var t=e.target; if(!t || t.nodeType!==1 || !e.isTrusted) return;
    if(!isVeil(t)) return;
    var u=underOf(t, e.clientX, e.clientY); if(!u) return;
    var ev=null; try{ ev=new WheelEvent('wheel',{bubbles:true, cancelable:true, view:window, clientX:e.clientX, clientY:e.clientY,
      screenX:e.screenX, screenY:e.screenY, deltaX:e.deltaX, deltaY:e.deltaY, deltaZ:e.deltaZ, deltaMode:e.deltaMode,
      ctrlKey:e.ctrlKey, shiftKey:e.shiftKey, altKey:e.altKey, metaKey:e.metaKey}); }catch(_){ ev=null; }
    if(!ev) return;
    var free=u.dispatchEvent(ev);
    if(free){ try{ var m=(e.deltaMode===1)?16:1; scrollerOf(u).scrollBy(e.deltaX*m, e.deltaY*m); }catch(_){} }
    if(e.cancelable) e.preventDefault();
  }, {passive:false, capture:true});
})();
