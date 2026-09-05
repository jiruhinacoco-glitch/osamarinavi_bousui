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
