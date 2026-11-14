# 見出し用の書体（Noto Sans JP Black）

`notosansjp-black.woff2` … 見出し（`.httl` の平行四辺形タグ）だけに使う書体。

## なぜ入れたか
本人がパワポで作った見出しの書体は **HGP創英角ゴシックUB**（Office に付属）。
これは **iPhone・Android には入っておらず、ウェブに載せることも許諾上できない**。
いちばん近い見た目で、**無料・商用可・埋め込み可**（SIL Open Font License 1.1）の
**Noto Sans JP の Black（太さ900）** に置き換えた。

## 大きさ
元は 982KB。**見出しに出る文字だけに絞って 52KB**（`pyftsubset`）。
`font-display:swap` なので、読み終わるまでは端末の書体で表示される
＝**画面が出るのを1msも遅らせない**（2026-07-28 の速度の決着を守る）。

## 文字を増やしたとき（見出しの文言を変えたとき）
絞り込んだ文字にない字は、端末の書体で出る（形が変わる）。作り直す手順：

```
pip install fonttools brotli
curl -o f.tgz https://registry.npmjs.org/@fontsource/noto-sans-jp/-/noto-sans-jp-5.3.0.tgz
tar xzf f.tgz package/files/noto-sans-jp-japanese-900-normal.woff2
# 使う文字を set.txt に並べて（ひらがな・カタカナ・数字・英字は全部入れておくこと）
python3 -m fontTools.subset package/files/noto-sans-jp-japanese-900-normal.woff2 \
  --text-file=set.txt --flavor=woff2 --layout-features='' \
  --no-hinting --desubroutinize --output-file=notosansjp-black.woff2
```

いま入っている文字：見出しに出ている漢字＋**ひらがな全部・カタカナ全部・数字・英字・記号**（503字）。
※2026-09-06e に「断」「投」を追加（図面・積算の帯の見出し「断面図モード」「3D投影モード」）。

## ★同じ名前で中身を差し替えたら、URLに版名を付けること（§66）
`@font-face` は JS から直接書けないので、`nn-httl-img-js` が
**版名つきの @font-face を後ろから足す**（後に書いたほうが勝つ）。
版名4点セットを上げれば、新しい書体に入れ替わる。

## 抜けていると「その字だけ細く見える」
絞り込みに無い字は端末の書体で出るので、**同じ見出しの中でその字だけ書体が変わる**。
実際に「平」「矩」が抜けていて指摘を受けた（2026-08-31b）。
`node _check/httlimg.js` の⑥が、見出しに出る字が全部入っているかを見張っている
（woff2 の文字一覧を fontTools で直に読む。ブラウザ側では1字ずつの有無は調べられない）。

## zenkaku-ttl.woff2（各ページの見出し専用・2026-10-26）
Zen Kaku Gothic New の太さ900（SIL Open Font License 1.1）から、見出しの文字（現場記録帳・発注・カメラ…）だけを切り出したもの（約6KB）。
common.css で **'NNTtl' という別の名前** で読み込む＝ほかの文字に影響しない。見出しの文言を増やしたら作り直す：
Google Fonts の `css2?family=Zen+Kaku+Gothic+New:wght@900&text=（使う文字）` を Chrome の名乗りで取得し、出てきた woff2 を保存。

---

# ゆるく傾けた書体（NNSlant）

`nnslant-medium.woff2` … スマホ表示の現場記録帳（現場詳細・一覧のカード）の字に使う書体。
**いま：太さ Medium（500＝この書体の標準）・傾き 4度**（2026-11-14zb。その前の za は Black・8度で `nnslant-black.woff2`。消した）。

## なぜ入れたか
本人が「見出しの『進行状況』の字（斜め）が綺麗。ほかの字もこれに」→ 斜体にしたら「結構傾いてる。もう少し緩く」→ 8度で「とても良い。角度を4度に、太さは普通に」。
ブラウザが作る斜体は角度が決まっていて（約14度）、変えられない。`font-style:oblique 8deg` と角度を書くと、
Chrome では日本語の斜めが消えた（英数字だけ斜めのまま）。iPhone でどうなるかも確かめられない。
→ **はじめから傾けた書体ファイル**を作って読み込むことにした。どのブラウザでも同じ角度になる。

## 中身
- 元：Zen Kaku Gothic New（Google Fonts。SIL Open Font License 1.1 ＝ 無料・商用可・改変可・埋め込み可）。
  ライセンス文は `LICENSE_ZenKakuGothicNew.txt`。改変したので、書体の中の名前は「NN Slant」に変えてある。
- 傾きは、字の真ん中の高さを中心にかける（字が右へ寄らない）。
- 入っている字：英数字・記号・かな・JIS第1・第2水準の漢字など 7,324字。**約1MB**。
  入っていない字（めずらしい人名の漢字など）は、ふつうの書体でブラウザの斜体（約14度）になる。
- `font-display:swap`。読み終わるまでは今までの斜体で出る（画面が出るのは遅らせない）。`sw.js` の ASSETS に入れてある。

## 角度・太さを変えたいとき
太さは**元のファイルで決まる**（Regular＝400／Medium＝500／Bold＝700／Black＝900）。CSS の数字だけ変えても綺麗に太くならない。
```
pip install fonttools brotli
curl -L -o ZK.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/zenkakugothicnew/ZenKakuGothicNew-Medium.ttf
python3 fonts/mk_nnslant.py 4 fonts/nnslant-medium.woff2 ZK.ttf     # 4度・Medium（いまの形）
```
作り直したら、`kirokucho_demo.html` の `@font-face`（NNSlant）のファイル名と `?a=4` の数字を変える（端末に古い書体が残らないように）。
ファイル名を変えたら `sw.js` の ASSETS も。太さを変えたら、同じ style の中の `font-weight:500` も合わせる。
