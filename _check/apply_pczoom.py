# -*- coding: utf-8 -*-
"""① 並び順の説明文を削除（現場記録帳）
   ② パソコンの表示倍率をそろえる（全11ページ・zoom）
   ③ パネル見出し（完成工事高の予実・要対応 など）を大きく（PCのみ・現場記録帳）
置換が想定どおりのときだけ書き込む。"""
import io, glob, sys

rep = []
def note(ok_, msg): rep.append(('○ ' if ok_ else '★NG ') + msg)

# ==================================================================== ① 説明文の削除
P = '/home/user/osamarinavi_bousui/kirokucho_demo.html'
s = io.open(P, encoding='utf-8', newline='').read().replace('\r\n', '\n')
OLD = """        <span class="hsnote">見出しの ▼ を押すと、その項目で並び替わり、バーもその比率に変わります</span>\n"""
if s.count(OLD) == 1:
    s = s.replace(OLD, ''); note(True, '①並び順の説明文を削除')
else:
    note(False, '①説明文：%d件' % s.count(OLD))

# ==================================================================== ③ 見出しを大きく（PCのみ）
BLOCK3 = r'''
<style id="nn-pchead">
/* ★2026-08-09a パソコンでは、パネルの見出し（● 完成工事高の予実／● 要対応 など）が
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
</style>

</body>
</html>
'''
OLDEND = '\n</body>\n</html>\n'
if s.count(OLDEND) == 1:
    s = s.replace(OLDEND, BLOCK3); note(True, '③見出しを大きくするCSSを追加')
else:
    note(False, '③末尾の目印：%d件' % s.count(OLDEND))
io.open(P, 'w', encoding='utf-8', newline='').write(s)

# ==================================================================== ② PCの表示倍率（全11ページ）
FILL_OLD = """  function fill(){
    var pb = pageH();
    document.documentElement.style.setProperty('--nnvh', pb + 'px');
    if(!VIEWS) return;"""
FILL_NEW = """  function fill(){
    /* ★2026-08-09a パソコンで表示倍率（zoom）をかけているときは、
       innerHeight（実画面のpx）をそのまま使うと body の高さが倍率ぶん大きくなる。
       倍率で割って「CSSのpx」に直す。 */
    var _z = window.nnPZ || 1;
    var pb = pageH() / _z;
    document.documentElement.style.setProperty('--nnvh', pb + 'px');
    if(_z !== 1){                      /* 倍率をかけているときは下の余白うめをしない（パソコン用） */
      if(VIEWS) VIEWS.forEach(function(id){ var e=document.getElementById(id); if(e) e.style.minHeight=''; });
      return;
    }
    if(!VIEWS) return;"""

