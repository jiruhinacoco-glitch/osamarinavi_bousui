# 下のメニュー（メインアイコン）の絵を作る道具

`icons/nav_*.png`（18枚：ふつう／選択中 `_on`）をまとめて作り直す。

```bash
python3 _check/_tools/navgen/mknav2.py _check/_tools/navgen
```
（リポジトリの一番上のフォルダで流す。`icons/` に直接書き出す）

- 絵の元：`icons/kiroku_icon.png`（現場記録帳）・`icons/icon_map.png`・`icons/icon_hacchu.png`・
  `icons/icon_kokkou.png`・`icons/icon_camera.png`・`icons/icon_library.png`。
  ホーム・図面積算・仕様材料は `navbak/` の古い絵から切り出している（新しい絵が届いたら差し替える）。
- 文字：`font_dl/noto_all.ttf`（Noto Sans JP Black を、メニューの文字だけに絞ったもの）。
- 作り直したら、全11ページの `nav_${k}${suf}.png?v=…` を新しい版名にする（同じ名前の差し替えなので）。
- 検査：`node _check/navkiroku.js` → `node _check/navwide.js kirokucho_demo.html`
