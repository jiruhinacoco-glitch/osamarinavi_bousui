# -*- coding: utf-8 -*-
# ①3Dの割付：短手（エンドラップ）の継目線が屋根からはみ出す → 屋根の中だけに描く
# ②ダークモードを図面・割付・断面・3Dのどこからでも切り替えられるように
# ③方眼（マス）の表示・非表示を追加
import io, sys

PATH = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []

# ---------- ① 継目線のはみ出し ----------
reps.append((
"""      lay.bands.forEach((b,bi)=>{
        /* 帯境界（サイドラップ位置）の継目線 */
        if(bi>0){
          const T2=q=>HDIR?q:{x:q.y,y:q.x};
          const segs=scanSegsH(ptsM.map(T2), holesM.map(hh=>hh.map(T2)), b.lo+1e-5);
          segs.forEach(sg=>{
            const len=sg[1]-sg[0]; if(len<0.05)return;
            const line=new THREE.Mesh(new THREE.BoxGeometry(HDIR?len:0.03, 0.006, HDIR?0.03:len), seamMat);
            const cx=HDIR?(sg[0]+sg[1])/2:b.lo, cz=HDIR?b.lo:(sg[0]+sg[1])/2;
            line.position.set(cx, lv+0.02, cz); g.add(line);
          });
        }
        /* エンドラップ（シート切断）位置の継目線 */
        b.segs.forEach(sg=>{
          sg.pieces.forEach((p,pi)=>{
            if(pi===0)return;
            const bw=Math.min(b.hi-b.lo, sp.sheetW);
            const line=new THREE.Mesh(new THREE.BoxGeometry(HDIR?0.03:bw, 0.006, HDIR?bw:0.03), seamMat);
            const cx=HDIR?p.s:(b.lo+bw/2), cz=HDIR?(b.lo+bw/2):p.s;
            line.position.set(cx, lv+0.02, cz); g.add(line);
          });
        });
      });""",
"""      /* 座標の入れ替え：T2＝帯に沿う向きのスキャン用／T3＝それと直交する向きのスキャン用 */
      const T2=q=>HDIR?q:{x:q.y,y:q.x};
      const T3=q=>HDIR?{x:q.y,y:q.x}:q;
      lay.bands.forEach((b,bi)=>{
        /* 帯境界（サイドラップ位置）の継目線 */
        if(bi>0){
          const segs=scanSegsH(ptsM.map(T2), holesM.map(hh=>hh.map(T2)), b.lo+1e-5);
          segs.forEach(sg=>{
            const len=sg[1]-sg[0]; if(len<0.05)return;
            const line=new THREE.Mesh(new THREE.BoxGeometry(HDIR?len:0.03, 0.006, HDIR?0.03:len), seamMat);
            const cx=HDIR?(sg[0]+sg[1])/2:b.lo, cz=HDIR?b.lo:(sg[0]+sg[1])/2;
            line.position.set(cx, lv+0.02, cz); g.add(line);
          });
        }
        /* エンドラップ（シート切断）位置の継目線
           ★2026-08-06s 以前は「帯の幅ぶんの棒」を屋根の形と無関係に置いていたため、
             凸凹した屋根では継目線が屋根の外へはみ出していた。
             その位置で屋根の中に入っている区間を求め、帯の範囲と重なる分だけ描く。 */
        b.segs.forEach(sg=>{
          sg.pieces.forEach((p,pi)=>{
            if(pi===0)return;
            const cross=scanSegsH(ptsM.map(T3), holesM.map(hh=>hh.map(T3)), p.s+1e-5);
            cross.forEach(cs=>{
              const lo=Math.max(cs[0], b.lo), hi=Math.min(cs[1], b.hi);
              const len=hi-lo; if(len<0.05)return;
              const line=new THREE.Mesh(new THREE.BoxGeometry(HDIR?0.03:len, 0.006, HDIR?len:0.03), seamMat);
              const cx=HDIR?p.s:(lo+hi)/2, cz=HDIR?(lo+hi)/2:p.s;
              line.position.set(cx, lv+0.02, cz); g.add(line);
            });
          });
        });
      });""",
'①継目線を屋根の中だけに'))

