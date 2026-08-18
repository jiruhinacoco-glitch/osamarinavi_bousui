# -*- coding: utf-8 -*-
# ①プルダウン（select）の文字だけ異様に大きい問題を全ページで修正
#   原因：全ページ共通の「入力欄は16px以上」の指定に select まで入れていた（!important）
#   → iPhoneでズームが起きるのはキーボードが出る欄だけ。select は対象外なので外す。
# ②ライブラリの検索例タグ（5個）を削除
import io, glob, sys

OLD = """input:not([type=checkbox]):not([type=radio]):not([type=range]),
select, textarea{font-size:16px !important;}"""
NEW = """input:not([type=checkbox]):not([type=radio]):not([type=range]),
textarea{font-size:16px !important;}
/* ★2026-08-06m <select>（プルダウン）はこの指定から外した。
   iPhoneで画面が勝手に拡大するのは「キーボードが出る入力欄」だけで、
   プルダウンはピッカーが出るだけなので拡大しない。
   16pxを強制していたせいで、ページ側の指定（12.5px等）が全部打ち消され、
   絞り込みのプルダウンだけが一覧の見出しより大きく表示されていた。 */"""

total = 0
for f in sorted(glob.glob('/home/user/osamarinavi_bousui/*.html')):
    s = io.open(f, encoding='utf-8', newline='').read().replace('\r\n', '\n')
    c = s.count(OLD)
    if c == 0:
        print('--  ' + f.split('/')[-1] + '  該当なし')
        continue
    s = s.replace(OLD, NEW)
    io.open(f, 'w', encoding='utf-8', newline='').write(s)
    print(f'OK  {f.split("/")[-1]}  {c}箇所')
    total += c
print('合計', total, '箇所')

# ---- ライブラリ：検索例タグを削除 ----
P = '/home/user/osamarinavi_bousui/library.html'
s = io.open(P, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []
reps.append(("""  <div class="exs">
    <span class="ex" onclick="exSearch('パラペットが低い時のトーチ端末')">パラペットが低い時のトーチ端末</span>
    <span class="ex" onclick="exSearch('配管が密集している貫通部')">配管が密集している貫通部</span>
    <span class="ex" onclick="exSearch('ドレンの改修')">ドレンの改修</span>
    <span class="ex" onclick="exSearch('架台の脚回り')">架台の脚回り</span>
    <span class="ex" onclick="exSearch('目地が動く下地')">目地が動く下地</span>
  </div>
""", "", 'L1 検索例タグの削除'))
# 絞り込みの文字は一覧の見出しとつり合う大きさに（スマホ）
reps.append(("""html[data-nnphone="1"] .filterbar select{padding:2px 6px !important; border-radius:6px !important;}""",
"""html[data-nnphone="1"] .filterbar select{padding:2px 6px !important; border-radius:6px !important;
  font-size:12px !important;}   /* 一覧の見出し（13px）より小さく。絞り込みは脇役 */""",
'L2 プルダウンの文字を一覧より小さく'))

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1: ok = False
if not ok: sys.exit('中断')
for old, new, name in reps: s = s.replace(old, new)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了: library.html')
