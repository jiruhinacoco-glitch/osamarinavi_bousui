/* ★2026-10-27k 画面切り替えの「進んでいる感じ」（本人「開くまで遅すぎ。謎の横断幕で閉めなくて良い。
   進んでいる状況が人の感覚的にわかるように」）
   §846 の幕（閉じる0.2秒＋読み込み完了まで隠す＋開く0.3秒）はやめた。画面は隠さない・待たせない。
   ・押した瞬間：右下に「通信中」＋％の数字＋伸びていく棒。移動はすぐ始める（わざと待たせない）
   ・移動中：棒は最初速く、だんだんゆっくり伸びる（92％で止まって待つ）
   ・着いたページ：前のページの続きの％から伸ばし、ページの読み込みが終わったら100％にして消す。
     ページは出来た部分からそのまま見えて触れる（帯は押しても下に通る）
   ・戻るボタン（端末に残ったページの復帰）では帯を残さない
   全ページの <head> で common.css の直後に読む（体＝body より先に帯を出すため） */
(function(){
  if(window.nnTransGo) return;
  var KEY='nn_trans_v2', TAU=900, CAP=92, MAX_WAIT=8000;
  var css=''
  +'#nnTrans{position:fixed; right:0; bottom:calc(env(safe-area-inset-bottom,0px) + 28px); z-index:2147483000; pointer-events:none;'
  +'  display:flex; flex-direction:column; gap:4px; padding:7px 14px 7px 24px; background:#0b0d0c; clip-path:polygon(16px 0,100% 0,100% 100%,0 100%);'
  +'  border-top:2px solid #ffd23f; border-bottom:2px solid #ffd23f; box-sizing:border-box; font:900 19px/1 "Zen Kaku Gothic New",sans-serif;'
  +'  transition:opacity .15s, transform .15s;}'
  +'#nnTrans.hide{opacity:0; transform:translateX(30px);}'
  +'#nnTrans .rw{display:flex; align-items:center; gap:8px;}'
  +'#nnTrans .rw b{display:inline-block; color:#fff; -webkit-text-stroke:1px #000; paint-order:stroke; text-shadow:0 2px 0 #3a3a3a; animation:nnTrHop .9s ease-in-out infinite;}'
  +'#nnTrans .rw b:nth-of-type(2){animation-delay:.1s;} #nnTrans .rw b:nth-of-type(3){animation-delay:.2s;}'
  +'#nnTrans .rw em{font-style:normal; color:#ffd23f; min-width:3.1em; text-align:right; font-variant-numeric:tabular-nums; margin-left:4px;}'
  +'@keyframes nnTrHop{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}'
  /* 棒：黄色のべた塗りが左から伸びる（中に斜めのしまが流れる＝止まっていない） */
  +'#nnTrans .bar{height:7px; background:#2c302d; border:1px solid #555b56; box-sizing:border-box; overflow:hidden;}'
  +'#nnTrans .bar i{display:block; height:100%; width:0; background-color:#ffd23f;'
  +'  background-image:repeating-linear-gradient(115deg, rgba(0,0,0,.18) 0 5px, transparent 5px 10px); background-size:20px 100%; animation:nnTrFlow .5s linear infinite;}'
  +'@keyframes nnTrFlow{to{background-position:20px 0;}}'
  /* 歯車（黄色のべた塗り＋歯8本・まん中に黒い穴） */
  +'#nnTrans .rw i{flex:none; position:relative; width:19px; height:19px; animation:nnTrRot 1.1s linear infinite;}'
  +'#nnTrans .rw i::before{content:""; position:absolute; inset:0; background:#ffd23f;'
  +'  clip-path:polygon(41% 0,59% 0,61% 15%,74% 9%,87% 22%,79% 34%,100% 41%,100% 59%,85% 61%,91% 74%,78% 87%,66% 79%,59% 100%,41% 100%,39% 85%,26% 91%,13% 78%,21% 66%,0 59%,0 41%,15% 39%,9% 26%,22% 13%,34% 21%);}'
  +'#nnTrans .rw i::after{content:""; position:absolute; left:34%; top:34%; width:32%; height:32%; border-radius:50%; background:#0b0d0c;}'
  +'@keyframes nnTrRot{to{transform:rotate(360deg);}}'
  /* スマホ：幅980のページでも同じ大きさに見えるよう、画面の幅に対する割合で決める */
  +'html[data-nnphone="1"] #nnTrans{padding:1.8vw 3.6vw 1.8vw 6vw; gap:1vw; font-size:4.9vw; bottom:calc(env(safe-area-inset-bottom,0px) + 7vw);'
  +'  clip-path:polygon(4vw 0,100% 0,100% 100%,0 100%); border-width:.5vw 0;}'
  +'html[data-nnphone="1"] #nnTrans .rw{gap:2vw;}'
  +'html[data-nnphone="1"] #nnTrans .rw i{width:4.9vw; height:4.9vw;}'
  +'html[data-nnphone="1"] #nnTrans .bar{height:1.8vw;}'
  +'@media (prefers-reduced-motion:reduce){ #nnTrans .rw b, #nnTrans .rw i, #nnTrans .bar i{animation:none;} }';
  var st=document.createElement('style'); st.id='nnTransCss'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  var el=null, pct=0, base=0, t0=0, raf=0, fin=false;
  function mk(){
    if(el&&el.isConnected) return el;
    el=document.createElement('div'); el.id='nnTrans'; el.setAttribute('aria-hidden','true');
    el.innerHTML='<div class="rw"><i></i><b>通</b><b>信</b><b>中</b><em>0%</em></div><div class="bar"><i></i></div>';
    document.documentElement.appendChild(el); return el;
  }
  function show(v){ var e=mk(); pct=v; e.querySelector('em').textContent=Math.floor(v)+'%'; e.querySelector('.bar i').style.width=v+'%'; }
  /* 最初は速く、だんだんゆっくり。CAP で止まって待つ（本当に終わったら finish で100へ） */
  function tick(){ if(fin) return; var t=Date.now()-t0; show(base+(CAP-base)*(1-Math.exp(-t/TAU))); raf=requestAnimationFrame(tick); }
  function start(from){ fin=false; base=from; t0=Date.now(); cancelAnimationFrame(raf); show(from); raf=requestAnimationFrame(tick); }
  function finish(){ if(fin) return; fin=true; cancelAnimationFrame(raf); show(100);
    setTimeout(function(){ if(el) el.classList.add('hide'); setTimeout(drop, 170); }, 120); }
  function drop(){ cancelAnimationFrame(raf); if(el){ el.remove(); el=null; } }

  /* ---------- 着いた側：前のページの続きから伸ばし、読み込みが終わったら100％ ---------- */
  var came=null; try{ came=sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); }catch(_){}
  if(came!=null){
    start(Math.min(CAP, Math.max(10, +came||0)));
    if(document.readyState==='complete') finish(); else addEventListener('load', finish, {once:true});
    setTimeout(finish, MAX_WAIT);   /* 画像が1枚止まっても、いつまでも出しっぱなしにしない */
  }

  /* ---------- 出る側：帯を出して、すぐ移動する ---------- */
  var going=false;
  window.nnTransGo=function(url){
    if(going) return; going=true;
    start(0);
    try{ sessionStorage.setItem(KEY,'0'); }catch(_){}
    location.href=url;
    setTimeout(function(){ going=false; }, 4000);   /* 移動が取り消されたときに、また押せるように */
  };
  /* 移動の直前：いまの％を次のページへ渡す（続きから伸ばす） */
  addEventListener('pagehide', function(){ if(going) try{ sessionStorage.setItem(KEY, String(Math.floor(pct))); }catch(_){} });
  /* 戻るボタンで端末に残ったページが戻ってきたとき：帯を外す */
  addEventListener('pageshow', function(e){ if(e.persisted){ drop(); fin=true; going=false; try{ sessionStorage.removeItem(KEY); }catch(_){} } });
})();

