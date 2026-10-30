# 廃止した画面の検査（流さない）

- camchk.js・camh4.js：カメラの前の「①撮影②エッジ③防水材」画面の検査。2026-10-08 本人の指示でその画面を白紙にし、
  「納まり資料作成」を作り直した（CLAUDE_HISTORY §614・新しい検査は _check/osamari.js）。
- dashpayment.js・sttdrag.js・dashwidgets.js：ダッシュボードの枠を自由に動かす仕組み（dashboard_widgets.js・`data-widget-key`）の検査。
  2026-10-24zd 本人の指示でその仕組みを廃止し、ページは読まなくなった（kirokucho_demo.html に `data-widget-key` が0件）。待ち切れで止まるだけなので外した（CLAUDE_HISTORY §920）。
- table_pick.js：スマホで表の列・行を長押し→タップで移動する検査。2026-10-24ze 本人「自由に動かせるのは廃止」で
  table_layout.js の先頭に `return;` を入れ、表の並べ替え・高さ変更ごと止めた（どの表にも付かない）。§921。
