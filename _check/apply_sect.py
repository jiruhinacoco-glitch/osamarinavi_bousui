# -*- coding: utf-8 -*-
# 図面・積算：③断面図モード（タブ「④断面」）を追加
#  ・切断線（横に切る／縦に切る＋位置）に沿った「屋上の全体断面」を画面に描く
#  ・図面タブには切断線（一点鎖線＋A-A'）を出して、2枚が対応するようにする
import io, sys

PATH = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []

# ---------- 1) タブを追加 ----------
reps.append((
"""    <button id="ht_wf" onclick="setTab('wf')">② 割付</button>
    <button id="ht_d3" onclick="setTab('d3')">③ 3D</button>""",
"""    <button id="ht_wf" onclick="setTab('wf')">② 割付</button>
    <button id="ht_sec" onclick="setTab('sec')">③ 断面</button>
    <button id="ht_d3" onclick="setTab('d3')">④ 3D</button>""",
'S1 帯のタブ'))
reps.append((
"""  <button id="vt_wf" onclick="setTab('wf')">② 割り付け図表示</button>
  <button id="vt_d3" onclick="setTab('d3')">③ 3Dビュー</button>""",
"""  <button id="vt_wf" onclick="setTab('wf')">② 割り付け図表示</button>
  <button id="vt_sec" onclick="setTab('sec')">③ 断面図</button>
  <button id="vt_d3" onclick="setTab('d3')">④ 3Dビュー</button>""",
'S2 旧タブ（非表示だが同期のため）'))

# ---------- 2) setTab を断面に対応 ----------
reps.append((
"""function setTab(t){
  tab=t;
  ['zu','wf','d3'].forEach(k=>{
    document.getElementById('vt_'+k).classList.toggle('on',k===t);
    const h=document.getElementById('ht_'+k); if(h)h.classList.toggle('on',k===t);
  });
  document.getElementById('three-wrap').classList.toggle('on',t==='d3');
  document.getElementById('toolbar').style.display = t==='d3'?'none':'flex';
  document.getElementById('wfpanel').style.display = t==='wf'?'block':'none';
  wfLegend();
  if(t==='d3'&&dirty3d)build3D();
  if(t==='wf'&&(tool==='draw'||tool==='rect'))setTool('sel');
  updateHint(); draw();
}""",
"""function setTab(t){
  tab=t;
  ['zu','wf','sec','d3'].forEach(k=>{
    const v=document.getElementById('vt_'+k); if(v)v.classList.toggle('on',k===t);
    const h=document.getElementById('ht_'+k); if(h)h.classList.toggle('on',k===t);
  });
  document.getElementById('three-wrap').classList.toggle('on',t==='d3');
  document.getElementById('toolbar').style.display = (t==='d3'||t==='sec')?'none':'flex';
  document.getElementById('wfpanel').style.display = t==='wf'?'block':'none';
  const sw=document.getElementById('secwrap'); if(sw)sw.classList.toggle('on',t==='sec');
  wfLegend();
  if(t==='d3'&&dirty3d)build3D();
  if(t==='sec'&&window.nnSecDraw)nnSecDraw();
  if(t==='wf'&&(tool==='draw'||tool==='rect'))setTool('sel');
  updateHint(); draw();
}""",
'S3 setTab'))

# ---------- 3) 図面タブに切断線を描く（draw の最後・部位を描いたあと） ----------
reps.append((
"""  /* 1mスケール表示 */
  ctx.fillStyle=_T.scale; ctx.font='700 11px sans-serif';""",
"""  /* ★断面の切断線（図面タブのとき。断面図と2枚で対応させるため） */
  if(tab==='zu'&&window.nnSecLine)nnSecLine(ctx,W,H,_T);
  /* 1mスケール表示 */
  ctx.fillStyle=_T.scale; ctx.font='700 11px sans-serif';""",
'S4 図面に切断線'))

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1: ok = False
if not ok: sys.exit('中断')
for old, new, name in reps: s = s.replace(old, new)