# ---------- ② 3Dの背景をテーマから ----------
reps.append((
"""  scene.background=new THREE.Color(0xe8ece6);""",
"""  /* ★背景はテーマに合わせる（3Dを開く前にダークにしていても効くように） */
  scene.background=new THREE.Color((typeof nnTheme!=='undefined'&&nnTheme==='dark')?0x0d161d:0xe8ece6);""",
'②3Dの背景'))

# 3Dの操作パッドに切替ボタン
reps.append((
"""  <button id="d3_fit" onclick="d3Fit()" title="全体を表示">⌂<i>全体</i></button>
</div>""",
"""  <button id="d3_fit" onclick="d3Fit()" title="全体を表示">⌂<i>全体</i></button>
  <button id="d3_theme" onclick="nnToggleTheme()" title="ダークモード／通常モードを切り替える">🌙<i>画面</i></button>
</div>""",
'②3Dパッドに切替ボタン'))

# ---------- ③ 方眼の表示・非表示 ----------
reps.append((
"""      <button class="tbtn" id="tl_theme" onclick="nnToggleTheme()" title="画面の明るさを切り替える（直射日光の屋上ではダークモードが見やすい）">🌙 ダークモード</button>""",
"""      <button class="tbtn" id="tl_theme" onclick="nnToggleTheme()" title="画面の明るさを切り替える（直射日光の屋上ではダークモードが見やすい）">🌙 ダークモード</button>
      <button class="tbtn on" id="tl_grid" onclick="nnToggleGrid()" title="方眼（マス）を出す・消す。消すと図面らしい見た目になります">▦ マス</button>""",
'③マスのボタン'))

# 方眼を描くかどうか
reps.append((
"""  const _T=nnTH();                       /* ★方眼の色はテーマから（本物の方眼紙どおり薄い水色） */
  for(let x=gx0;x<=gx1;x+=step){""",
"""  const _T=nnTH();                       /* ★方眼の色はテーマから（本物の方眼紙どおり薄い水色） */
  if(nnGridOn())for(let x=gx0;x<=gx1;x+=step){""",
'③方眼（たて線）'))
reps.append((
"""  for(let y=gy0;y<=gy1;y+=step){
    const bold=(step===1)? y%boldEvery===0 : y%(step*5)===0;
    ctx.strokeStyle = bold ? _T.g2 : _T.g1;""",
"""  if(nnGridOn())for(let y=gy0;y<=gy1;y+=step){
    const bold=(step===1)? y%boldEvery===0 : y%(step*5)===0;
    ctx.strokeStyle = bold ? _T.g2 : _T.g1;""",
'③方眼（よこ線）'))

# 状態と切り替え関数
reps.append((
"""window.nnToggleTheme=function(){ nnSetTheme(nnTheme==='dark'?'light':'dark'); };""",
"""window.nnToggleTheme=function(){ nnSetTheme(nnTheme==='dark'?'light':'dark'); };
/* ★方眼（マス）の表示・非表示（2026-08-06s）
   消すと方眼紙ではなく「図面」に見えるので、清書や元請への画面見せに向く。
   打点は消しても今までどおり交差点に止まる（見えないだけ）。 */
let nnGrid=true;
window.nnGridOn=()=>nnGrid;
window.nnSetGrid=function(on){
  nnGrid=!!on;
  try{ localStorage.setItem('nn_zumen_grid', nnGrid?'1':'0'); }catch(_){}
  const b=document.getElementById('tl_grid');
  if(b){ b.classList.toggle('on',nnGrid); b.textContent=nnGrid?'▦ マス':'▢ マス'; }
  try{ draw(); }catch(_){}
};
window.nnToggleGrid=function(){ nnSetGrid(!nnGrid); };
try{ if(localStorage.getItem('nn_zumen_grid')==='0')nnGrid=false; }catch(_){}""",
'③マスの状態'))

