# パネルの枠（frame_panel.png）の作り直し方

- `frame_panel_src_corner.png` … 佐野さんが描いた**左上の角1枚**（元絵）
- `frame_panel.png` … それを4隅ぶんに組み立てたもの（アプリが使うのはこちら）

組み立ては `scratchpad/build_frame.py`。やっていること：
1. 元絵の外側（左上）から 300px 角を切り出す
2. 対角線で折り返して、横の腕とたての腕を完全に同じにそろえる
   （元絵は 横130px／たて137px と太さが違い、色の濃さも違ったため）
3. 角を鏡で反転して4隅を作り、辺は「まっすぐな部分の断面」を引き伸ばす
4. 中央48pxが引き伸ばされる部分。全体 648×648px

CSS 側（kirokucho_demo.html の `<style id="nn-panelframe">`）：
`border-image: url(...) 300 / 14px / 0 stretch` ＋ `border-radius:9px`
（絵は 角300px・帯130px・外側の丸み194px。画面で帯を約6pxにしたいので
 6 ÷ (130/300) ≒ 14px。丸みは 194×(14/300) ≒ 9px）

絵を描き直したら、元絵を `frame_panel_src_corner.png` に上書きして
build_frame.py を流し直せば `frame_panel.png` が作り直される。
