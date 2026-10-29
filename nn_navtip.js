/* ★2026-10-28c 下のナビ（メインアイコン）の長押し（本人「長押しで画像が保存できてしまうのでやめて。
   長押ししたら説明用テロップ枠に説明が流れるように。テロップ枠は長い黒線で、説明文字は白。配置場所は任せる」）
   ・ナビの絵を長押ししても「画像を保存」のメニューが出ない（-webkit-touch-callout・ドラッグ・選択・右クリックのメニューを止める）
   ・長押し（各ページのナビ処理が 0.45秒で nnNavTip.show を呼ぶ）→ ナビのすぐ上に横長の黒い帯、白い文字が右から左へ流れる
   ・押したまま横へなぞると、指の下のアイコンの説明に替わる。指を離しても、いま流れている1回分は最後まで流してから消える
   全ページの <head> で nn_trans.js の後に読む */
(function(){
  if(window.nnNavTip) return;
  var TIPS={
    home:'ホーム ── 会社全体の物件数・請求確認・お知らせと、各画面への入口',
    kiroku:'現場記録帳 ── 物件ごとの見積・契約・工程・写真・請求・入金をまとめて記録し、ダッシュボードで数字を見る',
    map:'現場マップ ── 物件を地図の上で見る。近くの現場・移動の段取り・ステータスごとの色分け',
    hacchu:'発注 ── 材料を選んで発注書を作り、FAX・メールで送る。前回と同じ内容の再発注もできる',
    kokkou:'国交省仕様 ── 公共建築工事標準仕様書の防水仕様（新築・改修）を、工程と材料つきで調べる',
    camera:'カメラ ── 現場写真を撮って物件に紐づけ、写真台帳にまとめる',
    library:'ライブラリ ── カタログ・施工要領書・納まり図・3DCGなどの資料をまとめて見る',
    zumen:'図面・積算 ── 平面図をかいて、数量と見積をその場で出す。3Dで納まりも確かめられる',
    shiyou:'仕様・材料 ── 自社の防水仕様（工程）と、材料・単価を登録する',
    zairyo:'材料登録 ── 材料と単価を登録する。カタログを撮って読み込むこともできる',
    yougo:'用語集 ── 防水・建築の言葉の意味を調べる',
    settei:'設定 ── データの書き出し・読み込み（保存と復元）'
  };
  var css=''
  /* 絵の長押しで「画像を保存」を出さない・選択やドラッグもさせない */
  +'nav .ni, nav .ni *, nav#nav .ni img{-webkit-touch-callout:none !important; -webkit-user-select:none !important; user-select:none !important; -webkit-user-drag:none;}'
  /* テロップ：長い黒の帯（べた塗り）・白い太字が右から左へ流れる */
  +'#nnNavTip{position:fixed; left:0; right:0; z-index:2147482000; height:26px; background:#000; overflow:hidden; pointer-events:none;'
  +'  border-top:2px solid #3a3a3a; border-bottom:2px solid #3a3a3a; box-sizing:border-box; opacity:0; transition:opacity .15s;}'
  +'#nnNavTip.on{opacity:1;}'
  +'#nnNavTip span{position:absolute; left:0; top:0; height:100%; display:flex; align-items:center; white-space:nowrap;'
  +'  color:#fff; font:900 13px/1 "Zen Kaku Gothic New",sans-serif; letter-spacing:.06em; will-change:transform;}'
  +'#nnNavTip span b{color:#fff; margin-right:.3em;}'
  +'@keyframes nnTipRun{from{transform:translateX(var(--from));}to{transform:translateX(var(--to));}}'
  /* スマホ：幅980のページでも同じ大きさに見えるよう、画面の幅に対する割合で決める */
  +'html[data-nnphone="1"] #nnNavTip{height:7vw; border-width:.5vw 0;}'
  +'html[data-nnphone="1"] #nnNavTip span{font-size:3.4vw;}';
  var st=document.createElement('style'); st.id='nnNavTipCss'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
  /* 右クリック／長押しのメニュー（Android 等）もナビの上では出さない */
  document.addEventListener('contextmenu', function(e){ if(e.target&&e.target.closest&&e.target.closest('nav .ni')) e.preventDefault(); }, true);
  document.addEventListener('dragstart', function(e){ if(e.target&&e.target.closest&&e.target.closest('nav .ni')) e.preventDefault(); }, true);

  var el=null, sp=null, curKey='', held=false, endTm=0, PX_PER_S=60;   /* ★2026-10-28d 本人「速い」→ 110 → 60px/秒 */
  function mk(){ if(el&&el.isConnected) return el;
    el=document.createElement('div'); el.id='nnNavTip'; el.setAttribute('role','status'); el.innerHTML='<span></span>';
    document.documentElement.appendChild(el); sp=el.firstChild; return el; }
  function keyOf(ni){ var m=(ni.getAttribute('onclick')||'').match(/navGo\('([^']*)'\s*,\s*'([^']*)'\)/); return m?[m[1],m[2]]:null; }
  /* ★2026-10-28d 本人「場所が悪い。お知らせの上に」：ホームはお知らせ（ページの点＋お知らせの枠）のすぐ上。
     ほかの画面はナビのすぐ上。iPhone ではナビの絵が帯の上へはみ出すので、ナビの枠ではなく**絵も含めたいちばん上**から測る
     （§851 はナビの枠の上端で測ったため、はみ出した絵の段の途中に重なった） */
  function place(){ var nav=document.querySelector('nav#nav')||document.querySelector('nav'); if(!el) return;
    var H=document.documentElement.clientHeight, top=H;
    var nb=document.querySelector('.newsbox');
    if(nb&&nb.offsetParent){ top=nb.getBoundingClientRect().top; }
    else if(nav){ top=nav.getBoundingClientRect().top;
      [].forEach.call(nav.querySelectorAll('.ni, .ni img'),function(e){ var t=e.getBoundingClientRect().top; if(t<top) top=t; });
      if(top<H*0.5) top=H; }   /* 横向きなどでナビが下に無いときは画面の下 */
    /* ★2026-10-29w 本人「テロップがお知らせを跨いでいる」（iPhone・ホーム画面に追加したアプリ）：bottom（画面の下から）で置くと、
       その「画面の下」と clientHeight がずれる端末で帯が下へずれ、お知らせに重なった。→ お知らせ・ナビと同じ物差し（画面の上から＝top）で置く */
    el.style.bottom='auto'; el.style.top=Math.max(0,Math.round(top-el.offsetHeight-3))+'px'; }
  function run(){ /* 1回分＝右の外から左の外まで。長さに合わせて時間を決める（同じ速さで読める） */
    var W=el.clientWidth, w=sp.scrollWidth, sec=Math.max(2.5,(W+w)/PX_PER_S);
    sp.style.animation='none'; void sp.offsetWidth;
    sp.style.setProperty('--from',W+'px'); sp.style.setProperty('--to',(-w)+'px');
    sp.style.animation='nnTipRun '+sec+'s linear '+(held?'infinite':'1');
    clearTimeout(endTm); if(!held) endTm=setTimeout(hide, sec*1000);
  }
  function hide(){ clearTimeout(endTm); if(el){ el.classList.remove('on'); } curKey=''; }
  window.nnNavTip={
    TIPS:TIPS,
    show:function(ni){ if(!ni) return; var k=keyOf(ni); if(!k) return; held=true; mk(); place();
      if(curKey===k[0]&&el.classList.contains('on')) return;
      curKey=k[0]; sp.innerHTML=''; var t=TIPS[k[0]]||(k[1]+' ── この画面を開きます');
      var p=t.split(' ── '); var b=document.createElement('b'); b.textContent=p[0]; sp.appendChild(b); sp.appendChild(document.createTextNode(p.length>1?'── '+p.slice(1).join(' ── '):''));
      el.classList.add('on'); run(); },
    /* 指を離した：いま流れている1回分は最後まで流してから消す */
    release:function(){ if(!el||!held) return; held=false;
      var a=sp.getAnimations?sp.getAnimations()[0]:null;
      if(a&&a.effect&&a.effect.getTiming){ var d=a.effect.getTiming().duration, ct=(a.currentTime||0)%d; a.effect.updateTiming({iterations:1}); a.currentTime=ct; clearTimeout(endTm); endTm=setTimeout(hide, Math.max(300,d-ct)); }
      else{ clearTimeout(endTm); endTm=setTimeout(hide, 2500); } },
    hide:hide
  };
  addEventListener('resize', function(){ if(el&&el.classList.contains('on')) place(); });
  addEventListener('pageshow', function(e){ if(e.persisted) hide(); });
})();
