# 廃止した画面の検査（流さない）

- camchk.js・camh4.js：カメラの前の「①撮影②エッジ③防水材」画面の検査。2026-10-08 本人の指示でその画面を白紙にし、
  「納まり資料作成」を作り直した（CLAUDE_HISTORY §614・新しい検査は _check/osamari.js）。
- dashpayment.js・sttdrag.js・dashwidgets.js：ダッシュボードの枠を自由に動かす仕組み（dashboard_widgets.js・`data-widget-key`）の検査。
  2026-10-24zd 本人の指示でその仕組みを廃止し、ページは読まなくなった（kirokucho_demo.html に `data-widget-key` が0件）。待ち切れで止まるだけなので外した（CLAUDE_HISTORY §920）。
- table_pick.js：スマホで表の列・行を長押し→タップで移動する検査。2026-10-24ze 本人「自由に動かせるのは廃止」で
  table_layout.js の先頭に `return;` を入れ、表の並べ替え・高さ変更ごと止めた（どの表にも付かない）。§921。
- 2026-11-03 巡回（CLAUDE_HISTORY §1033）で移した。どれも本人の指示で仕組みや見た目が置き換わり、毎回★NGになって本物を埋もれさせていたもの：
  - faces1.js：カードの「内訳」ボタン（20面の内訳）。PCのカードをスマホと同じ表に作り直し（§1022）、工法ごとの数量は屋根の欄へ・細かい内訳は詳細で見る形になった。
  - card4chk.js・card5.js・card6.js・kai4chk.js・kai5chk.js：昔のカードの大きさ（345px以内・1画面5件・写真4:3・進捗バーの位置）の約束。
    その後の本人の指示（1枚約150px §989、屋根の並び §1010、PC1画面4現場・写真A4 §1025）で置き換わった。今の約束は rfmlay・pc4・pcx・rf1date・ttl2gap。
  - hit5.js・dashfold.js・dashdrag.js・panel_overlap.js：ダッシュボードの枠を拡大・畳んで始める・動かす仕組み。「左に目次・右に中身」（§769）に置き換わった。
  - pwlist.js・selcolor.js：PCのカードの状態の色の枠・選んだときの色。本人の指示で「ふだん黒・選択中オレンジ」（§1020）に変わった。今の約束は pcassp・pcview。
  - spmode.js：スマホ表示のタブ4つ・「詳細」ボタンなし など。タブ2つ・「詳細へ」ボタンありに変わった。今の約束は card 系の新しい検査（moto1line ほか）。
