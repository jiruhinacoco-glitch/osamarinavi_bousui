# -*- coding: utf-8 -*-
# 図面・積算：札タップの数値入力を prompt() → 自前の数字キーパッド窓に置き換える
import io, sys

PATH = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []

# R1: nnLabelEdit を丸ごと置き換え（prompt 2か所 → nnNumAsk のコールバック式）
OLD_FN = """function nnLabelEdit(b){
  if(b.kind==='dim'){
    const i=b.i;
    const cur=edgeLenM(drawPts[i-1],drawPts[i],state.scaleM);
    const v=prompt('この辺の長さ（m）を入力', f1(cur));
    if(v===null)return true;
    const L=parseFloat(String(v).replace(/[^0-9.]/g,''));
    if(!isFinite(L)||L<=0){ toast('数値を入れてください'); return true; }
    const a=drawPts[i-1], p=drawPts[i];
    const dx=p.x-a.x, dy=p.y-a.y, len=Math.hypot(dx,dy)||1;
    const k=(L/state.scaleM)/len;
    const ddx=(a.x+dx*k)-p.x, ddy=(a.y+dy*k)-p.y;
    for(let j=i;j<drawPts.length;j++){ drawPts[j].x+=ddx; drawPts[j].y+=ddy; }
    toast('長さを '+f1(L)+'m にしました');
  }else{
    const i=b.i;
    const A=drawPts[i-1], V=drawPts[i], B=drawPts[i+1];
    const a1=Math.atan2(A.y-V.y, A.x-V.x), a2=Math.atan2(B.y-V.y, B.x-V.x);
    let d=a2-a1; while(d<=-Math.PI)d+=2*Math.PI; while(d>Math.PI)d-=2*Math.PI;
    const cur=Math.abs(d)*180/Math.PI;
    const v=prompt('この角の角度（度）を入力', String(Math.round(cur)));
    if(v===null)return true;
    let deg=parseFloat(String(v).replace(/[^0-9.]/g,''));
    if(!isFinite(deg)){ toast('数値を入れてください'); return true; }
    deg=Math.max(1, Math.min(179, deg));
    const rot=(d<0?-1:1)*deg*Math.PI/180 - d;
    const c=Math.cos(rot), sn=Math.sin(rot);
    for(let j=i+1;j<drawPts.length;j++){
      const px=drawPts[j].x-V.x, py=drawPts[j].y-V.y;
      drawPts[j]={x:V.x+px*c-py*sn, y:V.y+px*sn+py*c};
    }
    toast('角度を '+Math.round(deg)+'° にしました');
  }
  drawRedo=[]; histBtns(); draw();
  return true;
}"""

NEW_FN = """function nnLabelEdit(b){
  /* ★prompt() はiPhoneが日本語キーボードを出してしまうため、自前の入力窓
     nnNumAsk（数字専用キーパッド）に置き換えた（2026-08-06g）。
     窓は後から答えが返る作りなので、続きはコールバックの中で行う。 */
  if(b.kind==='dim'){
    const i=b.i;
    const cur=edgeLenM(drawPts[i-1],drawPts[i],state.scaleM);
    nnNumAsk('この辺の長さ（m）を入力', f1(cur), function(v){
      if(v===null)return;
      const L=parseFloat(String(v).replace(/[^0-9.]/g,''));
      if(!isFinite(L)||L<=0){ toast('数値を入れてください'); return; }
      const a=drawPts[i-1], p=drawPts[i];
      const dx=p.x-a.x, dy=p.y-a.y, len=Math.hypot(dx,dy)||1;
      const k=(L/state.scaleM)/len;
      const ddx=(a.x+dx*k)-p.x, ddy=(a.y+dy*k)-p.y;
      for(let j=i;j<drawPts.length;j++){ drawPts[j].x+=ddx; drawPts[j].y+=ddy; }
      toast('長さを '+f1(L)+'m にしました');
      drawRedo=[]; histBtns(); draw();
    });
  }else{
    const i=b.i;
    const A=drawPts[i-1], V=drawPts[i], B=drawPts[i+1];
    const a1=Math.atan2(A.y-V.y, A.x-V.x), a2=Math.atan2(B.y-V.y, B.x-V.x);
    let d=a2-a1; while(d<=-Math.PI)d+=2*Math.PI; while(d>Math.PI)d-=2*Math.PI;
    const cur=Math.abs(d)*180/Math.PI;
    nnNumAsk('この角の角度（度）を入力', String(Math.round(cur)), function(v){
      if(v===null)return;
      let deg=parseFloat(String(v).replace(/[^0-9.]/g,''));
      if(!isFinite(deg)){ toast('数値を入れてください'); return; }
      deg=Math.max(1, Math.min(179, deg));
      const rot=(d<0?-1:1)*deg*Math.PI/180 - d;
      const c=Math.cos(rot), sn=Math.sin(rot);
      for(let j=i+1;j<drawPts.length;j++){
        const px=drawPts[j].x-V.x, py=drawPts[j].y-V.y;
        drawPts[j]={x:V.x+px*c-py*sn, y:V.y+px*sn+py*c};
      }
      toast('角度を '+Math.round(deg)+'° にしました');
      drawRedo=[]; histBtns(); draw();
    });
  }
  return true;
}"""
reps.append((OLD_FN, NEW_FN, 'R1 nnLabelEdit'))

