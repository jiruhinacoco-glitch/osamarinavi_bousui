# _check/ ＝ 検証・作業スクリプト置き場（2026-08-18 保存）

このフォルダは、開発セッションで使ってきた**検証スクリプト（Playwright）と作業スクリプト（Python）**の保存場所。
CLAUDE.md の各節（§）が参照している `scratchpad/◯◯.js` の実体はこれ。
フォルダ名が `_` で始まるので **GitHub Pages では公開されない**（Jekyll の既定で除外）。

## 使い方（新しいセッションで）
1. ローカルサーバー: `python3 -m http.server 8899 --directory /home/user/osamarinavi_bousui`
2. 実行: `node _check/card6.js` など（Playwright は `require('/opt/node22/lib/node_modules/playwright')`、
   ブラウザは `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`。版番号は `ls /opt/pw-browsers` で確認）
3. よこ向きスマホの検証は、`env(safe-area-inset-left/right)` を 59px に置換した `_land.html` を
   先に作ってから（作り方は CLAUDE.md §7・各スクリプトの先頭コメント参照）

## 主な検証スクリプト（現役）
- 現場記録帳: card6/card7/kbn1/go1/go2/namefit/selcolor/pwlist/edit1/exist1/kai1〜5chk/
  photo4/faces1/memo1/card4chk/card5chk/kdef/fil17/tag17c/strip17d/fast1/cvscroll/scrollcnt
- 図面・積算: adjchk/ang5/cross/cross2/align1/zdir/warichk/sec2chk/zfix2/f3chk/f4chk/
  lapchk/facegap/beadaudit/d3chk/partschk/photochk/pinch/split1/tb2/sweep3d/zumen3d/fix4/clickchk
- 現場マップ: maprow/mapsharp/dot3d/mapchk1/lnmap/faces2
- 共通: allpages2（全ページ×両向きでJSエラー確認）/ leftnav / pczoom
- ニセTHREE（CDN不通環境用）: stub3.js

## 主な作業スクリプト（Python）
- newdata.py / mapsync.py … 物件データの生成と現場マップへの同期（★物件を変えたら両方流す）
- dechecker.py … 添付画像の市松模様（透過の焼き込み）除去
- build_frame.py … パネル四隅の金具画像の生成
- apply_*.py … 過去の一括置換（適用済み・記録として保存）

★`node ◯◯.js ph` ＝スマホたて／`land` ＝よこ、が多くのスクリプトの共通引数。
