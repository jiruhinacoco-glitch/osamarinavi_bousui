# 下のメニュー（メインアイコン）の絵を作る道具

`icons/nav_*.png`（18枚：ふつう／選択中 `_on`）をまとめて作り直す。

```bash
python3 _check/_tools/navgen/mknav2.py _check/_tools/navgen
```
（リポジトリの一番上のフォルダで流す。`icons/` に直接書き出す）

- 絵の元：`src/` の大きい絵（`kiroku_icon.png`・`icon_map.png`・`icon_hacchu.png`・`icon_kokkou.png`・`icon_camera.png`・`icon_zumen.png`）と `icons/icon_library.png`。
  ★`icons/` の同じ名前の絵は、上の帯に出す**小さい版**（高さ144）。新しい絵が届いたら、大きい絵を `src/` に、高さ144に縮めたものを `icons/` に置く（§828）。
  ホーム・図面積算・仕様材料は `navbak/` の古い絵から切り出している（新しい絵が届いたら差し替える）。
- 文字：`font_dl/noto_all.ttf`（Noto Sans JP Black を、メニューの文字だけに絞ったもの）。
- 作り直したら、全11ページの `nav_${k}${suf}.png?v=…` を新しい版名にする（同じ名前の差し替えなので）。
- 検査：`node _check/navkiroku.js` → `node _check/navwide.js kirokucho_demo.html`
