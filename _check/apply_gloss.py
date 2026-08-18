# -*- coding: utf-8 -*-
"""現場記録帳の進捗・予算バーを「筒状の光沢バー」にする。
   置換が1件ずつ成功したときだけ書き込む。"""
import io, sys

P = '/home/user/osamarinavi_bousui/kirokucho_demo.html'
s = io.open(P, encoding='utf-8', newline='').read().replace('\r\n', '\n')

BLOCK = r'''
<style id="nn-glossbar">
/* ★2026-08-08 進捗・予算のバーを「筒（つつ）状の光沢バー」にする（本人指示）
   ・足りない部分＝黒い筒の中（内側に濃い影を入れて丸みを出す）
   ・満たしている部分＝光沢のある緑。予算のバーと超過しているものは赤。
   ・筒の丸みは、バー全体にかぶせる白いつや（::after）で出している。

   直した場所（現場記録帳の中の「進捗・予算」のバーだけ）
     .prog / .pline .prog … 一覧の「進捗／予算消化」・要対応のミニバー
     .sc-prog .bar        … 施工中の現場（ダッシュボード）の進捗
     .ptrack              … 物件詳細の予実（費目ごとの実績）
     .pace .pt2           … 物件詳細の「工事の進み／予算の減り」
     .houbar              … 工法別の比率

   ★費目の積み上げバー（.cbar）と月別グラフ（.bars2）は触っていない。
     あちらは「色で費目を見分ける」ためのもので、黒＋緑にすると意味が消えるため。 */

/* ---- 筒そのもの（足りない部分＝黒） ---- */
.prog,
.pline .prog,
.sc-prog .bar,
.ptrack,
.pace .pt2,
.houbar{
  position:relative !important;
  background:linear-gradient(180deg,#0a0d0a 0%,#2c332c 40%,#171b17 66%,#040604 100%) !important;
  border:1px solid rgba(0,0,0,.55) !important;
  border-radius:999px !important;
  overflow:hidden !important;
  box-shadow:inset 0 2px 4px rgba(0,0,0,.85),
             inset 0 -1px 1px rgba(255,255,255,.14),
             0 1px 0 rgba(255,255,255,.55);
}

/* ---- 満たしている部分（緑） ----
   inline の background より強くするため !important を付けている。 */
.prog>i,
.pline .prog i,
.sc-prog .bar i,
.ptrack i,
.pace .pt2 i,
.houbar i{
  background:linear-gradient(180deg,
      #e2ffc6 0%, #97e86f 16%, #45c94e 44%, #17982f 72%, #0a6a21 100%) !important;
  border-radius:999px !important;
  box-shadow:inset 0 -2px 3px rgba(0,0,0,.30), 0 0 5px rgba(60,220,90,.35);
}

/* ---- 予算のバー・超過しているものは赤 ---- */
.prog.bud>i,
.pline .prog.bud i,
.ptrack i[style*="f0a99c"],
.pace .pt2 i[style*="f0a99c"],
.pace .pt2 i[style*="ebc98a"]{
  background:linear-gradient(180deg,
      #ffdfd2 0%, #ff9a78 16%, #f2452c 44%, #c31d18 72%, #870f10 100%) !important;
  box-shadow:inset 0 -2px 3px rgba(0,0,0,.30), 0 0 5px rgba(240,80,60,.35);
}

/* ---- 筒に見せる白いつや（バー全体にかぶせる） ---- */
.prog::after,
.pline .prog::after,
.sc-prog .bar::after,
.ptrack::after,
.pace .pt2::after,
.houbar::after{
  content:''; position:absolute; left:1px; right:1px; top:0; height:46%;
  background:linear-gradient(180deg,
      rgba(255,255,255,.46) 0%, rgba(255,255,255,.16) 62%, rgba(255,255,255,0) 100%);
  border-radius:999px; pointer-events:none; z-index:1;
}

/* ---- 黒い筒の上でも数字が読めるように（白文字＋濃い影） ---- */
.pline .pv,
.houbar b{
  z-index:2;
  color:#fff !important;
  text-shadow:0 1px 2px rgba(0,0,0,.95), 0 0 3px rgba(0,0,0,.85) !important;
}
.pline .pv.ov{ color:#ffb3a4 !important; }

/* ---- 予実の「見積」の位置を示す縦線は、黒地でも見えるよう黄色に ---- */
.ptrack u{ background:#ffd76a !important; box-shadow:0 0 0 1px rgba(0,0,0,.55); z-index:2; }

/* ---- 「工事の進み／予算の減り」の%の札はつやの上に ---- */
.pace .pt2 b{ z-index:3; }
</style>

</body>
</html>
'''

OLD = '\n</body>\n</html>\n'
assert s.count(OLD) == 1, '末尾の目印が %d 件（1件でないので中止）' % s.count(OLD)
s = s.replace(OLD, BLOCK)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('OK: nn-glossbar を追加しました')
