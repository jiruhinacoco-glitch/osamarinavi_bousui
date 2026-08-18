# -*- coding: utf-8 -*-
"""図面・積算 4件（2026-08-08d）
 ① 3D：エンドラップ（短手）の継目線が、上に載る次のシートの下まで伸びていた
 ② 3Dの右のボタン列が右下の▲と重なる
 ③ 割付：1枚あたりの寸法は既定で出さない＋表示/非表示ボタン
 ④ 頂点の移動を 1マス単位 → 0.1m単位に
置換が各1件ずつ成功したときだけ書き込む。"""
import io, sys

P = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(P, encoding='utf-8', newline='').read().replace('\r\n', '\n')
rep = []

def sub(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        rep.append('★NG %s：%d件' % (tag, n)); return
    s = s.replace(old, new); rep.append('○ ' + tag)

# ---------------------------------------------------------------- ①
sub(
"""        /* エンドラップ（シート切断）位置の継目線
           ★2026-08-06s 以前は「帯の幅ぶんの棒」を屋根の形と無関係に置いていたため、
             凸凹した屋根では継目線が屋根の外へはみ出していた。
             その位置で屋根の中に入っている区間を求め、帯の範囲と重なる分だけ描く。 */
        b.segs.forEach(sg=>{
          sg.pieces.forEach((p,pi)=>{
            if(pi===0)return;
            const cross=scanSegsH(ptsM.map(T3), holesM.map(hh=>hh.map(T3)), p.s+1e-5);
            cross.forEach(cs=>{
              const lo=Math.max(cs[0], b.lo), hi=Math.min(cs[1], b.hi);""",
"""        /* エンドラップ（シート切断）位置の継目線
           ★2026-08-06s 以前は「帯の幅ぶんの棒」を屋根の形と無関係に置いていたため、
             凸凹した屋根では継目線が屋根の外へはみ出していた。
             その位置で屋根の中に入っている区間を求め、帯の範囲と重なる分だけ描く。
           ★2026-08-08d さらに「次の帯に隠れる分」を描かないようにした。
             シートは幅ぜんぶ（b.lo〜b.hi）あるが、次のシートが b.lo+eff から上に載るので、
             そこから先の切断線は本来は見えない。2Dは後の帯で塗りつぶされるので隠れるが、
             3Dは全部同じ高さに置いていたため、短手の継目線だけ 100mm（サイドラップぶん）
             はみ出して見えていた。次の帯の lo で頭を止める。 */
        const bNext=lay.bands[bi+1];
        const visHi=bNext?Math.min(b.hi, bNext.lo):b.hi;
        b.segs.forEach(sg=>{
          sg.pieces.forEach((p,pi)=>{
            if(pi===0)return;
            const cross=scanSegsH(ptsM.map(T3), holesM.map(hh=>hh.map(T3)), p.s+1e-5);
            cross.forEach(cs=>{
              const lo=Math.max(cs[0], b.lo), hi=Math.min(cs[1], visHi);""",
'①3D 短手の継目線を次の帯の手前で止める')

# ---------------------------------------------------------------- ②
sub(
"""#d3pad{position:absolute; right:8px; top:52px; bottom:58px; z-index:7;
  display:flex; flex-direction:column; justify-content:flex-start; align-items:flex-end; gap:5px;
  overflow-y:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none;}""",
"""#d3pad{position:absolute; right:8px; top:52px; z-index:7;
  bottom:calc(58px + env(safe-area-inset-bottom,0px));
  display:flex; flex-direction:column; justify-content:flex-start; align-items:flex-end; gap:5px;
  overflow-y:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none;}
/* ★2026-08-08d よこ画面（高さ393pt）は1列8個＝355pxが入りきらず、
   下の2〜3個が右下の▲（ナビを出すボタン）と重なっていた。
   画面が低いときは2列にする＝4段（175px）で必ず収まる。 */
@media (max-height:560px){
  #d3pad{display:grid; grid-template-columns:repeat(2,46px); gap:5px;
         justify-content:end; align-content:start; overflow:visible;
         bottom:auto; max-height:calc(100% - 110px);}
  #d3pad button{width:46px; height:38px;}
}""",
'②3Dのボタン列を2列に（▲と重ならない）')

# ---------------------------------------------------------------- ③（本体：ラベル）
sub(
"""        if(plenPx>=52 && bandPx>=13){
          const label=`${circled(n)} ${f1(pc.e-pc.s)}m`;""",
"""        if(plenPx>=(nnWfDimOn()?52:26) && bandPx>=13){
          /* ★2026-08-08d 1枚あたりの寸法は既定で出さない（番号だけ）。
             ツールバーの「📏 寸法」で出し入れできる。 */
          const label=nnWfDimOn()?`${circled(n)} ${f1(pc.e-pc.s)}m`:`${circled(n)}`;""",
'③割付ラベルを番号だけに（寸法は切替）')

# ---------------------------------------------------------------- ③（トグルの実体）
sub(
"""window.nnToggleGrid=function(){ nnSetGrid(!nnGrid); };
try{ if(localStorage.getItem('nn_zumen_grid')==='0')nnGrid=false; }catch(_){}""",
"""window.nnToggleGrid=function(){ nnSetGrid(!nnGrid); };
try{ if(localStorage.getItem('nn_zumen_grid')==='0')nnGrid=false; }catch(_){}
/* ★割付タブ：1枚あたりの寸法（8.0m など）を出す・出さない（2026-08-08d）
   既定は「出さない」。番号（①②…）だけになるので図が読みやすい。 */
let nnWfDim=false;
window.nnWfDimOn=()=>nnWfDim;
window.nnSetWfDim=function(on){
  nnWfDim=!!on;
  try{ localStorage.setItem('nn_zumen_wfdim', nnWfDim?'1':'0'); }catch(_){}
  const b=document.getElementById('tl_wfdim');
  if(b){ b.classList.toggle('on',nnWfDim); b.textContent=nnWfDim?'📏 寸法あり':'📏 寸法なし'; }
  try{ draw(); }catch(_){}
  try{ wfLegend(); }catch(_){}
};
window.nnToggleWfDim=function(){ nnSetWfDim(!nnWfDim); };
try{ if(localStorage.getItem('nn_zumen_wfdim')==='1')nnWfDim=true; }catch(_){}""",
'③寸法トグルの本体')

# ---------------------------------------------------------------- ③（ボタン）
sub(
"""      <button class="tbtn" id="tl_ang" onclick="toggleAngles()">∠ 角度</button>""",
"""      <button class="tbtn" id="tl_ang" onclick="toggleAngles()">∠ 角度</button>
      <button class="tbtn" id="tl_wfdim" style="display:none" onclick="nnToggleWfDim()" title="割付図で、シート1枚ごとの長さを出す・出さない">📏 寸法なし</button>""",
'③寸法ボタンを追加')

# ---------------------------------------------------------------- ③（タブでの出しわけ）
sub(
"""  document.getElementById('wfpanel').style.display = t==='wf'?'block':'none';""",
"""  document.getElementById('wfpanel').style.display = t==='wf'?'block':'none';
  { const wd=document.getElementById('tl_wfdim'); if(wd)wd.style.display = t==='wf'?'':'none'; }""",
'③割付タブのときだけボタンを出す')

# ---------------------------------------------------------------- ③（凡例の文言）
sub(
"""    ①②…＝シートの施工順／数字＝<b>1枚の切り出し長さ</b><br>""",
"""    ①②…＝シートの施工順${nnWfDimOn()?'／数字＝<b>1枚の切り出し長さ</b>':'（1枚の長さは「📏 寸法」で出せます）'}<br>""",
'③凡例の文言を状態に合わせる')

# ---------------------------------------------------------------- ④
OLD_MOVE = """    const dx=snapG(mouse.rawx-rdrag.sx), dy=snapG(mouse.rawy-rdrag.sy);"""
if s.count(OLD_MOVE) != 2:
    rep.append('★NG ④頂点移動：%d件（2件のはず）' % s.count(OLD_MOVE))
else:
    s = s.replace(OLD_MOVE,
"""    const dx=nnSnapMove(mouse.rawx-rdrag.sx), dy=nnSnapMove(mouse.rawy-rdrag.sy);""")
    rep.append('○ ④頂点の移動を0.1m単位に（2か所）')

sub(
"""const NN_ANG_STEP=5;                 /* 角度のきざみ（度） */""",
"""const NN_ANG_STEP=5;                 /* 角度のきざみ（度） */
/* ★2026-08-08d 頂点の位置を直すときは 1マス単位では粗すぎる（1マス＝1mだと1m単位）。
   細かい作業なので 0.1m 単位（1マス0.25m以下なら0.05m単位）にする。 */
function nnSnapMove(v){
  const st=Math.max(1e-6, nnLenStepM()/(state.scaleM||1));
  return Math.round(v/st)*st;
}""",
'④0.1m単位の丸め関数を追加')

print('\n'.join(rep))
if any(r.startswith('★') for r in rep):
    print('→ 失敗があるので書き込みません'); sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('→ 書き込みました')