/* ★2026-11-14e パソコンの字は「BIZ UDPゴシック」（Windows に最初から入っている・画面の点に線を合わせる作りで小さい字がくっきり出る）。
   経緯：最初＝游ゴシック UI（代わりの字。小さい字がかすれる）→ 14c Zen Kaku Gothic New を外から読み込む（極太で太すぎ・線がにじむ）→ 14d 極太なし
        → 本人が実物大の見本を見て「⑤BIZ UDPにする」。外からの読み込みはやめた（通信なし・待ちなし）。
   ・スマホ・タブレット（data-nnphone／iPhone・iPad・Android）は今までどおり何もしない。
   ・全ページが読むこのファイルに置く＝1か所で全11ページに効く。
   ・やり方①：body の書体の並びの先頭に BIZ UDPGothic を足す。
     やり方②：各ページには「Zen Kaku Gothic New を先頭に」と書いた決まりがたくさんある（ボタン・入力欄など）。それを1つずつ直さず、
       「Zen Kaku Gothic New という名前＝この端末の BIZ UDPゴシック」と読み替える（@font-face の local）。太さは 標準と太字の2種類（800・900 の指定は太字で出る）。
   ・BIZ UDPゴシックが無い端末（Mac など）は、今までの字で出る。
   やめたいとき：ページより先に window.NN_NO_WEBFONT=true を置く。 */
(function(){
  try{
    var H=document.documentElement, ua=navigator.userAgent||'';
    if(window.NN_NO_WEBFONT) return;
    if(H.getAttribute('data-nnphone')==='1') return;
    if(/iPhone|iPad|iPod|Android/i.test(ua)) return;
    if(navigator.platform==='MacIntel' && navigator.maxTouchPoints>1) return;   /* iPad は Mac と名乗る */
    if(document.getElementById('nnZkBody')) return;
    /* ★2026-11-14g 現場マップ（genba_map）は何もしない。一覧の欄が前の字（游ゴシック UI）の幅ぎりぎりに作ってあり、BIZ UDP にすると面積が「1,74…」のように欠けた。
       14f は body の決まりだけ外したが、このページも「Zen Kaku Gothic New を先頭に」と書いてあるので、読み替え（@font-face）が効いて欠けたままだった。
       → 読み替えごと外す。欄の幅を直してから、この1行を消せば現場マップも同じ字になる */
    if(/genba_map/.test(location.pathname)) return;
    var hd=document.head||H;
    var st=document.createElement('style'); st.id='nnZkBody';
    st.textContent='@font-face{font-family:"Zen Kaku Gothic New"; src:local("BIZ UDPGothic"),local("BIZ UDPゴシック"); font-weight:100 500;}'
      +'@font-face{font-family:"Zen Kaku Gothic New"; src:local("BIZ UDPGothic Bold"),local("BIZ UDPゴシック Bold"),local("BIZ UDPGothic"); font-weight:600 900;}'
      +'html:not([data-nnphone="1"]) body{font-family:"BIZ UDPGothic","Zen Kaku Gothic New","Hiragino Kaku Gothic ProN","Yu Gothic UI",Meiryo,system-ui,sans-serif !important;}';
    hd.appendChild(st);
  }catch(_){}
})();
