/* ============================================================
   数字パッド（全ページ共通・スマホだけ）  2026-09-26p
   本人「iPhoneの数字キーボードは、タップしてから出るまでが遅い。内製のコンパクトなボタンにして。
         入力系は全部同じ仕様に」。
   ・対象：input[type=number]／inputmode=numeric・decimal の入力欄（スマホ＝html[data-nnphone="1"] のときだけ）
   ・入力欄を押した瞬間（pointerdown）に preventDefault＝フォーカスが移らない＝iPhoneのキーボードが出ない（§89）。
     その場で下に自前のパッドを出す（待ち時間なし）。パソコンは今までどおりキーボード。
   ・プログラムから focus() される入力欄（記録帳のその場編集など）も、inputmode="none" にしてから focus＝キーボードを出さない。
   ・1文字目は「置き換え」（今の値を消して打ち直し）。⌫ を先に押すと今の値の最後の1文字を消して続きから。
   ・打つたびに input イベント、確定・次へ・外を押したときに change イベント（各ページの今の処理がそのまま動く）。
     フォーカスしていた入力欄は最後に blur（「外したら確定」の作りの入力欄もそのまま動く）。
   ・幅980で組むページ（一覧表示など）は画面が約4割に縮むので、パッドだけ実寸に戻す（zoom）。
   ・先に別のパッドが受け取った入力欄（発注の数量・単価＝#nnPad）は触らない（e.defaultPrevented）。
   ・入力欄の無い数値の問い合わせ（図面の寸法札をタップ＝nnNumAsk）も同じパッドで入れる（nnNumpadAsk）。
   ・見出しの「✕」＝取り消し（元の値に戻して閉じる）。
   ============================================================ */
