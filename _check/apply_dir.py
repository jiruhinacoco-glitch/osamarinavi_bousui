# -*- coding: utf-8 -*-
# 図面・積算：
#  ①シートの流し方向を「部位ごと」に選べるようにする（横／縦／短手／全体に従う）
#  ②数値の入力欄で日本語キーボードが出ないように inputmode を指定（GL+ ほか）
import io, re, sys

PATH = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []

# ---------- ① 流し方向 ----------
# A. 「短手に流す」ボタン＋部位ごとの行
reps.append((
"""      <div class="wrow">流し方向
        <span class="seg"><button id="dir_h" class="on" onclick="setDir('h')">横流し</button><button id="dir_v" onclick="setDir('v')">縦流し</button></span>
      </div>""",
"""      <div class="wrow">流し方向
        <span class="seg"><button id="dir_h" class="on" onclick="setDir('h')">横流し</button><button id="dir_v" onclick="setDir('v')">縦流し</button><button id="dir_s" onclick="setDir('short')">短手に流す</button></span>
      </div>
      <div id="dirRows"></div>""",
'D1 短手ボタン＋部位ごとの入れ物'))

# B. dirOf / shortDir / setPolyDir / renderDirRows と setDir の作り直し
reps.append((
"""function setDir(d){ state.dir=d; wfSel=null; renderWfSel(); document.getElementById('dir_h').classList.toggle('on',d==='h'); document.getElementById('dir_v').classList.toggle('on',d==='v'); saveState(); draw(); }""",
"""/* ★2026-08-06k シートの流し方向は「部位ごと」に決められる。
   poly.dir が 'h'（横流し）／'v'（縦流し）／'short'（短手に流す）なら
   その部位だけその向き。未設定なら全体の設定（state.dir）に従う。
   'short'＝その部位の外接四角形の短い辺に沿ってロールを流す
   （横長の屋根なら縦流し・縦長の屋根なら横流し）。 */
function shortDir(poly){
  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  ((poly&&poly.pts)||[]).forEach(p=>{ mnx=Math.min(mnx,p.x); mxx=Math.max(mxx,p.x);
                                      mny=Math.min(mny,p.y); mxy=Math.max(mxy,p.y); });
  if(mxx<mnx)return state.dir==='v'?'v':'h';
  return ((mxx-mnx)>=(mxy-mny))?'v':'h';        /* 横長→縦流し／縦長→横流し */
}
function dirOf(poly){
  const d=(poly&&poly.dir)||'';
  if(d==='h'||d==='v')return d;
  if(d==='short')return shortDir(poly);
  if(state.dir==='short')return shortDir(poly);  /* 全体で「短手」を選んだとき */
  return state.dir==='v'?'v':'h';
}
const DIR_LB={h:'横流し', v:'縦流し'};
function dirBtns(){
  const g=id=>document.getElementById(id);
  if(g('dir_h'))g('dir_h').classList.toggle('on',state.dir==='h');
  if(g('dir_v'))g('dir_v').classList.toggle('on',state.dir==='v');
  if(g('dir_s'))g('dir_s').classList.toggle('on',state.dir==='short');
}
function setDir(d){ state.dir=d; wfSel=null; renderWfSel(); dirBtns(); renderDirRows(); saveState(); draw(); }
window.setPolyDir=function(i,v){
  const p=state.polys[i]; if(!p)return;
  if(v)p.dir=v; else delete p.dir;              /* 空＝全体に従う */
  wfSel=null; renderWfSel(); renderDirRows(); saveState(); draw();
};
/* 部位ごとの流し方向の一覧（部位が2つ以上のときだけ出す） */
function renderDirRows(){
  const d=document.getElementById('dirRows'); if(!d)return;
  dirBtns();
  if(!state.polys.length || state.polys.length<2){ d.innerHTML=''; return; }
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  d.innerHTML='<div class="dirttl">部位ごとに変える</div>'+state.polys.map((p,i)=>{
    const cur=p.dir||'';
    const b=(v,lb)=>`<button class="${cur===v?'on':''}" onclick="setPolyDir(${i},'${v}')">${lb}</button>`;
    return `<div class="dirrow"><span class="nm">${esc(p.name)}</span>`
      +`<span class="seg">${b('','全体')}${b('h','横')}${b('v','縦')}${b('short','短手')}</span>`
      +`<span class="now">${DIR_LB[dirOf(p)]}</span></div>`;
  }).join('');
}""",
'D2 dirOf・setPolyDir・renderDirRows'))

# C. 割付図の描画
reps.append((
"""  const lay=wari(ptsM, holesM, sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, state.dir, state.chidori);
  const H=state.dir==='h';
  const toX=v=>gx2px(v/s), toY=v=>gy2px(v/s);""",
"""  const PDIR=dirOf(poly);
  const lay=wari(ptsM, holesM, sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, PDIR, state.chidori);
  const H=PDIR==='h';
  const toX=v=>gx2px(v/s), toY=v=>gy2px(v/s);""",
'D3 割付図の描画'))
reps.append((
"""        wfHit.push({pi, n, dir:state.dir, lo:b.lo, hi:b.hi, s:pc.s, e:pc.e,""",
"""        wfHit.push({pi, n, dir:PDIR, lo:b.lo, hi:b.hi, s:pc.s, e:pc.e,""",
'D4 当たり判定に部位の向きを持たせる'))

