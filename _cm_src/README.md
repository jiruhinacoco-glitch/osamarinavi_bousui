# 納まりナビ CM動画（30秒）の作り方

出来上がり：`lp/cm/osamarinavi_cm_30s.mp4`（1920×1080・30コマ/秒・音楽つき）
このフォルダは名前が `_` で始まるので GitHub Pages には公開されない（作るための道具だけ）。

## 作り直す手順（このフォルダの中で）
```bash
npm i @fontsource/noto-sans-jp            # 書体（Noto Sans JP 700/900）
(cd .. && python3 -m http.server 8899 &)   # 実物の画面を撮るため
mkdir -p d3 shots && cp ../lp/img/ph_zumen_3d.webp ../lp/img/ph_index.webp shots/
node capstill.js    # 平面図・記録帳の画面写し → shots/
node capdash.js     # 記録帳ダッシュボード（1280×720 の2倍）→ shots/kiroku_dash.png
node cap3d.js       # 3Dの建物をぐるり180コマ → d3/
python3 music.py    # 音楽と効果音を計算で作る → music.wav（借り物の素材なし）
node render.js      # cm.html を 1/30 秒ずつ進めて 900コマ → frames/
ffmpeg -y -framerate 30 -i frames/f%04d.jpg -i music.wav -c:v libx264 -preset slow -crf 19 \
  -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest osamarinavi_cm_30s.mp4
```
- 文言・時間割は `cm.html`（`data-in`＝出てくる秒、`seek(t)`＝その秒の絵を作る）。
- 途中の絵だけ見たいとき：`node render.js 9 17.5 28` → `prev_◯.png`。
- 場面の切れ目（5／7.5／14／20／25秒）は音楽の拍（0.5秒きざみ）に合わせてある。変えるなら `music.py` も。
