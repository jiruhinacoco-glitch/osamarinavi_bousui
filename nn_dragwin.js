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
   ============================================================ */
(function(){
  if(window.__nnDragWin) return; window.__nnDragWin=1;
  var D=null, moved=[];
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
  function reset(){                                /* 閉じた窓（消えた・隠れた）は位置を元へ */
    moved=moved.filter(function(b){
      if(!b.isConnected) return false;
      if(!b.getClientRects().length){ b.style.translate=''; b.__nnDx=0; b.__nnDy=0; return false; }
      return true;
    });
  }
  addEventListener('pointerdown', function(e){
    reset();
    if(D || (e.pointerType==='mouse' && e.button!==0)) return;
    var t=e.target; if(!t || t.nodeType!==1) return;
    var box=findBox(t); if(!box) return;
    if(skip(t, box, e.pointerType==='touch')) return;
    var r=box.getBoundingClientRect(), k=(box.offsetWidth>0)?(r.width/box.offsetWidth):1;
    if(!(k>0.2 && k<5)) k=1;
    D={box:box, id:e.pointerId, sx:e.clientX, sy:e.clientY, k:k, on:false,
       x0:+box.__nnDx||0, y0:+box.__nnDy||0, r:r};
  }, true);
  addEventListener('pointermove', function(e){
    if(!D || e.pointerId!==D.id) return;
    var dx=e.clientX-D.sx, dy=e.clientY-D.sy;
    if(!D.on){ if(Math.hypot(dx,dy)<6) return; D.on=true;
      try{ var s=getSelection(); if(s&&s.removeAllRanges) s.removeAllRanges(); }catch(_){} }
    /* 画面の外へ出しきらない（窓の端 48px は必ず残す） */
    var W=vw(), H=vh(), r=D.r, keep=48;
    dx=Math.max(keep-r.right, Math.min(W-keep-r.left, dx));
    dy=Math.max(-r.top, Math.min(H-keep-r.top, dy));
    var x=D.x0+dx/D.k, y=D.y0+dy/D.k;
    D.box.__nnDx=x; D.box.__nnDy=y;
    D.box.style.translate=x+'px '+y+'px';
    if(moved.indexOf(D.box)<0) moved.push(D.box);
    e.preventDefault();
  }, true);
  function end(e){
    if(!D || (e && e.pointerId!==D.id)) return;
    var was=D.on; D=null;
    if(!was) return;
    /* ドラッグの終わりに出る click は1回だけ止める（ボタンの上で離しても押したことにしない） */
    var kill=function(ev){ ev.stopPropagation(); ev.preventDefault(); off(); };
    var off=function(){ removeEventListener('click', kill, true); clearTimeout(tm); };
    var tm=setTimeout(off, 350);
    addEventListener('click', kill, true);
  }
  addEventListener('pointerup', end, true);
  addEventListener('pointercancel', end, true);
  /* 指：つかめる所を押している間は画面のスクロールを止める（止めないとブラウザが先にスクロールを始め、ドラッグが打ち切られる） */
  addEventListener('touchmove', function(e){ if(D && e.cancelable) e.preventDefault(); }, {passive:false, capture:true});
  addEventListener('selectstart', function(e){ if(D && D.on) e.preventDefault(); }, true);
})();
