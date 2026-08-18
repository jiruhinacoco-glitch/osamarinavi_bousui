# -*- coding: utf-8 -*-
# ①現場記録帳：絞り込みバーで検索欄が潰れて「年度別」と重なって見える → 検索欄に最低幅、チップ帯を横スクロールに
# ②ライブラリ：カード → 一覧（サムネイル付きの行）。選ぶと詳細（既存 openDetail）
import io, sys

def patch(path, reps):
    s = io.open(path, encoding='utf-8', newline='').read().replace('\r\n', '\n')
    ok = True
    for old, new, name in reps:
        c = s.count(old)
        print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
        if c != 1: ok = False
    if not ok: sys.exit('中断: ' + path)
    for old, new, name in reps: s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('書き込み完了:', path)

# ================= ① 現場記録帳 =================
patch('/home/user/osamarinavi_bousui/kirokucho_demo.html', [
("""html[data-nnphone="1"] #toolbar.toolbar{flex-wrap:nowrap !important;}
html[data-nnphone="1"] #toolbar .search{flex:1 1 150px !important; min-width:0 !important;}
html[data-nnphone="1"] #toolbar #chips{flex-wrap:nowrap !important; flex:none !important;}""",
"""/* ★2026-08-06j 「不具合別」が増えて7個になり、チップの合計幅が広がった結果、
   検索欄が数pxまで潰れて「年度別」の後ろに白い塊として顔を出していた。
   検索欄には最低幅を持たせ、あふれるチップは帯の中で横スクロールさせる。
   （絞り込みメニューは #nnPortal に複製して出すので、ここを
     overflow の箱にしてもメニューは閉じ込められない＝§4の作りが効く） */
html[data-nnphone="1"] #toolbar.toolbar{flex-wrap:nowrap !important;}
html[data-nnphone="1"] #toolbar .search{flex:0 1 150px !important; min-width:104px !important;}
html[data-nnphone="1"] #toolbar #chips{
  flex:1 1 200px !important; min-width:0 !important; flex-wrap:nowrap !important;
  overflow-x:auto !important; overflow-y:hidden !important;
  scrollbar-width:none; -webkit-overflow-scrolling:touch;}
html[data-nnphone="1"] #toolbar #chips::-webkit-scrollbar{display:none;}
/* 件数の札も少し詰めて、チップに幅をゆずる */
html[data-nnphone="1"] #toolbar #nnLC{font-size:11.5px !important; padding:3px 9px !important;}
html[data-nnphone="1"] #toolbar #nnLC b{font-size:14px !important;}""",
 'K1 ツールバーの幅配分'),
])

# ================= ② ライブラリ =================
OLD_GRID = """  c.innerHTML = note + `<div class="grid">`+ list.map(it=>`
    <div class="card" onclick="openDetail('${it.id}')">
      <div class="thumb ${KOU_CLS[it.kou]||''}">📷
        ${it.warn?'<span class="warnflag">⚠ 注意あり</span>':''}
        <span class="pctag">写真${(it.photos||[]).length}</span>
        ${it.cg?'<span class="cgtag">3DCG</span>':''}
      </div>
      <div class="cb">
        <div class="tt">${esc(it.title)}</div>
        <div class="tags">
          ${it.bui.slice(0,2).map(b=>`<span class="tag bui">${esc(b)}</span>`).join('')}
          <span class="tag kou">${esc(it.kou)}</span>
          <span class="tag ${it.kbn==='改修'?'kbn-kai':'kbn-shin'}">${esc(it.kbn)}</span>
          ${it.share==='private'?'<span class="tag share">🔒 自分のみ</span>':''}
        </div>
        <div class="foot"><span>${esc(String(it.date).slice(0,7).replace('-','/'))}</span><span class="reuse">↺ 転用 ${reuseOf(it)}回</span></div>
      </div>
    </div>`).join('') + `</div>`;"""

NEW_GRID = """  /* ★2026-08-06j カード → 一覧（行）形式。
     写真が主役のページなので、行の左に大きめのサムネイルを置いて絵は残す。
     行をタップすると今までどおり詳細（openDetail）が全画面で開く。 */
  c.innerHTML = note + `<div class="llist">`+ list.map(it=>`
    <div class="lrow" onclick="openDetail('${it.id}')">
      <div class="lth ${KOU_CLS[it.kou]||''}">${it.thumb?`<img src="${it.thumb}" alt="">`:'📷'}
        <span class="pc">写真${(it.photos||[]).length}</span>
        ${it.cg?'<span class="cg">3DCG</span>':''}
      </div>
      <div class="lbd">
        <div class="ltt">${it.warn?'<span class="lwarn">⚠ 注意あり</span>':''}${esc(it.title)}</div>
        <div class="tags">
          ${it.bui.slice(0,3).map(b=>`<span class="tag bui">${esc(b)}</span>`).join('')}
          <span class="tag kou">${esc(it.kou)}</span>
          <span class="tag ${it.kbn==='改修'?'kbn-kai':'kbn-shin'}">${esc(it.kbn)}</span>
          ${it.share==='private'?'<span class="tag share">🔒 自分のみ</span>':''}
        </div>
      </div>
      <div class="lmt">
        <span>${esc(String(it.date).slice(0,7).replace('-','/'))}</span>
        <span class="re">↺ 転用 ${reuseOf(it)}回</span>
      </div>
      <span class="lar">›</span>
    </div>`).join('') + `</div>`;"""

