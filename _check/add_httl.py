# -*- coding: utf-8 -*-
"""★2026-08-16r 付箋タグの見出し＋その下の境界線を、現場記録帳以外のページにも付ける。
   ・見た目は現場記録帳の .httl（§62g の実測に合わせたパワプロ風の平行四辺形）と同じ。
   ・見出しの文字だけを span.httl で包む（右端の補助文字＝.r/.cta 等は包まない）。
   ・差し込みは「\n</body>\n</html>」の1件だけ（印刷用HTMLの文字列に入れないため・§37）。"""
import io, sys

BLOCK = u"""
<style id="nn-httl">
/* ★2026-08-16r 付箋タグの見出し（現場記録帳と同じ）＋そのすぐ下の境界線。
   本人の指示「現場一覧のページにある、付箋タグとの境界線。これ他のページにも付与して」。
   ★形は ::before の斜めの箱で作り、文字は本体に置く（文字はまっすぐのまま読める）。
   ★大きさは指定しない＝各ページの h4 の文字サイズをそのまま使う（ページごとの統一を壊さない）。 */
.panel > h4, .wr-box > h4, .dpanel > h4{
  position:relative; z-index:1; overflow:visible !important;
  padding-bottom:7px !important; margin-bottom:9px !important;
  border-bottom:2px solid #bcd3c4;
}
.httl{
  position:relative !important; z-index:0 !important;
  display:inline-flex !important; align-items:center !important; justify-content:flex-start !important;
  background:none !important; border:0 !important; border-radius:0 !important; box-shadow:none !important;
  color:#000 !important; font-family:inherit !important; font-weight:900 !important;
  -webkit-text-stroke:.3px #000;
  letter-spacing:.04em !important; line-height:1 !important;
  text-shadow:0 1px 0 rgba(255,255,255,.60) !important;
  white-space:nowrap !important; flex:0 0 auto !important;
  padding:9px 22px !important; margin:2px 12px 2px 10px !important;
}
.httl::before{
  content:'' !important; display:block !important;
  position:absolute; left:0; right:0; top:0; bottom:0; z-index:-1;
  pointer-events:none;                    /* 飾りなので当たり判定に入れない */
  transform:skewX(-19deg); border-radius:2px;
  background:linear-gradient(180deg,
      #a4e3bd 0%, #e6fbee 11%, #e1f9ea 36%,
      #96e3b6 40%, #8ddfae 90%, #63c48f 100%);
  border:2px solid #2f9e60;
  box-shadow:2px 3px 3px rgba(50,72,60,.38);
}
html[data-nnphone="1"] .httl{ padding:6px 15px !important; margin:2px 9px 2px 7px !important; }
html[data-nnphone="1"] .httl::before{ border-width:1.5px; box-shadow:1px 2px 2px rgba(50,72,60,.38); }
html[data-nnphone="1"] .panel > h4, html[data-nnphone="1"] .wr-box > h4{
  padding-bottom:4px !important; margin-bottom:6px !important; }
</style>
<script id="nn-httl-js">
/* 見出しの文字だけを span.httl で包む。
   ★右端に置く補助の文字（.r／.cta など）は包まない＝タグの外に残す。
   ★中身を作り直すページ（国交省仕様・ライブラリ等）があるので、
     作り直されたら包み直す（MutationObserver・0.2秒のまとめ）。 */
(function(){
  var SEL='.panel > h4, .wr-box > h4, .dpanel > h4';
  var STOP=/(^|\\s)(r|cta|zx|colgear|sub|hcount|tag)(\\s|$)/;
  function wrap(h){
    if(h.getAttribute('data-nnht')==='1') return;
    if(h.querySelector('.httl')){ h.setAttribute('data-nnht','1'); return; }
    var kids=[].slice.call(h.childNodes);
    var sp=document.createElement('span'); sp.className='httl';
    for(var i=0;i<kids.length;i++){
      var n=kids[i];
      if(n.nodeType===1 && STOP.test(' '+String(n.className||'')+' ')) break;
      sp.appendChild(n);
    }
    if(!String(sp.textContent||'').trim()){        /* 包むものが無いときは何もしない */
      while(sp.firstChild) h.insertBefore(sp.firstChild, h.firstChild);
      return;
    }
    h.insertBefore(sp, h.firstChild);
    h.setAttribute('data-nnht','1');
  }
  function run(){ try{ [].forEach.call(document.querySelectorAll(SEL), wrap); }catch(e){} }
  if(document.readyState==='loading') addEventListener('DOMContentLoaded',run); else run();
  addEventListener('load',function(){ setTimeout(run,200); });
  try{
    var t=null;
    new MutationObserver(function(){ if(t)return; t=setTimeout(function(){ t=null; run(); },200); })
      .observe(document.body,{childList:true,subtree:true});
  }catch(e){}
})();
</script>
"""

ANCHOR = u"\n</body>\n</html>"

def main(files):
    for f in files:
        s = io.open(f, encoding='utf-8').read()
        if 'id="nn-httl"' in s:
            print('skip (already)', f); continue
        assert s.count(ANCHOR) == 1, (f, s.count(ANCHOR))
        s = s.replace(ANCHOR, BLOCK + ANCHOR, 1)
        io.open(f, 'w', encoding='utf-8', newline='').write(s)
        print('ok', f)

if __name__ == '__main__':
    main(sys.argv[1:])
