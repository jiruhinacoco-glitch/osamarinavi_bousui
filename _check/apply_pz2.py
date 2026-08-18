# -*- coding: utf-8 -*-
"""① 右下の倍率ボタンを削除（自動の倍率はそのまま残す）：全11ページ
   ② パネル見出し（● 完成工事高の予実 など）を「全物件」チップと同じ見た目に：現場記録帳"""
import io, glob, sys, re

rep=[]
def note(c,m): rep.append(('○ ' if c else '★NG ')+m)

# ============================================================ ① 倍率ボタンを削除
NEW_BLOCK = r'''<style id="nn-pczoom">
/* ★2026-08-11a パソコンの「表示の大きさ」をモニターに関わらずそろえる（本人の指示）
   ------------------------------------------------------------------
   同じ拡大100%でも、大きいモニター（横に広い）ほど1画面に入るpxが増えるので、
   文字やボタンが相対的に小さく見える。そこで
     倍率 ＝ 画面の横幅 ÷ 1600px（1.00〜1.60の範囲）
   を html に zoom でかけ、どのモニターでも同じ見え方になるようにした。
   ★スマホ（data-nnphone="1"）は今までどおり。倍率はかけない。
   ★2026-08-11b：手動の倍率ボタンは削除（パソコンはブラウザの拡大縮小が使えるため）。 */
</style>
<script id="nn-pczoom-js">
(function(){
  if(document.documentElement.getAttribute('data-nnphone')==='1'){ window.nnPZ=1; return; }
  var BASE=1600, MINZ=1.00, MAXZ=1.60;
  function autoZ(){
    var z=(window.innerWidth||1600)/BASE;
    z=Math.round(z*20)/20;                       /* 0.05きざみ */
    return Math.min(MAXZ, Math.max(MINZ, z));
  }
  function apply(){
    var z=autoZ();
    window.nnPZ=z;
    document.documentElement.style.zoom = (z===1 ? '' : z);
    document.documentElement.style.setProperty('--nnpzr', z);
    document.documentElement.setAttribute('data-nnpz', z===1 ? 'off' : 'on');
    try{ if(window.nnFillBottom) window.nnFillBottom(); }catch(e){}
    try{ if(window.nnFitMapApp) window.nnFitMapApp(); }catch(e){}
    try{ if(window.nnSecRefresh) window.nnSecRefresh(); }catch(e){}
  }
  apply();
  addEventListener('resize', apply);
})();
</script>'''

files = sorted(glob.glob('/home/user/osamarinavi_bousui/*.html'))
n=0
pat = re.compile(r'<style id="nn-pczoom">.*?</script>', re.S)
for p in files:
    s = io.open(p, encoding='utf-8', newline='').read()
    m = pat.findall(s)
    if len(m)!=1: continue
    s = pat.sub(lambda _:NEW_BLOCK, s, count=1)
    io.open(p,'w',encoding='utf-8',newline='').write(s); n+=1
note(n==11, '①倍率ボタンを削除・自動倍率は継続（%d/11ページ）'%n)
# 念のため残骸チェック
left = sum(1 for p in files if 'nnPz' in io.open(p,encoding='utf-8').read())
note(left==0, '①#nnPz の残骸なし（%d件）'%left)

# ============================================================ ② 見出しを「全物件」と同じ見た目に
P='/home/user/osamarinavi_bousui/kirokucho_demo.html'
s=io.open(P,encoding='utf-8',newline='').read()
OLD = """<style id="nn-pchead">
/* ★2026-08-11a パソコンでは、パネルの見出し（● 完成工事高の予実／● 要対応 など）が
   上のKPIの帯（見積済・契約高…）に比べて小さすぎて読みにくい、との指摘。
   色は元から同じ緑なので、大きさをKPIの帯（14px）にそろえる。 */
html:not([data-nnphone="1"]) .httl{
  font-size:14px !important; padding:4px 17px !important; letter-spacing:.06em !important;
  box-shadow:0 1px 3px rgba(0,0,0,.25) !important;}
html:not([data-nnphone="1"]) .httl::before{ font-size:11px !important; vertical-align:0 !important; }
html:not([data-nnphone="1"]) .dpanel h4{ font-size:14px !important; margin-bottom:9px !important; gap:9px !important; }
html:not([data-nnphone="1"]) .dpanel h4 .cta{ font-size:12.5px !important; }
/* 見出しの右にある小さなボタン（列の編集・拡大）も合わせて少し大きく */
html:not([data-nnphone="1"]) .colgear, html:not([data-nnphone="1"]) .zx{ font-size:12px !important; }
</style>"""
NEW = """<style id="nn-pchead">
/* ★2026-08-11b パネルの見出し（完成工事高の予実／要対応 など）を、
   いちばん上の「全物件 77」チップ（.stchip.on）と同じ色・同じデザインにそろえる（本人の指示）。
   ・明るい緑のグラデ（#48c274→#2e9e58）＋濃い緑の枠（#124a28）＋角16px
   ・先頭の ●／■ の印は「全物件」に無いので出さない
   ・大きさもチップに合わせる（13.5px／数字は15px） */
.httl{
  background:linear-gradient(180deg,var(--green-hi,#48c274),var(--green,#2e9e58)) !important;
  border:1.5px solid var(--green-edge,#124a28) !important;
  border-radius:16px !important;
  color:#fff !important;
  text-shadow:0 1px 1px rgba(18,74,40,.55) !important;
  font-weight:800 !important;
  box-shadow:none !important;
  letter-spacing:.03em !important;}
.httl::before{ content:'' !important; display:none !important; }
.httl b{ margin-left:4px; font-size:1.11em; }
/* パソコンでは「全物件」と同じ大きさ（スマホは今までどおり小さめ） */
html:not([data-nnphone="1"]) .httl{ font-size:13.5px !important; padding:4px 13px !important; }
html:not([data-nnphone="1"]) .dpanel h4{ font-size:14px !important; margin-bottom:9px !important; gap:9px !important; }
html:not([data-nnphone="1"]) .dpanel h4 .cta{ font-size:12.5px !important; }
/* 見出しの右にある小さなボタン（列の編集・拡大）も合わせて少し大きく */
html:not([data-nnphone="1"]) .colgear, html:not([data-nnphone="1"]) .zx{ font-size:12px !important; }
</style>"""
if s.count(OLD)==1:
    s=s.replace(OLD,NEW); io.open(P,'w',encoding='utf-8',newline='').write(s)
    note(True,'②見出しを「全物件」と同じ色・デザインに')
else:
    note(False,'②見出しCSS：%d件'%s.count(OLD))

print('\n'.join(rep))
sys.exit(1 if any(r.startswith('★') for r in rep) else 0)