# ---------- 4) 断面図モードの本体 ----------
BLOCK = r"""
<style id="nn-sect">
/* ============================================================
   断面図モード（2026-08-06n）
   屋上を切ったところを画面で見る。切る向き（横／縦）と位置を変えられる。
   段差（部位ごとのGL+）・パラペットの立上りと天端・防水層を反映する。
   ============================================================ */
#secwrap{position:absolute; inset:0; display:none; background:#fbfcf9;}
#secwrap.on{display:block;}
html[data-nntheme="dark"] #secwrap{background:#0d161d;}
#secCv{display:block; width:100%; height:100%; touch-action:none;}
#secBar{position:absolute; left:0; right:0; top:0; z-index:6;
  display:flex; align-items:center; gap:9px; flex-wrap:wrap;
  padding:7px 10px; background:rgba(255,255,255,.92); border-bottom:1px solid var(--line);
  backdrop-filter:blur(3px);}
html[data-nntheme="dark"] #secBar{background:rgba(16,26,34,.92);}
#secBar .lb{font-size:12px; font-weight:800; color:var(--ink-sub); white-space:nowrap;}
#secBar .seg{display:flex; border:1px solid var(--line); border-radius:7px; overflow:hidden; flex:none;}
#secBar .seg button{border:0; background:#fff; padding:5px 11px; font-size:12px; font-weight:800;
  color:var(--ink-sub); cursor:pointer; font-family:inherit;}
#secBar .seg button.on{background:var(--green-deep); color:#fff;}
html[data-nntheme="dark"] #secBar .seg button{background:#1d2b36; color:#d3e2ea;}
html[data-nntheme="dark"] #secBar .seg button.on{background:#1f7a48; color:#fff;}
#secBar input[type=range]{flex:1; min-width:110px; accent-color:var(--green-deep);}
#secBar .pos{font-size:12px; font-weight:800; color:var(--green-deep); white-space:nowrap; min-width:42px; text-align:right;}
#secNote{position:absolute; left:10px; bottom:10px; z-index:6; font-size:11px; font-weight:700;
  color:var(--ink-sub); background:rgba(255,255,255,.86); border-radius:6px; padding:3px 8px;}
html[data-nntheme="dark"] #secNote{background:rgba(16,26,34,.86); color:#9db2be;}
</style>
<script id="nn-sect-js">
/* 断面図モード。上の <style id="nn-sect"> とセット。 */
(function(){
"use strict";
if(!state.sec)state.sec={dir:'h', pos:0.5};

/* --- 画面の部品を作る --- */
const wrap=document.getElementById('canvaswrap');
const box=document.createElement('div'); box.id='secwrap';
box.innerHTML='<canvas id="secCv"></canvas>'
  +'<div id="secBar">'
  +'<span class="lb">切る向き</span>'
  +'<span class="seg"><button id="sec_h" type="button">横に切る（A-A\')</button>'
  +'<button id="sec_v" type="button">縦に切る（B-B\')</button></span>'
  +'<span class="lb">位置</span><input id="sec_pos" type="range" min="2" max="98" step="1">'
  +'<span class="pos" id="sec_posv">50%</span>'
  +'</div>'
  +'<div id="secNote">屋根をかくと、その断面が出ます（段差・立上り・天端・防水層を反映）</div>';
wrap.appendChild(box);
const cvS=document.getElementById('secCv');
const cS=cvS.getContext('2d');

function ui(){
  document.getElementById('sec_h').classList.toggle('on', state.sec.dir==='h');
  document.getElementById('sec_v').classList.toggle('on', state.sec.dir==='v');
  const r=document.getElementById('sec_pos');
  r.value=Math.round(state.sec.pos*100);
  document.getElementById('sec_posv').textContent=Math.round(state.sec.pos*100)+'%';
}
document.getElementById('sec_h').addEventListener('click',()=>{ state.sec.dir='h'; saveState(); ui(); nnSecDraw(); draw(); });
document.getElementById('sec_v').addEventListener('click',()=>{ state.sec.dir='v'; saveState(); ui(); nnSecDraw(); draw(); });
document.getElementById('sec_pos').addEventListener('input',function(){
  state.sec.pos=(+this.value)/100;
  document.getElementById('sec_posv').textContent=this.value+'%';
  nnSecDraw(); draw();
});
document.getElementById('sec_pos').addEventListener('change',()=>saveState());

/* --- 図面全体の外接（マス単位） --- */
function bbox(){
  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  state.polys.forEach(p=>p.pts.forEach(q=>{
    mnx=Math.min(mnx,q.x); mxx=Math.max(mxx,q.x); mny=Math.min(mny,q.y); mxy=Math.max(mxy,q.y); }));
  if(mxx<mnx)return null;
  return {mnx,mxx,mny,mxy};
}
/* --- 切断線と屋根の交わりを求める（穴も考慮）。
       ★頂点にぴたり重なると計算が乱れるので、切る位置をわずかにずらす --- */
function cut(){
  const bb=bbox(); if(!bb)return null;
  const H=(state.sec.dir==='h');
  const lo=H?bb.mny:bb.mnx, hi=H?bb.mxy:bb.mxx;
  const c=lo+(hi-lo)*state.sec.pos + 0.0007;
  const segs=[];
  state.polys.forEach((poly,pi)=>{
    const xs=[];
    ringsOf(poly).forEach(ring=>{
      const pts=ring.pts, eds=ring.edges||[];
      for(let i=0;i<pts.length;i++){
        const a=pts[i], b=pts[(i+1)%pts.length];
        const a1=H?a.y:a.x, b1=H?b.y:b.x;
        const a2=H?a.x:a.y, b2=H?b.x:b.y;
        if((a1-c)*(b1-c)<0){
          const t=(c-a1)/(b1-a1);
          xs.push({v:a2+(b2-a2)*t, e:ek(eds[i]||{})});
        }
      }
    });
    xs.sort((p,q)=>p.v-q.v);
    for(let i=0;i+1<xs.length;i+=2) segs.push({poly, pi, a:xs[i], b:xs[i+1], lv:+poly.lv||0});
  });
  segs.sort((p,q)=>p.a.v-q.a.v);
  return {segs, c, H, bb};
}
window.nnSecCut=cut;

/* --- 図面タブに切断線を描く（一点鎖線＋矢印＋記号） --- */
window.nnSecLine=function(ctx,W,Hpx,T){
  const k=cut(); if(!k)return;
  const H=k.H;
  const col=T&&T.dim?'#c0392b':'#c0392b';
  ctx.save();
  ctx.strokeStyle=col; ctx.lineWidth=1.4; ctx.setLineDash([13,4,3,4]);
  ctx.beginPath();
  if(H){ const y=gy2px(k.c); ctx.moveTo(0,y); ctx.lineTo(W,y); }
  else { const x=gx2px(k.c); ctx.moveTo(x,0); ctx.lineTo(x,Hpx); }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle=col; ctx.font='800 12px sans-serif';
  if(H){ const y=gy2px(k.c); ctx.fillText("A", 6, y-6); ctx.fillText("A'", W-20, y-6); }
  else { const x=gx2px(k.c); ctx.fillText("B", x+6, 14); ctx.fillText("B'", x+6, Hpx-6); }
  ctx.restore();
};

/* --- 断面図を描く --- */
window.nnSecDraw=function(){
  const wrapEl=document.getElementById('secwrap');
  if(!wrapEl||!wrapEl.classList.contains('on'))return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const W=wrapEl.clientWidth, Hh=wrapEl.clientHeight;
  if(cvS.width!==Math.round(W*dpr)||cvS.height!==Math.round(Hh*dpr)){
    cvS.width=Math.round(W*dpr); cvS.height=Math.round(Hh*dpr);
  }
  cS.setTransform(dpr,0,0,dpr,0,0);
  const T=(typeof nnTH==='function')?nnTH():{paper:'#fbfcf9',g1:'#dcecf7',g2:'#a6cee4',scale:'#8a978c',labBg:'rgba(255,255,255,.94)',dim:'#14449c'};
  cS.clearRect(0,0,W,Hh);
  cS.fillStyle=T.paper; cS.fillRect(0,0,W,Hh);

  const note=document.getElementById('secNote');
  const k=cut();
  if(!k||!k.segs.length){
    note.textContent = state.polys.length
      ? 'この位置には屋根がありません。スライダーで切る位置を変えてください。'
      : '屋根をかくと、その断面が出ます（段差・立上り・天端・防水層を反映）';
    return;
  }
  note.textContent = (k.H?"A-A' 横に切った断面":"B-B' 縦に切った断面")
    + '　／　寸法の単位＝m　／　立上りは辺ごとの設定（H・W）を反映';

  const s=state.scaleM, sp=spec();
  /* 断面に入る範囲（m） */
  let x0=1e9, x1=-1e9, yTop=0;
  k.segs.forEach(g=>{
    x0=Math.min(x0,g.a.v*s); x1=Math.max(x1,g.b.v*s);
    const hh=Math.max(g.a.e.h,g.b.e.h)/1000;
    yTop=Math.max(yTop, g.lv+hh+ (g.a.e.k==='kabe'||g.b.e.k==='kabe' ? 2.6 : 0.25));
  });
  const spanX=Math.max(1e-6, x1-x0), spanY=Math.max(1.2, yTop);
  const padL=54, padR=26, padT=64, padB=52;
  const kx=(W-padL-padR)/spanX, ky=(Hh-padT-padB)/spanY;
  const K=Math.min(kx,ky);                       /* たてよこ同じ縮尺（図面として正しい） */
  const ox=padL+((W-padL-padR)-spanX*K)/2, oy=Hh-padB;
  const X=m=>ox+(m-x0)*K, Y=m=>oy-m*K;

  /* 地面（GL） */
  cS.strokeStyle=T.g2; cS.lineWidth=1;
  cS.beginPath(); cS.moveTo(12,Y(0)); cS.lineTo(W-12,Y(0)); cS.stroke();
  cS.fillStyle=T.scale; cS.font='700 11px sans-serif';
  cS.fillText('▽ GL±0', 12, Y(0)+14);

  /* 各区間 */
  const bodyC = (nnTheme==='dark')?'#2b3947':'#d8d4cb';
  const bodyE = (nnTheme==='dark')?'#46586a':'#9aa0a6';
  k.segs.forEach((g,gi)=>{
    const xa=X(g.a.v*s), xb=X(g.b.v*s), yl=Y(g.lv);
    /* 躯体（GL〜その部位の高さ） */
    cS.fillStyle=bodyC; cS.strokeStyle=bodyE; cS.lineWidth=1;
    cS.beginPath(); cS.rect(xa, yl, xb-xa, Y(0)-yl); cS.fill(); cS.stroke();
    /* 防水層（平場）＝工法色の太線 */
    cS.strokeStyle=sp.color||'#2e9e58'; cS.lineWidth=3.4; cS.lineCap='round';
    cS.beginPath(); cS.moveTo(xa, yl-1.7); cS.lineTo(xb, yl-1.7); cS.stroke();
    /* 両端の立上り（パラペット／壁当り） */
    [[g.a,-1,xa],[g.b,1,xb]].forEach(([end,sgn,px])=>{
      const e=end.e, hh=(e.h||0)/1000, wv=(e.w||0)/1000;
      if(hh<=0)return;
      const top=Y(g.lv+hh), th=Math.max(wv,0.08)*K;
      if(e.k==='kabe'){
        /* 壁当り：上に伸ばして破断線 */
        const wallTop=Y(g.lv+hh+2.0);
        cS.fillStyle=bodyC; cS.strokeStyle=bodyE; cS.lineWidth=1;
        cS.beginPath(); cS.rect(px-(sgn<0?th:0), wallTop, th, yl-wallTop); cS.fill(); cS.stroke();
        cS.strokeStyle=bodyE; cS.lineWidth=1.4; cS.beginPath();
        cS.moveTo(px-(sgn<0?th:0), wallTop+6); cS.lineTo(px+(sgn<0?0:th), wallTop-2); cS.stroke();
      }else{
        cS.fillStyle=bodyC; cS.strokeStyle=bodyE; cS.lineWidth=1;
        cS.beginPath(); cS.rect(px-(sgn<0?th:0), top, th, yl-top); cS.fill(); cS.stroke();
        /* 笠木 */
        cS.fillStyle=(nnTheme==='dark')?'#5b6b7a':'#8d949c';
        cS.fillRect(px-(sgn<0?th+3:3), top-4, th+6, 4);
      }
      /* 防水層（立上り＋天端） */
      cS.strokeStyle=sp.color||'#2e9e58'; cS.lineWidth=3.4;
      cS.beginPath();
      cS.moveTo(px+(sgn<0?1.7:-1.7), yl-1.7);
      cS.lineTo(px+(sgn<0?1.7:-1.7), top+1.7);
      if(e.k!=='kabe') cS.lineTo(px-(sgn<0?th:0)+(sgn<0?0:th), top+1.7);
      cS.stroke();
      /* 立上りHの札 */
      if(hh>0){
        const tx=px+(sgn<0?-4:4), ty=(yl+top)/2;
        cS.save(); cS.translate(tx,ty); cS.rotate(-Math.PI/2);
        cS.font='800 10.5px sans-serif'; cS.textAlign='center';
        const t='H'+Math.round(e.h);
        const w=cS.measureText(t).width+8;
        cS.fillStyle=T.labBg; cS.fillRect(-w/2,-8,w,15);
        cS.strokeStyle=T.dim; cS.lineWidth=.9; cS.strokeRect(-w/2,-8,w,15);
        cS.fillStyle=T.dim; cS.fillText(t,0,3); cS.restore(); cS.textAlign='left';
      }
    });
    /* 区間の長さ寸法（下） */
    const dy=Y(0)+30+ (gi%2)*16;
    cS.strokeStyle=T.dim; cS.lineWidth=1;
    cS.beginPath(); cS.moveTo(xa,dy); cS.lineTo(xb,dy); cS.stroke();
    [xa,xb].forEach(px=>{ cS.beginPath(); cS.arc(px,dy,2.4,0,7); cS.fillStyle=T.dim; cS.fill(); });
    const len=(g.b.v-g.a.v)*s;
    cS.font='800 11px sans-serif'; cS.textAlign='center';
    const t=len.toFixed(2)+'m', w=cS.measureText(t).width+9;
    cS.fillStyle=T.labBg; cS.fillRect((xa+xb)/2-w/2, dy-16, w, 15);
    cS.fillStyle=T.dim; cS.fillText(t,(xa+xb)/2, dy-5); cS.textAlign='left';
    /* 部位名とレベル */
    cS.font='800 11.5px sans-serif'; cS.textAlign='center';
    const nm=(g.poly.name||('部位'+(g.pi+1)))+'　▽GL+'+(g.lv).toFixed(1)+'m';
    const nw=cS.measureText(nm).width+10;
    if(xb-xa>nw*0.7){
      cS.fillStyle=T.labBg; cS.fillRect((xa+xb)/2-nw/2, yl+8, nw, 16);
      cS.fillStyle=(nnTheme==='dark')?'#cfe0e8':'#334';
      cS.fillText(nm,(xa+xb)/2, yl+20);
    }
    cS.textAlign='left';
  });

  /* 見出し・縮尺 */
  cS.fillStyle=(nnTheme==='dark')?'#cfe0e8':'#223';
  cS.font='800 14px sans-serif';
  cS.fillText((k.H?"A-A' 断面図":"B-B' 断面図")+'　'+(sp.name||''), 12, padT-26);
  cS.fillStyle=T.scale; cS.font='700 11px sans-serif';
  cS.fillText('たて・よこ同じ縮尺　1m ＝ '+K.toFixed(0)+'px', 12, padT-10);
};

/* 画面の向きや大きさが変わったら描き直す */
addEventListener('resize',()=>{ try{ nnSecDraw(); }catch(_){}} );
addEventListener('orientationchange',()=>setTimeout(()=>{ try{ nnSecDraw(); }catch(_){}},250));
ui();
})();
</script>
"""
anchor = "\n</body>\n</html>"
assert s.count(anchor) == 1
s = s.replace(anchor, "\n" + BLOCK + anchor)
print('OK  断面図モードの本体')

io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
