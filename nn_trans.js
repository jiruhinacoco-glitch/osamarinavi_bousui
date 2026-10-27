/* ★2026-10-27i 画面切り替えの演出（本人「よくあるスマホゲームみたいに、切り替わるまでを進行中のように見せる。
   必要なら『つうしん中』を置いてユーザーを安心させる」）
   ・押した瞬間：斜めの幕が左からサッと閉じる（0.2秒）→ 閉じきってから移動する
   ・着いたページ：幕が閉じたまま始まり、ページが出来上がったら右へサッと開く
   ・0.35秒より長くかかったときだけ、右下に「通信中」の帯（★2026-10-27j 本人「漢字にして」）（文字が順にはねる・歯車が回る）
   ・戻るボタン（端末に残ったページの復帰）では幕を残さない
   全ページの <head> で common.css の直後に読む（体＝body より先に幕を出すため） */
(function(){
  if(window.nnTransGo) return;
  var KEY='nn_trans_v1', CLOSE_MS=200, BADGE_MS=350, MIN_SHOW=220, MAX_WAIT=6000;
  var css=''
  +'#nnTrans{position:fixed; inset:0; z-index:2147483000; pointer-events:none; visibility:hidden;}'
  +'#nnTrans .sh{position:absolute; inset:0; background:#16271d;'
  +'  background-image:repeating-linear-gradient(115deg, rgba(255,255,255,.035) 0 14px, transparent 14px 28px);'
  +'  clip-path:polygon(-30% 0,-30% 0,-60% 100%,-60% 100%);}'
  /* 閉じる：左から右へ斜めに覆う */
  +'#nnTrans.close, #nnTrans.shut{visibility:visible; pointer-events:auto;}'
  +'#nnTrans.close .sh{animation:nnTrIn .2s cubic-bezier(.3,.1,.3,1) forwards;}'
  +'#nnTrans.shut .sh{clip-path:polygon(-30% 0,130% 0,100% 100%,-60% 100%);}'
  /* 開く：右へ抜けていく */
  +'#nnTrans.open{visibility:visible;}'
  +'#nnTrans.open .sh{animation:nnTrOut .3s cubic-bezier(.5,0,.7,.4) forwards;}'
  +'@keyframes nnTrIn{from{clip-path:polygon(-30% 0,-30% 0,-60% 100%,-60% 100%);}to{clip-path:polygon(-30% 0,130% 0,100% 100%,-60% 100%);}}'
  +'@keyframes nnTrOut{from{clip-path:polygon(-30% 0,130% 0,100% 100%,-60% 100%);}to{clip-path:polygon(130% 0,130% 0,160% 100%,160% 100%);}}'
  /* つうしん中の帯（右下）：黒のべた塗り・左端は斜め・白い文字に黒いふち */
  +'#nnTrans .bd{position:absolute; right:0; bottom:calc(env(safe-area-inset-bottom,0px) + 28px); display:flex; align-items:center; gap:10px;'
  +'  height:44px; padding:0 16px 0 26px; background:#0b0d0c; clip-path:polygon(18px 0,100% 0,100% 100%,0 100%);'
  +'  border-top:2px solid #ffd23f; border-bottom:2px solid #ffd23f; box-sizing:border-box; opacity:0; transform:translateX(40px);'
  +'  transition:opacity .15s, transform .15s; font:900 22px/1 "Zen Kaku Gothic New",sans-serif; letter-spacing:.04em;}'
  +'#nnTrans.bdg .bd{opacity:1; transform:none;}'
  +'#nnTrans.open .bd{opacity:0; transition:opacity .1s;}'
  +'#nnTrans .bd b{display:inline-block; color:#fff; -webkit-text-stroke:1px #000; paint-order:stroke;'
  +'  text-shadow:0 2px 0 #3a3a3a; animation:nnTrHop .9s ease-in-out infinite;}'
  +'#nnTrans .bd b:nth-of-type(2){animation-delay:.08s;} #nnTrans .bd b:nth-of-type(3){animation-delay:.16s;}'
  +'#nnTrans .bd b:nth-of-type(4){animation-delay:.24s;} #nnTrans .bd b:nth-of-type(5){animation-delay:.32s;}'
  +'@keyframes nnTrHop{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}'
  /* 歯車（黄色のべた塗り＋歯8本・まん中に黒い穴） */
  +'#nnTrans .bd i{flex:none; position:relative; width:22px; height:22px; animation:nnTrRot 1.1s linear infinite;}'
  +'#nnTrans .bd i::before{content:""; position:absolute; inset:0; background:#ffd23f;'
  +'  clip-path:polygon(41% 0,59% 0,61% 15%,74% 9%,87% 22%,79% 34%,100% 41%,100% 59%,85% 61%,91% 74%,78% 87%,66% 79%,59% 100%,41% 100%,39% 85%,26% 91%,13% 78%,21% 66%,0 59%,0 41%,15% 39%,9% 26%,22% 13%,34% 21%);}'
  +'#nnTrans .bd i::after{content:""; position:absolute; left:34%; top:34%; width:32%; height:32%; border-radius:50%; background:#0b0d0c;}'
  +'#nnTrans .bd i:last-child{animation-direction:reverse;}'
  +'@keyframes nnTrRot{to{transform:rotate(360deg);}}'
  /* スマホ：幅980のページでも同じ大きさに見えるよう、画面の幅に対する割合で決める */
  +'html[data-nnphone="1"] #nnTrans .bd{height:11.5vw; padding:0 4vw 0 6.5vw; gap:2.4vw; font-size:5.8vw; bottom:calc(env(safe-area-inset-bottom,0px) + 7vw);'
  +'  clip-path:polygon(4.5vw 0,100% 0,100% 100%,0 100%); border-width:.5vw 0;}'
  +'html[data-nnphone="1"] #nnTrans .bd i{width:5.8vw; height:5.8vw;}'
  +'html[data-nnphone="1"] #nnTrans .sh{background-image:repeating-linear-gradient(115deg, rgba(255,255,255,.035) 0 3.6vw, transparent 3.6vw 7.2vw);}'
  +'@media (prefers-reduced-motion:reduce){ #nnTrans .sh, #nnTrans .bd b, #nnTrans .bd i{animation-duration:.01s !important;} }';
  var st=document.createElement('style'); st.id='nnTransCss'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  function mk(){
    var c=document.getElementById('nnTrans'); if(c) return c;
    c=document.createElement('div'); c.id='nnTrans'; c.setAttribute('aria-hidden','true');
    c.innerHTML='<div class="sh"></div><div class="bd"><i></i><b>通</b><b>信</b><b>中</b><i></i></div>';
    document.documentElement.appendChild(c); return c;
  }
  function drop(){ var c=document.getElementById('nnTrans'); if(c) c.remove(); }

  /* ---------- 着いた側：幕が閉じたまま始めて、出来上がったら開く ---------- */
  var came=false; try{ came=sessionStorage.getItem(KEY)==='1'; sessionStorage.removeItem(KEY); }catch(_){}
  if(came){
    var c=mk(), t0=Date.now(), done=false; c.className='shut';
    var bt=setTimeout(function(){ c.classList.add('bdg'); }, BADGE_MS);
    var open=function(){ if(done) return; done=true;
      setTimeout(function(){ clearTimeout(bt); c.className='open'+(c.classList.contains('bdg')?' bdg':'');
        setTimeout(drop, 340); }, Math.max(0, MIN_SHOW-(Date.now()-t0))); };
    if(document.readyState==='complete') open(); else addEventListener('load', open, {once:true});
    setTimeout(open, MAX_WAIT);   /* 画像が1枚止まっても、いつまでも幕を下ろしたままにしない */
  }

  /* ---------- 出る側：幕を閉じきってから移動する ---------- */
  var going=false;
  window.nnTransGo=function(url){
    if(going) return; going=true;
    var c=mk(); c.className=''; void c.offsetWidth; c.className='close';
    try{ sessionStorage.setItem(KEY,'1'); }catch(_){}
    setTimeout(function(){ c.classList.add('bdg'); }, CLOSE_MS+BADGE_MS);
    setTimeout(function(){ location.href=url; }, CLOSE_MS);
    setTimeout(function(){ going=false; }, 4000);   /* 移動が取り消されたときに、また押せるように */
  };
  /* 戻るボタンで端末に残ったページが戻ってきたとき：閉じた幕を外す */
  addEventListener('pageshow', function(e){ if(e.persisted){ drop(); going=false; try{ sessionStorage.removeItem(KEY); }catch(_){} } });
})();
