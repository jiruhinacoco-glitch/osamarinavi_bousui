# -*- coding: utf-8 -*-
"""パソコンのときだけ、下部ナビを画面の左にたてに並べる（全11ページ）。"""
import io, glob, sys

BLOCK = r'''
<style id="nn-leftnav">
/* ★2026-08-08e パソコンのときだけ、ナビを画面の左にたてに並べる（本人の指示）
   上から ホーム → … → いちばん下が 仕様・材料（NAV の並び順そのまま）。
   スマホ（html[data-nnphone="1"]）は今までどおり画面下の帯のまま。
   ★判定は「端末の短いほうが700px未満ならスマホ」（nn-phonemark）。
     パソコンのブラウザには data-nnphone が付かないので :not() で分けている。 */
html:not([data-nnphone="1"]){ --nnnavw:86px; }
html:not([data-nnphone="1"]) body{ padding-left:var(--nnnavw) !important; }
html:not([data-nnphone="1"]) nav,
html:not([data-nnphone="1"]) nav#nav,
html:not([data-nnphone="1"]) body>nav{
  position:fixed !important; left:0 !important; right:auto !important;
  top:0 !important; bottom:0 !important;
  width:var(--nnnavw) !important; height:auto !important; max-height:none !important;
  flex-direction:column !important; flex-wrap:nowrap !important;
  justify-content:flex-start !important; align-items:center !important;
  gap:6px !important;
  padding:10px 4px calc(10px + env(safe-area-inset-bottom,0px)) 4px !important;
  overflow-y:auto !important; overflow-x:hidden !important;
  /* ★自動で隠れる動き（marginBottom と translateY）を打ち消す。
     インラインの style よりCSSの !important のほうが強い。 */
  margin:0 !important; transform:none !important;
  border-top:none !important; border-right:2px solid #0d2a18 !important;
  z-index:70 !important;
}
html:not([data-nnphone="1"]) nav::-webkit-scrollbar,
html:not([data-nnphone="1"]) nav#nav::-webkit-scrollbar{ width:0; display:none; }
html:not([data-nnphone="1"]) nav .ni,
html:not([data-nnphone="1"]) nav#nav .ni{
  margin:0 !important; padding:2px 0 !important; width:100% !important;
}
html:not([data-nnphone="1"]) nav .ni.hasimg,
html:not([data-nnphone="1"]) nav#nav .ni.hasimg{ margin:0 !important; }
html:not([data-nnphone="1"]) nav .ni .ic img,
html:not([data-nnphone="1"]) nav#nav .ni .ic img{
  height:auto !important; width:calc(var(--nnnavw) - 18px) !important; margin:0 auto !important;
}
/* 右下の▲（隠れたナビを出すボタン）はパソコンでは使わない */
html:not([data-nnphone="1"]) #navShowTab{ display:none !important; }
/* 画面いっぱいに広げている固定の部品を、左のナビのぶんだけ右へ寄せる */
html:not([data-nnphone="1"]) #nnver{ left:calc(var(--nnnavw) + 6px) !important; }
html:not([data-nnphone="1"]) #nnbar{ left:var(--nnnavw) !important; }
html:not([data-nnphone="1"]) #setup{ left:var(--nnnavw) !important; }
</style>

</body>
</html>
'''

OLD = '\n</body>\n</html>\n'
ok = True
files = sorted(glob.glob('/home/user/osamarinavi_bousui/*.html'))
for p in files:
    s = io.open(p, encoding='utf-8', newline='').read().replace('\r\n', '\n')
    if 'id="nn-leftnav"' in s:
        print('skip（既にある）', p); continue
    if s.count(OLD) != 1:
        print('★NG 目印が%d件' % s.count(OLD), p); ok = False; continue
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(OLD, BLOCK))
    print('○', p.split('/')[-1])
sys.exit(0 if ok else 1)
