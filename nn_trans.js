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

/* ★2026-11-14c パソコンだけ、書体 Zen Kaku Gothic New を読み込む（本人「全体的に字の画質が悪い。もっと綺麗な字に。全部において」→ 比べ見本を見て「Bの書体にする」）。
   これまで：iPhone の表示を速くするため、どのページも書体を読み込まない設定（NN_WEBFONT=false）。Windows のPCでは代わりの「游ゴシック UI」で出て、小さい字がかすれていた。
   ・スマホ・タブレット（data-nnphone／iPhone・iPad・Android）は今までどおり読み込まない（速さ優先）。
   ・全ページが読むこのファイルに置く＝1か所で全11ページに効く。ページごとの NN_WEBFONT には触らない。
   ・body の書体の並びの先頭に Zen Kaku Gothic New を足す（書体を自分で決めている部品＝見出しの NNTtl などは変わらない）。
     通信できないときは書体が届かないだけで、今までの字で出る。
   ・書体が届くと字の幅が少し変わる → 届いたあと「画面の大きさが変わった」の知らせ（resize）を出して、字を枠に合わせる処理をやり直させる（多くて4回）。
   やめたいとき：ページより先に window.NN_NO_WEBFONT=true を置く。 */
(function(){
  try{
    var H=document.documentElement, ua=navigator.userAgent||'';
    if(window.NN_NO_WEBFONT) return;
    if(H.getAttribute('data-nnphone')==='1') return;
    if(/iPhone|iPad|iPod|Android/i.test(ua)) return;
    if(navigator.platform==='MacIntel' && navigator.maxTouchPoints>1) return;   /* iPad は Mac と名乗る */
    if(document.getElementById('nnZkCss')) return;
    var hd=document.head||H;
    ['https://fonts.googleapis.com','https://fonts.gstatic.com'].forEach(function(u){ var p=document.createElement('link'); p.rel='preconnect'; p.href=u; p.crossOrigin='anonymous'; hd.appendChild(p); });
    var l=document.createElement('link'); l.id='nnZkCss'; l.rel='stylesheet';
    /* ★2026-11-14d 太さは 400・500・700 だけ読む（900＝極太は読まない）。画面の字は 800〜900 の指定が多く、極太があると全部それで出て「太すぎ」になった（本人の指摘）。
       無い太さは近い太さで出る＝800・900 は 700（太字）になる。前の游ゴシック UI も太字は1種類だったので、太さの段は前と同じ */
    l.href='https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap';
    hd.appendChild(l);
    var st=document.createElement('style'); st.id='nnZkBody';
    st.textContent='html:not([data-nnphone="1"]) body{font-family:"Zen Kaku Gothic New","Hiragino Kaku Gothic ProN","Yu Gothic UI",Meiryo,system-ui,sans-serif !important;}';
    hd.appendChild(st);
    var n=0, tm=0, kick=function(){ clearTimeout(tm); tm=setTimeout(function(){ if(n++<4){ try{ window.dispatchEvent(new Event('resize')); }catch(_){} } },250); };
    if(document.fonts&&document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',kick);
  }catch(_){}
})();