BLOCK2 = r'''
<style id="nn-pczoom">
/* ★2026-08-09a パソコンの「表示の大きさ」をモニターに関わらずそろえる（本人の指示）
   ------------------------------------------------------------------
   同じ拡大100%でも、大きいモニター（横に広い）ほど1画面に入るpxが増えるので、
   文字やボタンが相対的に小さく見える。そこで
     倍率 ＝ 画面の横幅 ÷ 1600px（1.00〜1.60の範囲）
   を html に zoom でかけ、どのモニターでも同じ見え方になるようにした。
   ★スマホ（data-nnphone="1"）は今までどおり。倍率はかけない。
   ★右下の小さなボタンで手動でも変えられる（覚える）。 */
#nnPz{
  position:fixed; right:9px; bottom:9px; z-index:96; display:none;
  align-items:center; gap:3px; padding:3px 6px; border-radius:999px;
  background:rgba(255,255,255,.86); border:1px solid #c6d2c6;
  box-shadow:0 2px 8px rgba(0,0,0,.18); opacity:.45; transition:opacity .15s;
  font-family:inherit;}
#nnPz:hover{opacity:1;}
html:not([data-nnphone="1"]) #nnPz{display:flex;}
#nnPz button{
  border:1px solid #bcd0c0; background:linear-gradient(180deg,#fff,#eef4ee); color:#1c6b3c;
  border-radius:7px; width:26px; height:22px; font-size:13px; font-weight:900; line-height:1;
  cursor:pointer; font-family:inherit; padding:0;}
#nnPz button.wide{width:auto; padding:0 8px; font-size:11px;}
#nnPz button:active{transform:translateY(1px);}
#nnPz span{font-size:11px; font-weight:900; color:#31473a; min-width:36px; text-align:center;
  font-variant-numeric:tabular-nums;}
</style>
<script id="nn-pczoom-js">
(function(){
  if(document.documentElement.getAttribute('data-nnphone')==='1'){ window.nnPZ=1; return; }
  var KEY='nn_pczoom', BASE=1600, MINZ=1.00, MAXZ=1.60;
  var mode='auto', man=1.2;
  try{ var v=localStorage.getItem(KEY);
       if(v && v!=='auto'){ mode='man'; man=parseFloat(v)||1.2; } }catch(e){}
  function autoZ(){
    var z=(window.innerWidth||1600)/BASE;
    z=Math.round(z*20)/20;                       /* 0.05きざみ */
    return Math.min(MAXZ, Math.max(MINZ, z));
  }
  function cur(){ return mode==='auto' ? autoZ() : Math.min(MAXZ, Math.max(0.80, man)); }
  function apply(){
    var z=cur();
    window.nnPZ=z;
    document.documentElement.style.zoom = (z===1 ? '' : z);
    document.documentElement.style.setProperty('--nnpzr', z);
    document.documentElement.setAttribute('data-nnpz', z===1 ? 'off' : 'on');
    var lb=document.getElementById('nnPzLbl');
    if(lb) lb.textContent = Math.round(z*100)+'%'+(mode==='auto'?'':'　');
    try{ if(window.nnFillBottom) window.nnFillBottom(); }catch(e){}
    try{ if(window.nnFitMapApp) window.nnFitMapApp(); }catch(e){}
    try{ if(window.nnSecRefresh) window.nnSecRefresh(); }catch(e){}
  }
  function set(z){ mode='man'; man=Math.round(z*20)/20;
    try{ localStorage.setItem(KEY, String(man)); }catch(e){} apply(); }
  function auto(){ mode='auto'; try{ localStorage.setItem(KEY,'auto'); }catch(e){} apply(); }
  function build(){
    if(document.getElementById('nnPz')) return;
    var d=document.createElement('div'); d.id='nnPz';
    d.innerHTML='<button type="button" title="小さくする">−</button>'+
                '<span id="nnPzLbl">100%</span>'+
                '<button type="button" title="大きくする">＋</button>'+
                '<button type="button" class="wide" title="モニターの幅に合わせて自動で決める">自動</button>';
    var bs=d.querySelectorAll('button');
    bs[0].onclick=function(){ set(cur()-0.05); };
    bs[2].onclick=function(){ set(cur()+0.05); };
    bs[3].onclick=auto;
    document.body.appendChild(d);
    apply();
  }
  apply();
  if(document.readyState==='loading') addEventListener('DOMContentLoaded',build); else build();
  addEventListener('resize', function(){ if(mode==='auto') apply(); });
})();
</script>

</body>
</html>
'''

files = sorted(glob.glob('/home/user/osamarinavi_bousui/*.html'))
okA = okB = 0
for p in files:
    t = io.open(p, encoding='utf-8', newline='').read().replace('\r\n', '\n')
    if 'id="nn-pczoom"' in t:
        continue
    if t.count(FILL_OLD) == 1:
        t = t.replace(FILL_OLD, FILL_NEW); okA += 1
    if t.count(OLDEND) == 1:
        t = t.replace(OLDEND, BLOCK2); okB += 1
    io.open(p, 'w', encoding='utf-8', newline='').write(t)
note(okA == 11, '②--nnvh を倍率で割る（%d/11ページ）' % okA)
note(okB == 11, '②表示倍率のCSS＋処理を追加（%d/11ページ）' % okB)

print('\n'.join(rep))
sys.exit(1 if any(r.startswith('★') for r in rep) else 0)
