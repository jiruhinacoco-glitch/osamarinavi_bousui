# -*- coding: utf-8 -*-
# 図面・積算：④写真取り込みモード
#  現場写真の上で「平場の四隅」を合わせる → 斜め写真を真上から見た形に直す計算（射影変換）
#  → 写真をなぞった線がそのまま平面図になる → 立上りを入れれば3D（アイソメ）で既存図になる
import io, sys

PATH = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []

# ツールバーにボタン（スマホでは「⋯ 道具」へ移す）
reps.append((
"""      <button class="tbtn" id="tl_theme" onclick="nnToggleTheme()" title="画面の明るさを切り替える（直射日光の屋上では「夜」が見やすい）">🌙 夜</button>""",
"""      <button class="tbtn" id="tl_theme" onclick="nnToggleTheme()" title="画面の明るさを切り替える（直射日光の屋上では「夜」が見やすい）">🌙 夜</button>
      <button class="tbtn" id="tl_photo" onclick="nnPhotoOpen()" title="現場写真をなぞって既存の屋上を図面に起こす">📷 写真から起こす</button>""",
'P1 ツールバーのボタン'))
reps.append((
"""  ['tl_hole','tl_split','tl_rect','tl_pan','tl_ang','tl_theme'].forEach(id=>{ const el=document.getElementById(id); if(el)move.push(el); });""",
"""  ['tl_hole','tl_split','tl_rect','tl_pan','tl_ang','tl_theme','tl_photo'].forEach(id=>{ const el=document.getElementById(id); if(el)move.push(el); });""",
'P2 道具メニューへ'))

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1: ok = False
if not ok: sys.exit('中断')
for old, new, name in reps: s = s.replace(old, new)

