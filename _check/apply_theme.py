# -*- coding: utf-8 -*-
# 図面・積算：①方眼を本物の方眼紙どおり薄い水色に ②ダークモード（屋上の直射日光対策）
import io, sys

PATH = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []

# ---------- 1) 方眼の色をテーマから取る ----------
reps.append((
"""  for(let x=gx0;x<=gx1;x+=step){
    const bold=(step===1)? x%boldEvery===0 : x%(step*5)===0;
    ctx.strokeStyle = bold ? '#c9d4c6' : '#e3eae0';
    ctx.lineWidth = bold ? 1 : .5;
    ctx.beginPath(); ctx.moveTo(gx2px(x),0); ctx.lineTo(gx2px(x),H); ctx.stroke();
  }
  for(let y=gy0;y<=gy1;y+=step){
    const bold=(step===1)? y%boldEvery===0 : y%(step*5)===0;
    ctx.strokeStyle = bold ? '#c9d4c6' : '#e3eae0';
    ctx.lineWidth = bold ? 1 : .5;
    ctx.beginPath(); ctx.moveTo(0,gy2px(y)); ctx.lineTo(W,gy2px(y)); ctx.stroke();
  }
  /* 1mスケール表示 */
  ctx.fillStyle='#8a978c'; ctx.font='700 11px sans-serif';""",
"""  const _T=nnTH();                       /* ★方眼の色はテーマから（本物の方眼紙どおり薄い水色） */
  for(let x=gx0;x<=gx1;x+=step){
    const bold=(step===1)? x%boldEvery===0 : x%(step*5)===0;
    ctx.strokeStyle = bold ? _T.g2 : _T.g1;
    ctx.lineWidth = bold ? 1 : .5;
    ctx.beginPath(); ctx.moveTo(gx2px(x),0); ctx.lineTo(gx2px(x),H); ctx.stroke();
  }
  for(let y=gy0;y<=gy1;y+=step){
    const bold=(step===1)? y%boldEvery===0 : y%(step*5)===0;
    ctx.strokeStyle = bold ? _T.g2 : _T.g1;
    ctx.lineWidth = bold ? 1 : .5;
    ctx.beginPath(); ctx.moveTo(0,gy2px(y)); ctx.lineTo(W,gy2px(y)); ctx.stroke();
  }
  /* 1mスケール表示 */
  ctx.fillStyle=_T.scale; ctx.font='700 11px sans-serif';""",
'T1 方眼の色'))

# ---------- 2) テーマの定義（draw より前に置く） ----------
reps.append((
"""function draw(){
  const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;""",
"""/* ============================================================
   ★2026-08-06n 画面の色（テーマ）
   ・方眼は本物の方眼紙と同じ「薄い水色」。
   ・夜モード＝直射日光の屋上で画面が白飛びしないよう、地を暗くして線を明るくする。
     （まぶしさが減り、電池も持つ）
   canvas に描く色はCSSが効かないので、ここに持たせて draw() から使う。
   ============================================================ */
const NNTH={
  light:{ paper:'#fbfcf9', g1:'#dcecf7', g2:'#a6cee4', scale:'#8a978c',
          labBg:'rgba(255,255,255,.94)', edge:'#14449c', edgeW:'#ffffff',
          live:'#e8760a', body:'#b9bcb4', dim:'#14449c' },
  dark: { paper:'#0d161d', g1:'#1b3140', g2:'#3a7a99', scale:'#8399a6',
          labBg:'rgba(12,24,32,.92)', edge:'#67b6ff', edgeW:'#0b141b',
          live:'#ffab5e', body:'#39434c', dim:'#67b6ff' }
};
let nnTheme='light';
function nnTH(){ return NNTH[nnTheme]||NNTH.light; }
window.nnSetTheme=function(t){
  nnTheme=(t==='dark')?'dark':'light';
  document.documentElement.setAttribute('data-nntheme', nnTheme);
  try{ localStorage.setItem('nn_zumen_theme', nnTheme); }catch(_){}
  const b=document.getElementById('tl_theme');
  if(b)b.textContent = (nnTheme==='dark') ? '☀ 昼' : '🌙 夜';
  /* 3Dビューの背景もそろえる */
  try{ if(typeof T!=='undefined' && T && T.scene && typeof THREE!=='undefined')
        T.scene.background=new THREE.Color(nnTheme==='dark'?0x0d161d:0xe8ece6); }catch(_){}
  try{ draw(); }catch(_){}
};
window.nnToggleTheme=function(){ nnSetTheme(nnTheme==='dark'?'light':'dark'); };
try{ if(localStorage.getItem('nn_zumen_theme')==='dark'){
       nnTheme='dark'; document.documentElement.setAttribute('data-nntheme','dark'); } }catch(_){}

function draw(){
  const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;""",
'T2 テーマ定義'))