# 起動時にボタンの見た目をそろえる（テーマとマス）
reps.append((
"""try{ if(localStorage.getItem('nn_zumen_theme')==='dark'){
       nnTheme='dark'; document.documentElement.setAttribute('data-nntheme','dark'); } }catch(_){}""",
"""try{ if(localStorage.getItem('nn_zumen_theme')==='dark'){
       nnTheme='dark'; document.documentElement.setAttribute('data-nntheme','dark'); } }catch(_){}
/* 画面ができてからボタンの見た目（🌙／☀・▦／▢）を今の状態に合わせる */
addEventListener('DOMContentLoaded',function(){
  try{
    const b=document.getElementById('tl_theme');
    if(b)b.textContent=(nnTheme==='dark')?'☀ 通常モード':'🌙 ダークモード';
    const g=document.getElementById('tl_grid');
    if(g){ g.classList.toggle('on',nnGrid); g.textContent=nnGrid?'▦ マス':'▢ マス'; }
  }catch(_){}
});""",
'②③起動時のボタン表示'))

# 方眼を消したときはスケールの案内も変える
reps.append((
"""  ctx.fillText(`方眼：1マス＝${(typeof fmtScale==='function')?fmtScale(state.scaleM):state.scaleM}m（太線＝1m）`, 12, H-10);""",
"""  ctx.fillText(nnGridOn()
    ? `方眼：1マス＝${(typeof fmtScale==='function')?fmtScale(state.scaleM):state.scaleM}m（太線＝1m）`
    : `マス非表示（1マス＝${(typeof fmtScale==='function')?fmtScale(state.scaleM):state.scaleM}m のまま。打点は交差点に止まります）`, 12, H-10);""",
'③スケール表示の文言'))

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1: ok = False
if not ok: sys.exit('中断')
for old, new, name in reps: s = s.replace(old, new)

# スマホの道具メニューにマスのボタンも入れる
old_move = "  ['tl_hole','tl_split','tl_rect','tl_pan','tl_ang','tl_theme','tl_photo'].forEach(id=>{ const el=document.getElementById(id); if(el)move.push(el); });"
assert s.count(old_move) == 1
s = s.replace(old_move,
  "  ['tl_hole','tl_split','tl_rect','tl_pan','tl_ang','tl_theme','tl_grid','tl_photo'].forEach(id=>{ const el=document.getElementById(id); if(el)move.push(el); });")
print('OK  ③道具メニューへ')

# 断面タブのバーにも切替ボタン
old_sec = """  +'<button class="pdf" type="button" id="sec_pdf">📐 PDFで出す</button>'"""
assert s.count(old_sec) == 1
s = s.replace(old_sec,
  """  +'<button class="pdf" type="button" id="sec_theme" style="margin-left:auto">🌙 画面</button>'
  +'<button class="pdf" type="button" id="sec_pdf" style="margin-left:6px">📐 PDFで出す</button>'""")
old_sec2 = """document.getElementById('sec_pdf').addEventListener('click',()=>{ if(window.nnSectionPDF)nnSectionPDF(); });"""
assert s.count(old_sec2) == 1
s = s.replace(old_sec2,
  """document.getElementById('sec_pdf').addEventListener('click',()=>{ if(window.nnSectionPDF)nnSectionPDF(); });
document.getElementById('sec_theme').addEventListener('click',()=>{ if(window.nnToggleTheme){ nnToggleTheme(); nnSecDraw(); } });""")
print('OK  ②断面バーに切替ボタン')

# 3Dパッドのボタンの見た目（既存の #d3pad button に合わせる。iタグの字も）
STYLE = """
<style id="nn-3fix">
/* 3Dの操作パッドに足した「画面（ダークモード切替）」ボタン（2026-08-06s） */
#d3pad #d3_theme{font-size:15px;}
html[data-nntheme="dark"] #d3pad button{background:#1d2b36; color:#d3e2ea; border-color:#2c3f4d;}
html[data-nntheme="dark"] #secBar .pdf{background:#1d2b36; color:#8fe0ad; border-color:#2c3f4d;}
/* マス非表示のときのボタン（枠だけの見た目） */
#tl_grid:not(.on){opacity:.75;}
</style>
"""
anchor = "\n</body>\n</html>"
assert s.count(anchor) == 1
s = s.replace(anchor, "\n" + STYLE + anchor)
print('OK  スタイル追加')

io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