BLOCK = r"""
<style id="nn-photo">
/* ============================================================
   写真取り込みモード（2026-08-06q）
   斜めから撮った現場写真でも、平場の四隅を合わせれば
   「真上から見た形」に直して図面に起こせる（射影変換）。
   ★写真そのものは保存しない（容量が大きいため）。取り込んだ形だけが図面に残る。
   ============================================================ */
#nnPhoto{position:fixed; inset:0; z-index:9970; display:none; background:#0f1418;}
#nnPhoto.on{display:block;}
#nnPhCv{position:absolute; inset:0; width:100%; height:100%; touch-action:none; display:block;}
#nnPhTop{position:absolute; left:0; right:0; top:0; z-index:3;
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  padding:calc(7px + env(safe-area-inset-top,0px)) 10px 7px;
  background:linear-gradient(180deg,rgba(16,24,30,.96),rgba(16,24,30,.86)); color:#e8f0f4;}
#nnPhTop b{font-size:14px; font-weight:900; white-space:nowrap;}
#nnPhTop .step{font-size:11.5px; font-weight:800; color:#a9c4d2;}
#nnPhTop button{font-family:inherit; font-size:12.5px; font-weight:800; border:0; border-radius:8px;
  padding:6px 12px; background:#1f7a48; color:#fff; cursor:pointer; white-space:nowrap;}
#nnPhTop button.ghost{background:#2a3a46; color:#cfe0e8;}
#nnPhTop button.x{margin-left:auto; background:#7a2f28;}
#nnPhTop button:disabled{opacity:.45;}
#nnPhHelp{position:absolute; left:10px; right:10px; bottom:calc(12px + env(safe-area-inset-bottom,0px)); z-index:3;
  background:rgba(16,24,30,.92); color:#dbe8ef; border-radius:10px; padding:9px 12px;
  font-size:12.5px; font-weight:700; line-height:1.7;}
#nnPhHelp b{color:#8fe0ad;}
#nnPhFile{display:none;}
</style>
<script id="nn-photo-js">
/* 写真取り込みモード。上の <style id="nn-photo"> とセット。 */
(function(){
"use strict";
let img=null;                 /* 読み込んだ写真 */
let step=0;                   /* 0:写真待ち 1:四隅 2:寸法入力済→なぞる 3:閉じた */
let corners=[];               /* 写真座標の四隅（左上→右上→右下→左下） */
let realW=10, realD=8;        /* 四隅で囲んだ長方形の実寸（m） */
let H=null;                   /* 射影変換の行列（写真→平面m） */
let trace=[];                 /* なぞった点（写真座標） */
let view={s:1,x:0,y:0};       /* 表示の拡大と位置 */
let drag=null, pinch=null, movedPt=null;

/* ---- 画面を作る ---- */
const box=document.createElement('div'); box.id='nnPhoto';
box.innerHTML='<canvas id="nnPhCv"></canvas>'
 +'<div id="nnPhTop">'
 +'<b>📷 写真から起こす</b><span class="step" id="nnPhStep"></span>'
 +'<button type="button" id="nnPhPick" class="ghost">写真を選ぶ</button>'
 +'<button type="button" id="nnPhSize" class="ghost" disabled>実寸を入れる</button>'
 +'<button type="button" id="nnPhUndo" class="ghost" disabled>1点戻す</button>'
 +'<button type="button" id="nnPhDone" disabled>図面に取り込む</button>'
 +'<button type="button" id="nnPhClose" class="x">✕ 閉じる</button>'
 +'</div>'
 +'<div id="nnPhHelp"></div>'
 +'<input type="file" accept="image/*" id="nnPhFile">';
document.body.appendChild(box);
const cv=document.getElementById('nnPhCv'), cx=cv.getContext('2d');

/* ---- 射影変換（4点対応から3×3行列を解く） ---- */
function solve8(A,b){                       /* ガウス消去（8元1次） */
  const n=8, M=A.map((r,i)=>r.concat([b[i]]));
  for(let i=0;i<n;i++){
    let p=i; for(let r=i+1;r<n;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r;
    if(Math.abs(M[p][i])<1e-12) return null;
    const t=M[i]; M[i]=M[p]; M[p]=t;
    for(let r=0;r<n;r++){ if(r===i)continue;
      const f=M[r][i]/M[i][i];
      for(let c=i;c<=n;c++) M[r][c]-=f*M[i][c];
    }
  }
  return M.map((r,i)=>M[i][n]/M[i][i]);
}
function homography(src,dst){
  const A=[], b=[];
  for(let i=0;i<4;i++){
    const u=src[i].x, v=src[i].y, X=dst[i].x, Y=dst[i].y;
    A.push([u,v,1,0,0,0,-u*X,-v*X]); b.push(X);
    A.push([0,0,0,u,v,1,-u*Y,-v*Y]); b.push(Y);
  }
  const h=solve8(A,b);
  return h?[h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1]:null;
}
function applyH(M,p){
  const d=M[6]*p.x+M[7]*p.y+M[8];
  if(Math.abs(d)<1e-12)return null;
  return {x:(M[0]*p.x+M[1]*p.y+M[2])/d, y:(M[3]*p.x+M[4]*p.y+M[5])/d};
}
window.nnPhotoH=()=>H;                       /* 検証用 */

/* ---- 表示（画面 ↔ 写真の座標） ---- */
function fit(){
  if(!img)return;
  const W=cv.clientWidth, Hh=cv.clientHeight;
  const s=Math.min((W-24)/img.width,(Hh-150)/img.height);
  view.s=s; view.x=(W-img.width*s)/2; view.y=(Hh-img.height*s)/2+18;
}
const toScr=p=>({x:view.x+p.x*view.s, y:view.y+p.y*view.s});
const toImg=p=>({x:(p.x-view.x)/view.s, y:(p.y-view.y)/view.s});

/* ---- 案内文 ---- */
const HELP=[
 '① <b>「写真を選ぶ」</b>で、屋上全体が1枚に入っている写真を読み込みます。斜めから撮ったものでかまいません。',
 '② 写真の中の<b>平らな面（平場）の四隅</b>を、<b>左上 → 右上 → 右下 → 左下</b>の順にタップします。<br>点は指でドラッグして直せます。段差の上と下をまたがないでください。',
 '③ <b>「実寸を入れる」</b>で、その四角形の<b>実際の幅と奥行き（m）</b>を入れます。',
 '④ 屋根の輪郭を順にタップしてなぞります。<b>始点をもう一度タップすると閉じます。</b><br>斜めの写真でも、真上から見た正しい形に直しています。',
 '⑤ <b>「図面に取り込む」</b >で図面の部位になります。立上りの高さを入れれば <b>③断面</b> や <b>④3D</b> で既存の姿が見られます。'];
function ui(){
  const st=document.getElementById('nnPhStep');
  const n=!img?0:(corners.length<4?1:(!H?2:(trace.length>=3&&closed?4:3)));
  st.textContent=['写真を選んでください','四隅：'+corners.length+'/4','実寸を入れてください',
                  'なぞる：'+trace.length+'点','取り込めます'][n];
  document.getElementById('nnPhHelp').innerHTML=HELP[n];
  document.getElementById('nnPhSize').disabled=(corners.length<4);
  document.getElementById('nnPhUndo').disabled=!(corners.length||trace.length);
  document.getElementById('nnPhDone').disabled=!(H&&closed&&trace.length>=3);
}
let closed=false;

/* ---- 描画 ---- */
function draw(){
  const W=cv.clientWidth, Hh=cv.clientHeight, dpr=Math.min(2,devicePixelRatio||1);
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(Hh*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(Hh*dpr); }
  cx.setTransform(dpr,0,0,dpr,0,0);
  cx.fillStyle='#0f1418'; cx.fillRect(0,0,W,Hh);
  if(img){
    cx.drawImage(img, view.x, view.y, img.width*view.s, img.height*view.s);
  }else{
    cx.fillStyle='#9fb3bd'; cx.font='700 14px sans-serif'; cx.textAlign='center';
    cx.fillText('「写真を選ぶ」から現場写真を読み込んでください', W/2, Hh/2); cx.textAlign='left';
    return;
  }
  /* 四隅 */
  if(corners.length){
    cx.strokeStyle='#ffcf4d'; cx.lineWidth=2; cx.setLineDash([7,4]);
    cx.beginPath();
    corners.forEach((p,i)=>{ const q=toScr(p); i?cx.lineTo(q.x,q.y):cx.moveTo(q.x,q.y); });
    if(corners.length===4)cx.closePath();
    cx.stroke(); cx.setLineDash([]);
    corners.forEach((p,i)=>{
      const q=toScr(p);
      cx.beginPath(); cx.arc(q.x,q.y,9,0,7); cx.fillStyle='rgba(255,207,77,.9)'; cx.fill();
      cx.strokeStyle='#5a4300'; cx.lineWidth=1.5; cx.stroke();
      cx.fillStyle='#3a2c00'; cx.font='900 11px sans-serif'; cx.textAlign='center';
      cx.fillText(String(i+1), q.x, q.y+4); cx.textAlign='left';
    });
  }
  /* なぞった線 */
  if(trace.length){
    cx.strokeStyle='#7fe0a0'; cx.lineWidth=3; cx.lineJoin='round';
    cx.beginPath();
    trace.forEach((p,i)=>{ const q=toScr(p); i?cx.lineTo(q.x,q.y):cx.moveTo(q.x,q.y); });
    if(closed)cx.closePath();
    cx.stroke();
    trace.forEach((p,i)=>{ const q=toScr(p);
      cx.beginPath(); cx.arc(q.x,q.y,5.5,0,7);
      cx.fillStyle=(i===0&&!closed)?'#ffd24d':'#7fe0a0'; cx.fill();
      cx.strokeStyle='#0f2a1a'; cx.lineWidth=1.2; cx.stroke(); });
    /* 実寸の表示（射影変換後の長さ） */
    if(H&&trace.length>=2){
      cx.font='800 12px sans-serif';
      for(let i=0;i+1<trace.length+(closed?1:0);i++){
        const a=trace[i], b=trace[(i+1)%trace.length];
        const A=applyH(H,a), B=applyH(H,b); if(!A||!B)continue;
        const L=Math.hypot(B.x-A.x,B.y-A.y);
        const qa=toScr(a), qb=toScr(b), mx=(qa.x+qb.x)/2, my=(qa.y+qb.y)/2;
        const t=L.toFixed(2)+'m', w=cx.measureText(t).width+9;
        cx.fillStyle='rgba(12,22,28,.86)'; cx.fillRect(mx-w/2,my-9,w,18);
        cx.fillStyle='#bff0d0'; cx.textAlign='center'; cx.fillText(t,mx,my+4); cx.textAlign='left';
      }
    }
  }
}
window.nnPhDraw=draw;

/* ---- 入力 ---- */
function nearIdx(list,p,r){
  for(let i=list.length-1;i>=0;i--){ const q=toScr(list[i]); if(Math.hypot(q.x-p.x,q.y-p.y)<=r) return i; }
  return -1;
}
const pts=new Map();
cv.addEventListener('pointerdown',e=>{
  try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pts.size===2){ const a=[...pts.values()];
    pinch={d:Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y), s:view.s,
           mx:(a[0].x+a[1].x)/2, my:(a[0].y+a[1].y)/2, vx:view.x, vy:view.y};
    drag=null; movedPt=null; return; }
  if(!img)return;
  const r=cv.getBoundingClientRect(), p={x:e.clientX-r.left, y:e.clientY-r.top};
  /* 既に置いた点をつかんだら移動 */
  const ci=nearIdx(corners,p,18);
  if(ci>=0){ movedPt={kind:'c',i:ci}; return; }
  const ti=nearIdx(trace,p,16);
  if(ti>=0&&H){ movedPt={kind:'t',i:ti}; return; }
  drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,moved:false,p};
});
cv.addEventListener('pointermove',e=>{
  if(!pts.has(e.pointerId))return;
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const r=cv.getBoundingClientRect(), p={x:e.clientX-r.left, y:e.clientY-r.top};
  if(pinch&&pts.size>=2){
    const a=[...pts.values()];
    const d=Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y);
    const ns=Math.max(.05,Math.min(12, pinch.s*d/(pinch.d||1)));
    const mx=pinch.mx-r.left, my=pinch.my-r.top;
    view.x=mx-(mx-pinch.vx)*(ns/pinch.s); view.y=my-(my-pinch.vy)*(ns/pinch.s);
    view.s=ns; draw(); return;
  }
  if(movedPt){
    const q=toImg(p);
    if(movedPt.kind==='c'){ corners[movedPt.i]=q; if(corners.length===4&&H)recalcH(); }
    else trace[movedPt.i]=q;
    draw(); return;
  }
  if(drag){
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(Math.hypot(dx,dy)>6)drag.moved=true;
    view.x=drag.vx+dx; view.y=drag.vy+dy; draw();
  }
});
function up(e){
  const had=drag, mv=movedPt;
  pts.delete(e.pointerId);
  if(pts.size<2)pinch=null;
  if(mv){ movedPt=null; ui(); return; }
  drag=null;
  if(!img||!had||had.moved)return;
  const p=had.p;
  if(corners.length<4){ corners.push(toImg(p)); if(corners.length===4)toast('四隅ができました。「実寸を入れる」を押してください'); draw(); ui(); return; }
  if(!H){ toast('先に「実寸を入れる」を押してください'); return; }
  if(closed)return;
  const q=toImg(p);
  if(trace.length>=3){
    const f=toScr(trace[0]);
    if(Math.hypot(f.x-p.x,f.y-p.y)<22){ closed=true; toast('形が閉じました。「図面に取り込む」で図面になります'); draw(); ui(); return; }
  }
  trace.push(q); draw(); ui();
}
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,up));

/* ---- ボタン ---- */
document.getElementById('nnPhPick').addEventListener('click',()=>document.getElementById('nnPhFile').click());
document.getElementById('nnPhFile').addEventListener('change',function(){
  const f=this.files&&this.files[0]; this.value='';
  if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{ const im=new Image(); im.onload=()=>{ img=im; corners=[]; trace=[]; H=null; closed=false; fit(); draw(); ui(); }; im.src=rd.result; };
  rd.readAsDataURL(f);
});
function recalcH(){
  H=homography(corners,[{x:0,y:0},{x:realW,y:0},{x:realW,y:realD},{x:0,y:realD}]);
}
document.getElementById('nnPhSize').addEventListener('click',()=>{
  if(corners.length<4)return;
  nnNumAsk('四隅で囲んだ範囲の【幅】（m）', String(realW), function(v){
    if(v===null)return;
    const w=parseFloat(String(v).replace(/[^0-9.]/g,'')); if(!isFinite(w)||w<=0){toast('数値を入れてください');return;}
    realW=w;
    nnNumAsk('同じ範囲の【奥行き】（m）', String(realD), function(v2){
      if(v2===null)return;
      const d=parseFloat(String(v2).replace(/[^0-9.]/g,'')); if(!isFinite(d)||d<=0){toast('数値を入れてください');return;}
      realD=d; recalcH();
      toast(H?('実寸を設定しました（'+realW+'m × '+realD+'m）。輪郭をなぞってください'):'四隅の順番を見直してください');
      draw(); ui();
    });
  });
});
document.getElementById('nnPhUndo').addEventListener('click',()=>{
  if(closed){ closed=false; }
  else if(trace.length) trace.pop();
  else if(corners.length){ corners.pop(); H=null; }
  draw(); ui();
});
document.getElementById('nnPhClose').addEventListener('click',()=>{ box.classList.remove('on'); });
document.getElementById('nnPhDone').addEventListener('click',()=>{
  if(!(H&&closed&&trace.length>=3))return;
  const s=state.scaleM;
  const pts2=trace.map(p=>{ const m=applyH(H,p); return m?{x:+(m.x/s).toFixed(2), y:+(m.y/s).toFixed(2)}:null; }).filter(Boolean);
  if(pts2.length<3){ toast('うまく変換できませんでした。四隅を置き直してください'); return; }
  /* 図面のあいている場所へ寄せる（既にある部位と重ならないように右へ） */
  let mx=-1e9; state.polys.forEach(p=>p.pts.forEach(q=>{ mx=Math.max(mx,q.x); }));
  const off=(mx>-1e8)?(mx+3):0;
  let mnx=1e9,mny=1e9; pts2.forEach(q=>{mnx=Math.min(mnx,q.x);mny=Math.min(mny,q.y);});
  const moved=pts2.map(q=>({x:+(q.x-mnx+off).toFixed(2), y:+(q.y-mny+2).toFixed(2)}));
  const defH=+document.getElementById('defH').value||300, defW=+document.getElementById('defW').value||250;
  state.polys.push({name:'写真から起こした屋根'+(state.polys.length+1), lv:0, pts:moved,
    edges:moved.map(()=>({h:defH,w:defW,k:defH>0?'para':'free'})), holes:[]});
  state.active=state.polys.length-1;
  saveState(); renderPolyList(); setTab('zu'); window.draw&&window.draw();
  box.classList.remove('on');
  toast('図面に取り込みました。立上りの高さを直すと 3D で既存の姿が見られます');
});
addEventListener('resize',()=>{ if(box.classList.contains('on')){ draw(); } });

window.nnPhotoOpen=function(){
  box.classList.add('on');
  if(img)fit();
  draw(); ui();
};
window.nnPhotoState=()=>({hasImg:!!img, corners:corners.length, H:!!H, trace:trace.length, closed});
window.nnPhotoTestLoad=function(w,h){          /* 検証用：写真の代わりに白い絵を入れる */
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const g=c.getContext('2d'); g.fillStyle='#888'; g.fillRect(0,0,w,h);
  const im=new Image(); im.onload=()=>{ img=im; corners=[]; trace=[]; H=null; closed=false; fit(); draw(); ui(); };
  im.src=c.toDataURL();
};
window.nnPhotoTestTap=function(ix,iy){          /* 検証用：写真座標で1点置く */
  if(corners.length<4){ corners.push({x:ix,y:iy}); if(corners.length===4){} }
  else if(H){ if(trace.length>=3&&Math.hypot(trace[0].x-ix,trace[0].y-iy)<6){ closed=true; } else trace.push({x:ix,y:iy}); }
  draw(); ui();
};
window.nnPhotoTestSize=function(w,d){ realW=w; realD=d; recalcH(); draw(); ui(); return !!H; };
window.nnPhotoTestDone=function(){ document.getElementById('nnPhDone').click(); };
ui();
})();
</script>
"""
anchor = "\n</body>\n</html>"
assert s.count(anchor) == 1
s = s.replace(anchor, "\n" + BLOCK + anchor)
print('OK  写真取り込みモードの本体')

io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
