# 納まりナビ 下部ナビ改修指示書（画像アイコン化＋現場マップ追加）

## 目的
1. 下部ナビの絵文字アイコンを、`icons/` フォルダのPNG画像ボタンに置き換える
2. ナビに「現場マップ」を追加する
3. 「材料登録」ボタンをナビから外し、「仕様登録」を「仕様・材料」に改名して統合する

## 前提・注意
- 対象はリポジトリ内の**下部ナビを持つ全HTMLページ**（zairyo_toroku.html / shiyo_toroku.html / kirokucho_demo.html / hacchu.html / kokkosho.html / camera.html / yougo.html / index.html など。`grep -l "buildNav" *.html` で実際の対象を確認してから着手すること）
- ナビ実装は各ページに `const NAV=[...]` / `NAV_LINKS` / `NAV_ACTIVE` / `ICONS` / `buildNav()` が**重複コピーされている構造**。全ページに同じパッチを当てる
- CSSはページ内インラインの場合と common.css の場合があるため、`nav .ni` の定義場所をページごとに確認して適切な方へ追記する
- **作業前に必ず git commit で現状を保存**し、ステップごとにコミットすること

## Step 0：画像ファイルの確認
`icons/` フォルダに以下が置かれているか確認（ユーザーがPowerPointから書き出したもの）：
`nav_home.png, nav_kiroku.png, nav_map.png, nav_hacchu.png, nav_kokkou.png, nav_camera.png, nav_library.png, nav_zumen.png, nav_shiyou.png, nav_yougo.png, nav_settei.png`（＋各 `_on.png` 選択時版、計22枚）

各PNGについて次を検証し、NGはユーザーに報告：
- 透過PNGであること（四隅のalphaが0。白背景が焼き付いていたら報告）
- 幅400px以上
- 1枚500KB超なら要圧縮と報告

`_on` 版が未提供のキーがあっても動くようにフォールバック実装にする（後述）。

## Step 1：NAV配列の変更（全ページ共通）
既存：
```js
const NAV=[['home','ホーム'],['kiroku','現場記録帳'],['hacchu','発注'],['kokkou','国交省仕様'],['camera','カメラ'],
           ['library','ライブラリ'],['zumen','図面/積算'],['zairyo','材料登録'],['shiyou','仕様登録'],['yougo','用語集'],['settei','設定']];
```
変更後：
```js
const NAV=[['home','ホーム'],['kiroku','現場記録帳'],['map','現場マップ'],['hacchu','発注'],['kokkou','国交省仕様'],['camera','カメラ'],
           ['library','ライブラリ'],['zumen','図面/積算'],['shiyou','仕様・材料'],['yougo','用語集'],['settei','設定']];
```
- `zairyo` の項目は削除（ページ zairyo_toroku.html 自体は削除しない）
- NAV_LINKS に `map:'./genba_map_v36.html'` を追加（現場マップの実ファイル名がv36と異なる場合はリポジトリ内の最新版ファイル名に合わせる）
- ICONS オブジェクトに `map:'🗺️'` を追加（画像未配置時のフォールバック用）
- zairyo_toroku.html 内の `NAV_ACTIVE='zairyo'` は `NAV_ACTIVE='shiyou'` に変更（材料登録ページを開いている間は「仕様・材料」を点灯扱いにする）