# ---------- 3) ツールバーに夜モードのボタン ----------
reps.append((
"""      <button class="tbtn" id="tl_ang" onclick="toggleAngles()">∠ 角度</button>""",
"""      <button class="tbtn" id="tl_ang" onclick="toggleAngles()">∠ 角度</button>
      <button class="tbtn" id="tl_theme" onclick="nnToggleTheme()" title="画面の明るさを切り替える（直射日光の屋上では「夜」が見やすい）">🌙 夜</button>""",
'T3 夜モードのボタン'))

# スマホでは「⋯ 道具」メニューへ移す
reps.append((
"""  ['tl_hole','tl_split','tl_rect','tl_pan','tl_ang'].forEach(id=>{ const el=document.getElementById(id); if(el)move.push(el); });""",
"""  ['tl_hole','tl_split','tl_rect','tl_pan','tl_ang','tl_theme'].forEach(id=>{ const el=document.getElementById(id); if(el)move.push(el); });""",
'T4 道具メニューへ'))

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1: ok = False
if not ok: sys.exit('中断')
for old, new, name in reps: s = s.replace(old, new)

# ---------- 4) 夜モードのCSS ----------
STYLE = """
<style id="nn-theme">
/* ============================================================
   夜モード（2026-08-06n）
   直射日光の屋上では白い画面が反射してほとんど見えない。
   地を暗く・線を明るくすると、まぶしさが減って線が読める。
   画面の色は canvas 側（NNTH）とCSS側（ここ）の両方に要る。
   ★このブロックは他の指定より後に置くこと（後に書いた方が勝つ）。
   ============================================================ */
html[data-nntheme="dark"]{
  --paper:#0c141a; --card:#16222c; --ink:#e7eff4; --ink-sub:#9db2be;
  --line:#2c3f4d; --green-lite:#14332a; --card-2:#1d2b36;
}
html[data-nntheme="dark"] body{background:#0c141a; color:#e7eff4;}
html[data-nntheme="dark"] #canvaswrap{background:#0d161d;}
html[data-nntheme="dark"] #three-wrap{background:#0d161d;}
html[data-nntheme="dark"] #side{background:#101a22; border-left-color:#2c3f4d;}
html[data-nntheme="dark"] .panel{background:#16222c; border-color:#2c3f4d;}
html[data-nntheme="dark"] .tbtn,
html[data-nntheme="dark"] .tsel,
html[data-nntheme="dark"] .wrow .seg button,
html[data-nntheme="dark"] .kindsel button,
html[data-nntheme="dark"] #dirRows .seg button{
  background:#1d2b36; color:#d3e2ea; border-color:#2c3f4d; box-shadow:none;}
html[data-nntheme="dark"] .tbtn.on,
html[data-nntheme="dark"] .wrow .seg button.on,
html[data-nntheme="dark"] #dirRows .seg button.on{background:#1f7a48; color:#fff; border-color:#1f7a48;}
html[data-nntheme="dark"] .tbtn.warn{color:#ff8f80;}
html[data-nntheme="dark"] #tbMenu{background:#16222c; border-color:#2c3f4d;}
html[data-nntheme="dark"] input,
html[data-nntheme="dark"] select,
html[data-nntheme="dark"] textarea{background:#1d2b36; color:#e7eff4; border-color:#2c3f4d;}
html[data-nntheme="dark"] .guide{background:#13302a; border-color:#27503f; color:#c2e3d1;}
html[data-nntheme="dark"] .brow:hover,
html[data-nntheme="dark"] .brow.on{background:#14332a;}
html[data-nntheme="dark"] .nosel,
html[data-nntheme="dark"] .panel h4 .r{color:#9db2be;}
html[data-nntheme="dark"] #nnHelp .card,
html[data-nntheme="dark"] #nnNumDlg .card{background:#16222c; color:#e7eff4; border-color:#2c3f4d;}
html[data-nntheme="dark"] #nnPlanBox{background:#16222c !important; border-color:#2c3f4d !important;}
/* 引き出し（スマホの積算・設定）と閉じるバーも */
html[data-nntheme="dark"] #nnSideBtn{background:#1f7a48;}
html[data-nntheme="dark"] .matline .v{color:#e7eff4;}
</style>
"""
anchor = "\n</body>\n</html>"
assert s.count(anchor) == 1
s = s.replace(anchor, "\n" + STYLE + anchor)
print('OK  夜モードのCSS')

io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