(function(){
'use strict';
if(window.__nnNumpad)return; window.__nnNumpad=1;
var SEL='input[type="number"],input[inputmode="numeric"],input[inputmode="decimal"],input.nnpadin';
function phone(){ return document.documentElement.getAttribute('data-nnphone')==='1'; }
function isNum(el){
  return !!(el&&el.tagName==='INPUT'&&el.matches(SEL)&&!el.disabled&&!el.readOnly&&!el.closest('#nnNumpad')&&!el.hasAttribute('data-nopad'));
}
/* キーボードを出さない印（元の inputmode は控えておく） */
function mark(el){
  if(el.classList.contains('nnpadin'))return;
  el.classList.add('nnpadin');
  el.setAttribute('data-nnim',el.getAttribute('inputmode')||'');
  el.setAttribute('inputmode','none');
}
var pad=null,target=null,buf='',fresh=true,orig='';
var css=''
 +'#nnNumpad{position:fixed;left:0;bottom:0;z-index:100000;display:none;box-sizing:border-box;background:#eef2ec;'
 +'border-top:2px solid #1c6b3c;box-shadow:0 -3px 0 rgba(0,0,0,.18);font-family:"Zen Kaku Gothic New","Hiragino Kaku Gothic ProN",sans-serif;'
 +'padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px));touch-action:manipulation;-webkit-user-select:none;user-select:none;}'
 +'#nnNumpad.open{display:block;}'
 +'#nnNumpad .np-h{display:flex;align-items:center;gap:6px;height:34px;margin-bottom:5px;}'
 +'#nnNumpad .np-l{flex:1;min-width:0;font-size:12px;font-weight:800;color:#1c6b3c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
 +'#nnNumpad .np-v{flex:none;min-width:40%;max-width:60%;box-sizing:border-box;height:34px;line-height:30px;padding:0 10px;border:2px solid #1c6b3c;'
 +'border-radius:4px;background:#fffdf0;color:#14351f;font-size:21px;font-weight:900;text-align:right;overflow:hidden;white-space:nowrap;font-variant-numeric:tabular-nums;}'
 +'#nnNumpad .np-v.fr{color:#9aa79f;}'
 +'#nnNumpad .np-v.fr::after{content:"";}'
 +'#nnNumpad .np-u{flex:none;font-size:11px;font-weight:800;color:#4a5b50;}'
 +'#nnNumpad .np-x{flex:none;width:34px;height:34px;padding:0;margin:0;border:1.5px solid #c85a2a;border-radius:4px;background:#fff;color:#b04010;font-size:16px;font-weight:900;font-family:inherit;cursor:pointer;}'
 +'#nnNumpad .np-g{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:44px;gap:5px;}'
 +'#nnNumpad .np-g button{font-family:inherit;font-size:21px;font-weight:900;color:#14351f;background:#fff;border:1.5px solid #9aa79f;'
 +'border-radius:5px;box-shadow:0 2px 0 #b9c2b6;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}'
 +'#nnNumpad .np-g button:active,#nnNumpad .np-g button.dn{background:#dcebdf;transform:translateY(2px);box-shadow:none;}'
 +'#nnNumpad .np-g button.f{font-size:14px;background:#e3e9e0;}'
 +'#nnNumpad .np-g button.nx{font-size:14px;background:#eef4fb;color:#14449c;border-color:#8fa9cf;}'
 +'#nnNumpad .np-g button.ok{font-size:16px;background:#1f8a45;color:#fff;border-color:#155230;box-shadow:0 2px 0 #0f3d22;}'
 +'#nnNumpad .np-g button:disabled{opacity:.35;box-shadow:none;}'
 +'.nnpad-on{outline:3px solid #2e9e58 !important;outline-offset:1px;background-color:#eef7f0 !important;}'
 /* よこ向き：左に寄せる（表の右側が見えたまま打てる） */
 +'@media (orientation:landscape){#nnNumpad{left:auto;right:6px;bottom:6px;width:270px;border:2px solid #1c6b3c;border-radius:6px;padding:6px;}}';
function build(){
  if(pad)return pad;
  var st=document.createElement('style');st.id='nn-numpad-css';st.textContent=css;document.head.appendChild(st);
  pad=document.createElement('div');pad.id='nnNumpad';
  pad.innerHTML='<div class="np-h"><span class="np-l"></span><span class="np-v fr">0</span><span class="np-u"></span><button type="button" class="np-x" data-k="x" title="取り消し（元の値に戻す）">✕</button></div>'
   +'<div class="np-g">'
   +'<button type="button" data-k="7">7</button><button type="button" data-k="8">8</button><button type="button" data-k="9">9</button><button type="button" class="f" data-k="bs">⌫</button>'
   +'<button type="button" data-k="4">4</button><button type="button" data-k="5">5</button><button type="button" data-k="6">6</button><button type="button" class="f" data-k="c">クリア</button>'
   +'<button type="button" data-k="1">1</button><button type="button" data-k="2">2</button><button type="button" data-k="3">3</button><button type="button" class="nx" data-k="nx">次へ ↓</button>'
   +'<button type="button" data-k="0">0</button><button type="button" data-k=".">.</button><button type="button" class="f" data-k="pm">±</button><button type="button" class="ok" data-k="ok">✓ 確定</button>'
   +'</div>';
  document.body.appendChild(pad);
  /* pointerdown で処理して preventDefault＝ボタンにフォーカスを移さない（反応を待たない） */
  pad.addEventListener('pointerdown',function(e){
    e.preventDefault();e.stopPropagation();
    var b=e.target.closest&&e.target.closest('[data-k]');if(!b||b.disabled)return;
    b.classList.add('dn');setTimeout(function(){b.classList.remove('dn');},90);
    key(b.getAttribute('data-k'));
  });
  pad.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});
  return pad;
}
/* 幅980で組むページ：パッドだけ実寸へ戻す */
function fit(){
  if(!pad)return;
  var de=document.documentElement,portrait=matchMedia('(orientation: portrait)').matches;
  var dev=portrait?Math.min(screen.width,screen.height):Math.max(screen.width,screen.height);
  var k=dev>0?de.clientWidth/dev:1; if(!(k>1.15))k=1;
  pad.style.zoom=k===1?'':String(k);
  pad.style.width=portrait?(de.clientWidth/k)+'px':'';
}
function labelOf(el){
  var t=el.getAttribute('aria-label')||el.getAttribute('title')||'';
  if(!t&&el.id){var l=document.querySelector('label[for="'+el.id+'"]');if(l)t=l.textContent;}
  if(!t){var lb=el.closest('label');if(lb)t=lb.textContent;}
  if(!t){var p=el.previousElementSibling;if(p&&p.textContent.trim().length<16)t=p.textContent;}
  if(!t&&el.placeholder)t=el.placeholder;
  return String(t||'数値').replace(/\s+/g,' ').trim().slice(0,24);
}
function unitOf(el){var n=el.nextElementSibling;var u=n&&n.textContent.trim();return u&&u.length<=4&&!/\d/.test(u)?u:'';}
function stepInt(el){var s=el.getAttribute('step');return s!=null&&s!==''&&s!=='any'&&/^\d+$/.test(s);}
function minNonNeg(el){var m=el.getAttribute('min');return m!=null&&m!==''&&+m>=0;}
function show(){
  var v=pad.querySelector('.np-v');
  var s=fresh?orig:buf;
  v.textContent=s===''?'0':s;
  v.classList.toggle('fr',fresh);
}
function valid(s){return s!==''&&s!=='-'&&s!=='.'&&s!=='-.'&&!/\.$/.test(s)&&isFinite(+s);}
function push(){                  /* 入力欄へ反映（打つたびに input） */
  if(!target)return;
  var s=fresh?orig:buf;
  if(s===''){ if(target.value!==''){target.value='';target.dispatchEvent(new Event('input',{bubbles:true}));} return; }
  if(!valid(s))return;
  if(target.value!==s){target.value=s;target.dispatchEvent(new Event('input',{bubbles:true}));}
}
function commit(){                /* 確定（change）＋フォーカスしていたら外す */
  if(!target)return;
  var t=target,changed=!fresh&&(t.value!==orig);
  if(!fresh&&!valid(buf)&&buf!==''){ t.value=orig; }
  target=null; t.classList.remove('nnpad-on');
  if(changed)t.dispatchEvent(new Event('change',{bubbles:true}));
  if(t._nnAskDone)t._nnAskDone();
  if(document.activeElement===t){try{t.blur();}catch(_){}}
}
function close(){commit();if(pad)pad.classList.remove('open');}
function list(){return Array.prototype.filter.call(document.querySelectorAll(SEL),function(el){
  if(!isNum(el))return false;var r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';});}
function key(k){
  if(!target)return;
  if(k==='ok'){close();return;}
  if(k==='x'){ if(!fresh&&target.value!==orig){target.value=orig;target.dispatchEvent(new Event('input',{bubbles:true}));} fresh=true; close(); return; }
  if(k==='nx'){
    /* ★change で表が作り直されることがある → 位置を先に控えてから確定し、あとで探し直す */
    var all=list(),i=all.indexOf(target);commit();
    if(i<0){if(pad)pad.classList.remove('open');return;}
    setTimeout(function(){var a=list(),n=a[i+1]||null;if(n)open(n);else if(pad)pad.classList.remove('open');},60);
    return;
  }
  if(k==='c'){fresh=false;buf='';}
  else if(k==='bs'){ if(fresh){fresh=false;buf=orig;} buf=buf.slice(0,-1); }
  else if(k==='pm'){ if(fresh){fresh=false;buf=orig;} buf=buf.charAt(0)==='-'?buf.slice(1):('-'+buf); }
  else if(k==='.'){ if(fresh){fresh=false;buf='';} if(buf.indexOf('.')<0)buf=(buf===''||buf==='-'?buf+'0':buf)+'.'; }
  else{ if(fresh){fresh=false;buf='';} if(buf.replace(/[-.]/g,'').length>=10)return;
    buf=(buf==='0'?'':buf==='-0'?'-':buf)+k; }
  show();push();
}
function open(el){
  build();fit();
  if(target&&target!==el)commit();
  mark(el);
  target=el;orig=String(el.value==null?'':el.value);buf='';fresh=true;
  el.classList.add('nnpad-on');
  pad.querySelector('.np-l').textContent=labelOf(el);
  pad.querySelector('.np-u').textContent=unitOf(el);
  pad.querySelector('[data-k="."]').disabled=stepInt(el);
  pad.querySelector('[data-k="pm"]').disabled=minNonNeg(el);
  pad.querySelector('[data-k="nx"]').disabled=!el.isConnected;
  show();pad.classList.add('open');
  /* パッドの裏に隠れたら、見える所まで送る */
  setTimeout(function(){ if(!target||target!==el)return;
    var r=el.getBoundingClientRect(),pr=pad.getBoundingClientRect();
    if(r.bottom>pr.top-8||r.top<0){try{el.scrollIntoView({block:'center'});}catch(_){}}
  },30);
}
/* ① 押した瞬間にパッド（フォーカスさせない＝iPhoneのキーボードを出さない） */
document.addEventListener('pointerdown',function(e){
  if(!phone())return;
  var el=e.target;
  if(pad&&pad.contains(el))return;
  if(isNum(el)&&!e.defaultPrevented){
    e.preventDefault();
    open(el);return;
  }
  /* パッドの外を押したら確定して閉じる（押した先の操作はそのまま動く） */
  if(pad&&pad.classList.contains('open'))close();
},true);
/* ② プログラムから focus() される入力欄：先に inputmode="none" にしてキーボードを出さない */
var _focus=HTMLElement.prototype.focus;
HTMLElement.prototype.focus=function(){
  try{ if(phone()&&isNum(this))mark(this); }catch(_){}
  return _focus.apply(this,arguments);
};
document.addEventListener('focusin',function(e){
  if(!phone())return;var el=e.target;
  if(isNum(el)&&target!==el){mark(el);open(el);}
},true);
/* ③ 画面の向き・倍率が変わったら合わせ直す */
addEventListener('resize',fit);
addEventListener('orientationchange',function(){setTimeout(fit,300);});
window.nnNumpadOpen=function(el){if(el)open(el);};   /* 検査用 */
/* 入力欄の無い問い合わせ：nnNumpadAsk(見出し, 最初の値, fn)。確定で fn(打った値)／打たずに閉じる・✕ で fn(null)。
   スマホでないときは false を返す（呼んだ側が今までどおりの小窓を出す） */
window.nnNumpadAsk=function(title,initial,fn){
  if(!phone())return false;
  var el=document.createElement('input');el.type='text';el.setAttribute('inputmode','decimal');
  el.setAttribute('aria-label',title||'数値');el.value=initial==null?'':String(initial);
  var done=false;
  el.addEventListener('change',function(){if(done)return;done=true;if(fn)fn(el.value===''?null:el.value);});
  el._nnAskDone=function(){if(done)return;done=true;if(fn)fn(null);};
  open(el);return true;
};
window.nnNumpadClose=close;
})();