LIB_STYLE = """
<style id="nn-liblist">
/* ============================================================
   ライブラリ：カード → 一覧（行）形式（2026-08-06j）
   ------------------------------------------------------------
   1画面に入る件数を増やしつつ、写真が主役のページなので
   行の左に大きめのサムネイル（工法色＋📷／実写真があれば画像）を置く。
   行をタップすると詳細が全画面で開く（従来どおり openDetail）。
   ★このブロックは他の指定より後に置くこと（後に書いた方が勝つ）。
   ============================================================ */
.llist{display:flex; flex-direction:column; gap:6px;}
.lrow{
  display:flex; align-items:center; gap:11px; cursor:pointer;
  background:#fff; border:1px solid var(--line,#d7ded4); border-radius:var(--radius,9px);
  padding:7px 10px 7px 8px; transition:box-shadow .12s, border-color .12s;
}
.lrow:hover{border-color:var(--green,#2a7a4f); box-shadow:0 3px 10px rgba(42,122,79,.14);}
/* サムネイル（工法ごとの色。実写真が入ったら img が優先） */
.lth{
  flex:none; width:112px; height:72px; border-radius:7px; overflow:hidden; position:relative;
  display:flex; align-items:center; justify-content:center; font-size:26px;
  background:linear-gradient(135deg,#dfe7e0,#c8d6cc);
}
.lth.t-as{background:linear-gradient(135deg,#e8d5cd,#caa79a);}
.lth.t-ur{background:linear-gradient(135deg,#d4e2ee,#a9c4dd);}
.lth.t-en{background:linear-gradient(135deg,#d7e6ea,#a8c8d1);}
.lth img{width:100%; height:100%; object-fit:cover;}
.lth .pc{position:absolute; left:4px; bottom:4px; background:rgba(32,38,35,.8); color:#fff;
  font-size:9.5px; font-weight:800; border-radius:4px; padding:1px 6px;}
.lth .cg{position:absolute; right:4px; bottom:4px; background:rgba(30,92,58,.92); color:#fff;
  font-size:9.5px; font-weight:800; border-radius:4px; padding:1px 6px;}
/* 本文 */
.lbd{flex:1; min-width:0; display:flex; flex-direction:column; gap:5px;}
.ltt{font-weight:800; font-size:14px; line-height:1.45;}
.lwarn{display:inline-block; margin-right:6px; background:#fbe9e7; color:var(--warn,#c0392b);
  border:1px solid #e8b0a8; font-size:10.5px; font-weight:800; border-radius:4px; padding:1px 6px;
  vertical-align:1px;}
.lrow .tags{display:flex; gap:4px; flex-wrap:wrap;}
/* 右端の日付・転用回数と矢印 */
.lmt{flex:none; display:flex; flex-direction:column; align-items:flex-end; gap:2px;
  font-size:11px; font-weight:700; color:var(--ink-sub,#5a6b52); white-space:nowrap;}
.lmt .re{color:var(--green-deep,#1c6b3c);}
.lar{flex:none; color:#9aa89e; font-size:21px; font-weight:800; line-height:1;}
/* スマホ：サムネイルと文字を少し小さく */
@media (max-width:640px){
  .lrow{gap:8px; padding:6px 8px 6px 7px;}
  .lth{width:86px; height:58px; font-size:21px;}
  .ltt{font-size:13px;}
  .lmt{font-size:10px;}
  .lar{font-size:18px;}
}
/* たて画面の狭い端末では、日付・転用回数は本文の下へ回す（横幅を食わない） */
@media (max-width:430px){
  .lrow{flex-wrap:wrap;}
  .lmt{flex-direction:row; gap:10px; margin-left:94px; width:100%; justify-content:flex-start;}
  .lar{position:absolute;}
  .lrow{position:relative;}
  .lar{right:8px; top:50%; transform:translateY(-50%);}
}
</style>
"""

patch('/home/user/osamarinavi_bousui/library.html', [
    (OLD_GRID, NEW_GRID, 'L1 一覧を行形式に'),
    ("\n</body>\n</html>", "\n" + LIB_STYLE + "\n</body>\n</html>", 'L2 行のスタイル'),
])
print('すべて完了')
