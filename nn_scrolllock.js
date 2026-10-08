/* ============================================================
   ★2026-09-25c スマホ：枠の中の表・一覧が指で自由に動いてしまう（本人の画面録画2本）
   ------------------------------------------------------------
   原因：横スクロールの箱（overflow-x:auto）は、ブラウザの決まりで縦も「スクロールできる箱」になる。
   中身が縦に収まっていても、iPhoneは箱ごと縦・斜めに引っぱれて（ゴムのように伸びて）表がずれて見えた。
   ・横に送る箱：縦には動かさない（overflow-y:hidden）・端で伸ばさない（overscroll-behavior:none）
   ・縦に送る箱（一覧・ダッシュボード）：横には動かさない（overflow-x:hidden）
   箱の作りはページごとに違うので、スマホのときだけ実際の箱を調べて付ける。PCは何もしない。
   ============================================================ */
(function(){ 'use strict';
if(document.documentElement.getAttribute('data-nnphone')!=='1') return;
var css=document.createElement('style'); css.id='nn-scrolllock-css';
css.textContent=
 '.nn-lock-x{overflow-y:hidden !important; overscroll-behavior:none !important;}'
+'.nn-lock-y{overflow-x:hidden !important; overscroll-behavior-x:none !important;}'
+'html,body{overscroll-behavior-x:none;}';
(document.head||document.documentElement).appendChild(css);
var SEL='div,section,main,aside,article,ul,ol,nav,form';
/* ★2026-10-08a 「測る→書き換える」を1箱ずつくり返すと、書き換えるたびに次の箱を測る前に
   画面ぜんぶの置き場所を計算し直す（一覧を開くたびに約1.2秒画面が固まり、カードが灰色のまま残った）。
   先に全部の箱を測ってから、まとめて書き換える。判定の中身は今までと同じ。 */
function scan(){
  pending=false;
  /* 縦に止めた箱の中身が、あとで縦にも入りきらなくなったら止めるのをやめる（切れて見えなくならないように） */
  var un=[].filter.call(document.querySelectorAll('.nn-lock-x'),function(e){ return e.scrollHeight>e.clientHeight+1; });
  un.forEach(function(e){ e.classList.remove('nn-lock-x'); e.__nnWasY=1; });
  var list=document.body.querySelectorAll(SEL), acts=[];
  for(var i=0;i<list.length;i++){ var a=decide(list[i]); if(a) acts.push(a); }
  for(var j=0;j<acts.length;j++) acts[j]();
}
function judge(e){ var a=decide(e); if(a) a(); }
/* 測るだけ。書き換えは返した関数で行う（scan がまとめて呼ぶ） */
function decide(e){
  {
    if(e.classList.contains('nn-lock-x')||e.classList.contains('nn-lock-y')||e.__nnLockSkip) return null;
    if(e.id==='nnSelPop') return null;
    var cs=getComputedStyle(e), ox=cs.overflowX, oy=cs.overflowY;
    var sx=(ox==='auto'||ox==='scroll'), sy=(oy==='auto'||oy==='scroll');
    if(!sx&&!sy) return null;
    /* ★2026-10-08a 画面外で組み立てを後回しにしている箱（content-visibility:auto の中）は測らない
       （測るとその場で組み立ててしまう）。指が触れたときに touchstart で判定される */
    try{ if(e.checkVisibility&&!e.checkVisibility({contentVisibilityAuto:true})) return null; }catch(_){}
    if(!e.clientWidth) return null;
    var needX=e.scrollWidth>e.clientWidth+1, needY=e.scrollHeight>e.clientHeight+1;
    /* 横に送る箱で、縦は中身が収まっている → 縦に動かさない */
    if(sx&&needX&&!needY){ if(e.__nnWasY){ e.__nnLockSkip=1; return null; } return function(){ e.classList.add('nn-lock-x'); }; }
    /* 縦に送る箱で、横は（ほぼ）収まっている → 横に動かさない（数pxのはみ出しで斜めに動くのを防ぐ） */
    else if(sy&&needY&&e.scrollWidth<=e.clientWidth+8) return function(){ e.classList.add('nn-lock-y'); };
    return null;
  }
}
var pending=false;
function soon(){ if(!pending){ pending=true; setTimeout(scan,300); } }
function start(){
  scan();
  /* 指が触れた瞬間に、その場所を包む箱を必ず判定する（読み込み直後・描き直し直後でも取りこぼさない） */
  document.addEventListener('touchstart',function(ev){
    for(var p=ev.target;p&&p.nodeType===1&&p!==document.body;p=p.parentElement){ if(p.matches&&p.matches(SEL)) judge(p); }
  },{capture:true,passive:true});
  window.addEventListener('load',function(){ setTimeout(scan,300); setTimeout(scan,2000); });
  new MutationObserver(soon).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',function(){
    /* 大きさが変わったら付け直す（横に収まるようになった箱などがあるため） */
    [].forEach.call(document.querySelectorAll('.nn-lock-x,.nn-lock-y'),function(e){ e.classList.remove('nn-lock-x','nn-lock-y'); });
    soon();
  });
  setTimeout(soon,1500);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