# D. シートのクリック判定（部位ごとに向きが違うので、帯ごとに向きを見る）
reps.append((
"""  const mxM=(state.dir==='h'?mouse.rawx:mouse.rawy)*s;   /* 走り方向 */
  const myM=(state.dir==='h'?mouse.rawy:mouse.rawx)*s;   /* 帯方向 */
  let hit=null;
  for(let i=wfHit.length-1;i>=0;i--){                     /* 後勝ち＝上の帯を優先 */
    const w=wfHit[i];
    if(myM>=w.lo-1e-9 && myM<=w.hi+1e-9 && mxM>=w.s-1e-9 && mxM<=w.e+1e-9""",
"""  let hit=null;
  for(let i=wfHit.length-1;i>=0;i--){                     /* 後勝ち＝上の帯を優先 */
    const w=wfHit[i];
    /* ★部位ごとに流し方向が違うので、帯に保存した向きで座標を読み替える */
    const mxM=(w.dir==='h'?mouse.rawx:mouse.rawy)*s;      /* 走り方向 */
    const myM=(w.dir==='h'?mouse.rawy:mouse.rawx)*s;      /* 帯方向 */
    if(myM>=w.lo-1e-9 && myM<=w.hi+1e-9 && mxM>=w.s-1e-9 && mxM<=w.e+1e-9""",
'D5 シートのクリック判定'))

# E. 数量集計
reps.append((
"""    const lay=wari(ptsM, holesM, sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, state.dir, state.chidori);
    lens=lens.concat(lay.lens);""",
"""    const lay=wari(ptsM, holesM, sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, dirOf(p), state.chidori);
    lens=lens.concat(lay.lens);""",
'D6 数量集計'))

# F. 3Dの継目
reps.append((
"""      const lay=wari(ptsM, holesM, sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, state.dir, state.chidori);
      const HDIR=state.dir==='h';""",
"""      const lay=wari(ptsM, holesM, sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, dirOf(poly), state.chidori);
      const HDIR=dirOf(poly)==='h';""",
'D7 3Dの継目'))

# G. 読み込み時に poly.dir を正規化＋部位一覧を描いたら方向の一覧も描き直す
reps.append((
"""  (state.polys||[]).forEach(p=>{
    p.lv=+p.lv||0;""",
"""  (state.polys||[]).forEach(p=>{
    p.lv=+p.lv||0;
    if(p.dir!=='h'&&p.dir!=='v'&&p.dir!=='short')delete p.dir;   /* 部位ごとの流し方向 */""",
'D8 読み込み時の正規化'))
reps.append((
"""    </div>`).join('') || '<div class="nosel">まだ部位がありません。「＋新しい部位を描く」か「サンプル形状」からどうぞ。</div>';
}""",
"""    </div>`).join('') || '<div class="nosel">まだ部位がありません。「＋新しい部位を描く」か「サンプル形状」からどうぞ。</div>';
  try{ renderDirRows(); }catch(e){}     /* 部位が増減したら流し方向の一覧も作り直す */
}""",
'D9 部位一覧と連動'))

# H. 操作方法（②割付）の説明を実態に合わせる
reps.append((
"""    <p>「📊 積算・設定」の<b>割付設定</b>で、流し方向（横／縦）・サイドラップ・エンドラップ・千鳥貼りを変えられます。凡例（色の意味）も同じ場所にあります。</p>`;""",
"""    <p>「📊 積算・設定」の<b>割付設定</b>で、流し方向（横／縦／短手に流す）・サイドラップ・エンドラップ・千鳥貼りを変えられます。
    部位が2つ以上あるときは、<b>部位ごとに流し方向を変える</b>こともできます（塔屋だけ短手に流す、など）。凡例（色の意味）も同じ場所にあります。</p>`;""",
'D10 操作方法の説明'))

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1: ok = False
if not ok: sys.exit('中断')
for old, new, name in reps: s = s.replace(old, new)

# ---------- ② 数値の入力欄は数字キーボードに ----------
# type="number" の入力欄すべてに inputmode="decimal" を付ける（既にあるものは触らない）
def add_mode(m):
    tag = m.group(0)
    if 'inputmode' in tag: return tag
    return tag.replace('type="number"', 'type="number" inputmode="decimal"', 1)
s2, n = re.subn(r'<input[^>]*type="number"[^>]*>', add_mode, s)
print(f'②数値欄に inputmode を追加：{n}箇所')
s = s2

# 部位ごとの流し方向のスタイル
STYLE = """
<style id="nn-dirrows">
/* 部位ごとの流し方向（2026-08-06k）。割付設定パネルの中に出る */
#dirRows{margin:2px 0 8px;}
#dirRows .dirttl{font-size:11.5px; font-weight:800; color:var(--ink-sub,#5a6b52); margin:4px 0 4px;}
#dirRows .dirrow{display:flex; align-items:center; gap:7px; margin-bottom:5px;}
#dirRows .dirrow .nm{flex:1; min-width:0; font-size:12px; font-weight:800;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
#dirRows .seg{display:flex; border:1px solid var(--line,#d7ded4); border-radius:7px; overflow:hidden; flex:none;}
#dirRows .seg button{border:0; background:#fff; padding:4px 8px; font-size:11px; font-weight:800;
  color:var(--ink-sub,#5a6b52); cursor:pointer; font-family:inherit;}
#dirRows .seg button.on{background:var(--green-deep,#1c6b3c); color:#fff;}
#dirRows .dirrow .now{flex:none; font-size:11px; font-weight:800; color:var(--green-deep,#1c6b3c); white-space:nowrap;}
</style>
"""
anchor = "\n</body>\n</html>"
assert s.count(anchor) == 1
s = s.replace(anchor, "\n" + STYLE + anchor)
print('OK  スタイル追加')

io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