# R2: 末尾に入力窓の本体
BLOCK = """
<style id="nn-numpad">
/* ============================================================
   数値入力の小窓（2026-08-06g）
   寸法・角度の札をタップしたときの入力。prompt() だとiPhoneが
   日本語キーボード（あいう）を出すため、自前の窓に置き換えて
   inputmode="decimal"＝数字専用キーパッドを指定する。
   ★文字の大きさは16px（16px未満だとiPhoneがタップ時に画面を拡大する）
   ★窓は上寄せ（top:12%）＝下から出るキーボードに隠れない位置
   ============================================================ */
#nnNumDlg{position:fixed; inset:0; z-index:9980; display:none; background:rgba(30,40,30,.35);}
#nnNumDlg.open{display:block;}
#nnNumDlg .card{position:absolute; left:50%; top:12%; transform:translateX(-50%);
  width:min(86vw,320px); background:#fff; border:1.5px solid var(--green-deep,#1c6b3c);
  border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.3); padding:12px 14px;}
#nnNumDlg .t{font-size:14px; font-weight:800; color:var(--green-deep,#1c6b3c); margin-bottom:8px;}
#nnNumDlg input{width:100%; font-size:16px; padding:10px 12px; border:1.5px solid #b8c4b2;
  border-radius:8px; text-align:right; font-weight:700; font-family:inherit;
  -webkit-user-select:text; user-select:text;}
#nnNumDlg .btns{display:flex; gap:8px; justify-content:flex-end; margin-top:10px;}
#nnNumDlg .btns button{font-family:inherit; font-size:14px; font-weight:800; border-radius:8px; padding:8px 16px; border:0;}
#nnNumDlg .ng{background:#eee; color:#444;}
#nnNumDlg .okb{background:var(--green-deep,#1c6b3c); color:#fff;}
</style>
<script id="nn-numpad-js">
/* nnNumAsk(見出し, 最初の値, 答えを受け取る関数)。
   OK＝入力文字列を渡す／キャンセル・背景タップ＝null を渡す。 */
(function(){
"use strict";
let cb=null, w=null, inp=null;
function build(){
  if(w)return;
  w=document.createElement('div'); w.id='nnNumDlg';
  w.innerHTML='<div class="card"><div class="t"></div>'
    +'<input type="text" inputmode="decimal" pattern="[0-9.]*" autocomplete="off" enterkeyhint="done">'
    +'<div class="btns"><button type="button" class="ng">キャンセル</button><button type="button" class="okb">OK</button></div></div>';
  document.body.appendChild(w);
  inp=w.querySelector('input');
  w.addEventListener('pointerdown',function(e){ if(e.target===w)fin(null); });
  w.querySelector('.ng').addEventListener('click',function(){ fin(null); });
  w.querySelector('.okb').addEventListener('click',function(){ fin(inp.value); });
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); fin(inp.value); } });
}
function fin(v){
  if(!w)return;
  w.classList.remove('open');
  try{ inp.blur(); }catch(_){}
  const f=cb; cb=null;
  if(f)f(v);
}
window.nnNumAsk=function(title, initial, fn){
  build();
  cb=fn;
  w.querySelector('.t').textContent=title;
  inp.value=(initial==null)?'':String(initial);
  w.classList.add('open');
  /* タップの流れの中で focus すれば、その場でキーパッドが開く */
  try{ inp.focus({preventScroll:true}); inp.select(); }catch(_){}
};
})();
</script>
"""
reps.append(("\\n</body>\\n</html>".replace('\\\\n','\\n'), None, ''))  # placeholder, replaced below
reps[-1] = ("\n</body>\n</html>", "\n" + BLOCK + "\n</body>\n</html>", 'R2 末尾ブロック')

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1:
        ok = False
if not ok:
    sys.exit('中断')
for old, new, name in reps:
    s = s.replace(old, new)
io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