## Step 2：buildNav() を画像対応に差し替え（全ページ共通）
既存の buildNav() 内の innerHTML 生成を以下に置き換える：
```js
function buildNav(){
  const n=document.getElementById('nav');
  n.innerHTML=NAV.map(([k,l])=>{
    const suf=(k===NAV_ACTIVE)?'_on':'';
    return `<div class="ni ${k===NAV_ACTIVE?'on':''}" onclick="navGo('${k}','${l}')">
      <span class="ic"><img src="./icons/nav_${k}${suf}.png" alt="${l}"
        onload="this.closest('.ni').classList.add('hasimg')"
        onerror="if(!this.dataset.f){this.dataset.f=1;this.src='./icons/nav_${k}.png';}
                 else{this.outerHTML=ICONS['${k}']||'▫️';}"></span><span>${l}</span></div>`;
  }).join('');
}
```
フォールバック順：`_on版 → 通常版 → 絵文字`。画像が1枚もなくても現状表示が維持されること。

## Step 3：CSS追記（nav .ni の定義がある場所へ）
```css
/* 画像アイコンボタン */
nav .ni .ic img{height:56px; display:block;}
nav .ni.hasimg{padding:2px 3px;}
nav .ni.hasimg > span:last-child{display:none;}      /* 画像にラベル内蔵→テキスト非表示 */
nav .ni.hasimg .ic{filter:none;}
/* アクティブ時：黄色座布団をやめ、_on画像＋発光＋拡大で表現 */
nav .ni.hasimg.on{background:none; border:none; box-shadow:none; text-shadow:none;
  filter:drop-shadow(0 0 5px #ffd23f) drop-shadow(0 0 2px #ffd23f);
  transform:scale(1.14);                 /* 選択中だけ少し大きく（レイアウトは動かない） */
  transform-origin:center bottom;        /* バーの底辺を基準に上方向へ育つ */
  z-index:2; position:relative;          /* 拡大分が隣ボタンの上に自然に重なる */
}
nav .ni.hasimg{transition:transform .15s ease-out, filter .15s ease-out;}
nav .ni.hasimg:hover{transform:scale(1.06);}   /* PCではホバーでも半歩反応（ゲーム的タップ感） */
nav .ni.hasimg.on:hover{transform:scale(1.14);}
/* 拡大してもナビバーからはみ出て切れないよう、バーに上余白を確保 */
nav{overflow:visible; padding-top:6px;}
/* スマホ：横スクロール許可＋タップサイズ確保 */
@media (max-width:760px){
  nav{overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; justify-content:flex-start;}
  nav::-webkit-scrollbar{display:none;}
  nav .ni .ic img{height:48px;}
}
```
既存のモバイル用 `nav .ni .ic img{height:18px !important;}` のような旧指定が残っていたら削除または上書きされるよう調整すること。
`nav .ni:first-child{margin-left:auto;}` / `:last-child{margin-right:auto;}` の中央寄せ指定は、モバイルの横スクロール時に先頭が見切れる原因になるため、`@media (max-width:760px)` 内で `margin-left:0 / margin-right:0` に上書きする。

## Step 4：仕様登録ページに材料マスタへの導線
shiyo_toroku.html のヘッダー（タイトル付近の右側）に追加：
```html
<button class="btn-ghost" onclick="location.href='./zairyo_toroku.html'">🧱 材料マスタを開く</button>
```
класс名はページ既存のボタンスタイルに合わせて調整可。目立つ位置ならスタイルは任せる。

## Step 5：現場マップに共通ナビを移植
genba_map_v36.html（現場マップ）には共通の下部ナビが存在しない。他ページと同じ `<nav id="nav">` ＋ NAV/NAV_LINKS/ICONS/navGo/buildNav 一式を移植する。
- `NAV_ACTIVE='map'` とする
- 現場マップは地図が全画面のため、ナビ追加により地図やUI（#leftStack、#showAll、スケールバー等）の下端が隠れないよう、地図コンテナの高さ・bottom系の座標を ナビ高さぶん調整する
- ナビは他ページと同じ見た目（濃緑バー）で下部固定

## Step 6：検証
1. 各ページをブラウザで開き、①画像ボタンが表示される ②アクティブページのボタンだけ `_on` 画像＋発光になる ③画像を1枚リネームして絵文字フォールバックが働く、を確認
2. ウィンドウ幅を380pxに縮め、ナビが横スクロールできること・ボタン高さ48pxで文字が読めることを確認
3. 現場マップ→他ページ→現場マップ の遷移がナビだけで往復できることを確認
4. 全ページの NAV 配列・リンクが同一であることを `grep "const NAV=" *.html` で最終確認
5. 問題なければ commit → push（GitHub Pages反映まで確認）

## やらないこと
- zairyo_toroku.html の削除・統合（ページは温存、ナビから外すだけ）
- アイコンPNG自体の加工（透過NG等はユーザーに報告のみ）
- ナビ以外の機能改修
