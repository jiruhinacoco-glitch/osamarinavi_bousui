/* ============================================================
   ★2026-09-25b 全画面共通：選択欄（<select>）の一覧を納まりナビの自前デザインにする
   ------------------------------------------------------------
   本人の指摘「iPhone特有の灰色の選択肢枠が出る（遅れて出る）。選んでもらう場面は全部内製化して」。
   ・欄そのもの（<select> の箱）はそのまま使い、押したときに出る「一覧」だけを差し替える
     （欄を作り替えないので、各画面のレイアウト・値の読み書き・保存処理は今までどおり）
   ・押した瞬間に出す（iPhoneの一覧は指を離してから遅れて出ていた）
   ・選ぶと select.value を変えて input / change を送る（各画面の処理がそのまま動く）
   ・標準の一覧のままにしたい欄は data-nn-native を付ける。複数選択（multiple・size>1）は対象外
   ★座標：getBoundingClientRect は表示倍率（html の zoom）をかけた後、style.left はかける前（§61）。
   ============================================================ */
(function(){ 'use strict';
if(window.__nnSelect) return; window.__nnSelect=1;
var css=document.createElement('style'); css.id='nn-select-css';
css.textContent=
 '#nnSelPop{position:fixed; z-index:2147483000; background:#fff; border:2px solid #1c6b3c; border-radius:4px;'
+' box-shadow:0 4px 0 #124a28; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; display:none;'
+' font-family:inherit; text-align:left; box-sizing:border-box;}'
+'#nnSelPop.open{display:block;}'
+'#nnSelPop .o{display:flex; align-items:center; gap:8px; padding:calc(10px * var(--nnsaf,1)) calc(12px * var(--nnsaf,1));'
+' font-size:calc(15px * var(--nnsaf,1)); line-height:1.3; border-bottom:1px solid #e3e8e1; cursor:pointer; color:#243027;'
+' -webkit-user-select:none; user-select:none; -webkit-tap-highlight-color:transparent;}'
+'#nnSelPop .o:last-child{border-bottom:0;}'
+'#nnSelPop .o::before{content:""; flex:none; width:calc(14px * var(--nnsaf,1)); text-align:center; font-weight:900; color:#1c6b3c;}'
+'#nnSelPop .o.on{background:#ffe46b; font-weight:800;}'
+'#nnSelPop .o.on::before{content:"\\2713";}'
+'#nnSelPop .o:hover{background:#eef6ef;} #nnSelPop .o.on:hover{background:#ffe46b;}'
+'#nnSelPop .o:active{background:#d9eedd;}'
+'#nnSelPop .o.dis{color:#a4ada6; cursor:default;}'
+'#nnSelPop .g{padding:calc(4px * var(--nnsaf,1)) calc(10px * var(--nnsaf,1)); background:#eef3ee; font-size:calc(11px * var(--nnsaf,1));'
+' font-weight:800; color:#5a6b5f; border-bottom:1px solid #d7e0d5;}'
+'select.nnsel-open{outline:2px solid #1c6b3c; outline-offset:1px;}';
(document.head||document.documentElement).appendChild(css);

var pop=null, cur=null, openedAt=0;
function ensurePop(){
  if(pop&&pop.isConnected) return pop;
  pop=document.createElement('div'); pop.id='nnSelPop'; pop.setAttribute('role','listbox');
  document.body.appendChild(pop);
  /* 一覧を押しても選択欄から焦点を外さない（外れると「選ばずに閉じた」扱いで作り直す画面がある） */
  pop.addEventListener('mousedown',function(e){ e.preventDefault(); });
  pop.addEventListener('click',function(e){
    var o=e.target.closest('.o'); if(!o||o.classList.contains('dis')||!cur) return;
    var sel=cur, i=+o.getAttribute('data-i');
    /* 標準と同じ順番：値を変える → input・change → （そのあと）焦点が外れる */
    if(sel.selectedIndex!==i){ sel.selectedIndex=i;
      sel.dispatchEvent(new Event('input',{bubbles:true})); sel.dispatchEvent(new Event('change',{bubbles:true})); }
    close();
  });
  return pop;
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function target(sel){
  return sel && sel.tagName==='SELECT' && !sel.multiple && !(sel.size>1) && !sel.hasAttribute('data-nn-native');
}
function close(){
  if(pop){ pop.classList.remove('open'); pop.innerHTML=''; }
  var c=cur; cur=null;
  if(c){ c.classList.remove('nnsel-open');
    /* 指の端末で focus() の代わりに一覧を出した欄は、閉じたときに「焦点が外れた」ことを知らせる */
    if(c._nnVF){ c._nnVF=false; try{ c.dispatchEvent(new FocusEvent('blur')); c.dispatchEvent(new FocusEvent('focusout',{bubbles:true})); }catch(_){} } }
}
function open(sel, anchor, force){
  if(cur===sel){ if(!force) close(); return; }
  close(); if(sel.disabled) return;
  var p=ensurePop(); cur=sel; openedAt=Date.now(); sel.classList.add('nnsel-open');
  var idx=sel.selectedIndex, h='';
  function row(o){ return '<div class="o'+(o.index===idx?' on':'')+(o.disabled?' dis':'')+'" role="option" data-i="'+o.index+'">'+esc(o.textContent)+'</div>'; }
  Array.prototype.forEach.call(sel.children,function(ch){
    if(ch.tagName==='OPTGROUP'){ h+='<div class="g">'+esc(ch.label)+'</div>'; Array.prototype.forEach.call(ch.children,function(o){ if(!o.hidden) h+=row(o); }); }
    else if(ch.tagName==='OPTION' && !ch.hidden) h+=row(ch);
  });
  p.innerHTML=h; p.classList.add('open');
  var a=anchor||sel, r=a.getBoundingClientRect();
  var z=(a.offsetWidth&&r.width)?r.width/a.offsetWidth:1; if(!(z>0.05&&z<20)) z=1;
  var de=document.documentElement;
  var W=(Math.abs(z-1)>0.01?window.innerWidth:de.clientWidth), H=(Math.abs(z-1)>0.01?window.innerHeight:de.clientHeight);
  /* ここから下は「倍率をかける前」の値で計算する */
  W/=z; H/=z; var L=r.left/z, T=r.top/z, B=r.bottom/z, RW=r.width/z;
  var nnsaf=parseFloat(getComputedStyle(de).getPropertyValue('--nnsaf'))||1;
  var w=Math.min(W-16, Math.max(RW, 180*nnsaf));
  var left=Math.max(8, Math.min(L, W-8-w));
  var below=H-B-10, above=T-10, ph=p.scrollHeight;
  p.style.width=w+'px'; p.style.left=left+'px';
  if(ph<=below || below>=above){ p.style.top=(B+3)+'px'; p.style.bottom=''; p.style.maxHeight=Math.max(120,below)+'px'; }
  else{ p.style.top=''; p.style.bottom=(H-T+3)+'px'; p.style.maxHeight=Math.max(120,above)+'px'; }
  var on=p.querySelector('.o.on'); if(on) p.scrollTop=Math.max(0,on.offsetTop-p.clientHeight/2+on.offsetHeight/2);
}
window.nnSelOpen=open; window.nnSelClose=close;

/* ---- プログラムから開く入口 ----
   showPicker()＝標準の一覧を開く命令 → 自前の一覧に置き換える。
   指の端末（iPhone等）では select.focus() だけでも標準の一覧が開くので、焦点を当てる代わりに自前の一覧を出す。 */
var TOUCH=document.documentElement.getAttribute('data-nnphone')==='1'||(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
var SP=HTMLSelectElement.prototype.showPicker;
HTMLSelectElement.prototype.showPicker=function(){ if(target(this)){ open(this,null,true); return; } if(SP) return SP.call(this); };
var FOCUS=HTMLElement.prototype.focus;
HTMLSelectElement.prototype.focus=function(o){
  if(TOUCH&&target(this)&&this.isConnected&&!this.disabled){ this._nnVF=true; open(this,null,true); return; }
  return FOCUS.call(this,o);
};

/* ---- 標準の一覧を出させない入口ごとの処理 ---- */
var touch=null;
document.addEventListener('touchstart',function(e){
  var s=e.target.closest&&e.target.closest('select');
  touch=(target(s)&&e.touches.length===1)?{s:s,x:e.touches[0].clientX,y:e.touches[0].clientY,moved:false}:null;
},{capture:true,passive:true});
document.addEventListener('touchmove',function(e){
  if(touch&&e.touches[0]&&Math.hypot(e.touches[0].clientX-touch.x,e.touches[0].clientY-touch.y)>10) touch.moved=true;
},{capture:true,passive:true});
document.addEventListener('touchend',function(e){
  var t=touch; touch=null; if(!t||t.moved) return;
  /* 指を離したときに標準の一覧が開く（＝遅れて出る）ので、それを止めて自前の一覧を出す */
  e.preventDefault(); open(t.s);
},{capture:true,passive:false});
document.addEventListener('mousedown',function(e){
  var s=e.target.closest&&e.target.closest('select'); if(!target(s)||e.button!==0) return;
  e.preventDefault(); open(s);
},true);
/* 項目名（label）を押したとき */
document.addEventListener('click',function(e){
  var l=e.target.closest&&e.target.closest('label'); if(!l) return;
  var s=l.control||(l.htmlFor?document.getElementById(l.htmlFor):null);
  if(!target(s)||e.target===s||s.contains(e.target)) return;
  e.preventDefault(); open(s);
},true);
/* キーボード（PC）：Enter・スペース・Alt+↓ で自前の一覧、一覧が出ていれば ↑↓ で移動・Enterで決定・Escで閉じる */
document.addEventListener('keydown',function(e){
  if(cur&&pop&&pop.classList.contains('open')){
    var items=[].slice.call(pop.querySelectorAll('.o:not(.dis)')); var i=items.indexOf(pop.querySelector('.o.kb')||pop.querySelector('.o.on'));
    if(e.key==='Escape'){ e.preventDefault(); close(); return; }
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); items.forEach(function(x){x.classList.remove('kb');});
      var n=items[Math.max(0,Math.min(items.length-1,(i<0?0:i)+(e.key==='ArrowDown'?1:-1)))]; if(n){ n.classList.add('kb'); n.style.outline='2px solid #1c6b3c'; items.forEach(function(x){ if(x!==n) x.style.outline=''; }); n.scrollIntoView({block:'nearest'}); } return; }
    if(e.key==='Enter'){ var k=pop.querySelector('.o.kb'); e.preventDefault(); if(k) k.click(); else close(); return; }
  }
  var s=e.target; if(!target(s)) return;
  if(e.key==='Enter'||e.key===' '||(e.altKey&&e.key==='ArrowDown')){ e.preventDefault(); open(s); }
},true);
/* 外を押したら閉じる／画面が動いたら閉じる（一覧だけ取り残されないように） */
document.addEventListener('pointerdown',function(e){
  if(!cur) return; if(pop&&pop.contains(e.target)) return;
  if(e.target===cur||(e.target.closest&&e.target.closest('select')===cur)) return;
  close();
},true);
window.addEventListener('scroll',function(e){
  if(!cur||Date.now()-openedAt<250) return; if(pop&&(e.target===pop||pop.contains(e.target))) return; close();
},true);
window.addEventListener('resize',function(){ if(cur&&Date.now()-openedAt>250) close(); });
})();
