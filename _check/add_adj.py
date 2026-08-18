# -*- coding: utf-8 -*-
"""★2026-08-16s 隣り合う屋根の「境界の辺」を自動でつなぐ（本人の指示）。
   本体（closePoly / nnResolvePoint / draw）は書き換えず、末尾に独立ブロックとして足す。"""
import io

BLOCK = u"""
<script id="nn-adj-js">
/* ============================================================
   ★2026-08-16s 2つめの屋根を隣に描くとき、境界の辺を引かなくてよいようにした
   ------------------------------------------------------------
   《本人の指示》
   ・「屋根が隣接するときの、境界となるエッジをわざわざ引かなくてもよいようにして」
   ・「屋根1が2階・屋根2が1階のとき、その境界に立上りパラペットが2つできることがあるが不要」

   《やり方》
   ①作図中、**始点が既存の屋根の輪郭の上**にあり、いま置こうとしている点も
     **同じ屋根の輪郭の上**なら、そこで「閉じる」ことができる。
     足りない境界の線は、その屋根の輪郭をなぞって**自動で補う**。
     ★どちら回りでなぞるかは「できあがる面積が小さいほう」を採る。
       逆回りは既存の屋根をぐるりと囲んでしまい、面積がその分だけ大きくなるので、
       これだけで確実に見分けられる。
   ②できた境界の辺は、**両側で立上りが二重にならない**ように種別を決める。
     ・高さ（GL）が同じ … 両方「立上りなし」（同じ屋根面の切れ目なので立上りは無い）
     ・高さが違う      … 低いほう＝「壁当り」／高いほう＝そのまま（パラペット）
     手で境界をなぞって描いたときも同じように直す（closePoly のあとに1回だけ）。
   ============================================================ */
(function(){
'use strict';
const EPS=1e-9;
/* 「線の上」とみなす近さ（マス）。画面6px相当。 */
function tol(){ return Math.min(0.12, 6/(window.cellPx||40)); }

/* 点 p が線分 a-b の上にあるか。乗っていれば {t, d, x, y} */
function onSeg(a,b,p,t0){
  const dx=b.x-a.x, dy=b.y-a.y, L2=dx*dx+dy*dy;
  if(L2<EPS) return null;
  let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/L2;
  if(t<-0.002||t>1.002) return null;
  t=Math.max(0,Math.min(1,t));
  const qx=a.x+dx*t, qy=a.y+dy*t, d=Math.hypot(p.x-qx,p.y-qy);
  return d<=t0 ? {t:t, d:d, x:qx, y:qy} : null;
}
/* 点がどの部位の外周のどの辺に乗っているか（いちばん近いもの） */
function ringHit(p, t0){
  let best=null;
  (state.polys||[]).forEach(function(poly,pi){
    const pts=poly.pts||[]; const n=pts.length;
    for(let i=0;i<n;i++){
      const h=onSeg(pts[i], pts[(i+1)%n], p, t0);
      if(h && (!best || h.d<best.d)) best={pi:pi, i:i, t:h.t, d:h.d, x:h.x, y:h.y};
    }
  });
  return best;
}
/* リング上の位置 s（＝辺番号＋その中の割合）から s へ、前向きに通る頂点をならべる */
function fwdVerts(pts, sB, sA){
  const n=pts.length, out=[];
  let target=(sA>sB+1e-6)? sA : sA+n;
  let s=Math.floor(sB+1e-6)+1, guard=0;
  while(s<target-1e-6 && guard++<n+2){ out.push(pts[((s%n)+n)%n]); s++; }
  return out;
}
function ringPaths(poly, hA, hB){
  const pts=poly.pts, n=pts.length;
  const sA=hA.i+hA.t, sB=hB.i+hB.t;
  const f=fwdVerts(pts, sB, sA);                       /* B→A（番号が増える向き） */
  const b=fwdVerts(pts, sA, sB).slice().reverse();     /* B→A（番号が減る向き） */
  return [f, b];
}
function areaOf(pts){
  let a=0; for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[(i+1)%pts.length];
    a+=p.x*q.y-q.x*p.y; } return Math.abs(a)/2;
}

/* いま「隣に合わせて閉じられる」状態か。閉じられるなら中身を返す */
let PEND=null;
function checkAdj(g){
  PEND=null;
  if(typeof tool==='undefined' || tool!=='draw') return null;
  if(!drawPts || drawPts.length<2) return null;
  const t0=tol();
  const hA=ringHit(drawPts[0], Math.max(t0, 0.06));    /* 始点は既存の角に吸っている想定 */
  if(!hA) return null;
  const hB=ringHit(g, t0);
  if(!hB || hB.pi!==hA.pi) return null;
  const poly=state.polys[hA.pi];
  const B={x:hB.x, y:hB.y};
  const last=drawPts[drawPts.length-1];
  const base=drawPts.slice();
  if(Math.hypot(B.x-last.x, B.y-last.y)>1e-6) base.push(B);
  if(base.length<3) return null;
  const paths=ringPaths(poly, hA, hB);
  let best=null;
  paths.forEach(function(path){
    const cand=base.concat(path);
    if(cand.length<3) return;
    const a=areaOf(cand);
    if(a<1e-6) return;
    if(!best || a<best.area) best={pts:cand, path:path, area:a, from:base.length};
  });
  if(!best) return null;
  PEND={pi:hA.pi, pts:best.pts, from:best.from-1, endB:B};   /* from-1＝Bへ向かう辺の番号 */
  return PEND;
}
window.nnAdjPending=function(){ return PEND; };

/* ---- ① 打点の判定に「隣に合わせて閉じる」を足す ---- */
const _resolve=window.nnResolvePoint;
window.nnResolvePoint=function(gx,gy){
  const r=_resolve(gx,gy);
  if(r.close){ PEND=null; return r; }                  /* 始点タップの閉じが優先 */
  const a=checkAdj(r.g);
  if(a) return {g:{x:a.endB.x, y:a.endB.y}, close:true, adj:true};
  return r;
};

/* ---- ② 閉じるときに、境界の線を自動で足す ---- */
const _closePoly=window.closePoly;
window.closePoly=function(){
  const a=PEND;
  if(!a){ _closePoly(); nnSyncSharedEdges(); return; }
  const keep=drawPts.slice();
  drawPts=a.pts.slice();                                /* 境界をなぞった形にしてから作る */
  try{ _closePoly(); }catch(e){ drawPts=keep; PEND=null; throw e; }
  PEND=null;
  const poly=state.polys[state.polys.length-1];
  if(poly){
    /* 自動で足した辺（Bから先＋閉じの辺）に印を付ける＝あとで種別をそろえる */
    for(let i=a.from;i<poly.edges.length;i++) poly.edges[i].adj=1;
  }
  nnSyncSharedEdges();
  try{ saveState(); renderPolyList(); draw(); }catch(e){}
  toast('となりの屋根との境界は自動でつなぎました（種別も合わせています）');
};

/* ---- ③ 重なっている辺の種別をそろえる（立上りを二重にしない） ---- */
function segOverlap(a1,a2,b1,b2){
  /* 2つの線分がほぼ同じ直線に乗っていて、どれだけ重なっているか（マス） */
  const ux=a2.x-a1.x, uy=a2.y-a1.y, L=Math.hypot(ux,uy);
  if(L<1e-6) return 0;
  const nx=-uy/L, ny=ux/L;
  const d1=Math.abs((b1.x-a1.x)*nx+(b1.y-a1.y)*ny);
  const d2=Math.abs((b2.x-a1.x)*nx+(b2.y-a1.y)*ny);
  if(d1>tol()||d2>tol()) return 0;                     /* 平行でない・離れている */
  const t1=((b1.x-a1.x)*ux+(b1.y-a1.y)*uy)/(L*L);
  const t2=((b2.x-a1.x)*ux+(b2.y-a1.y)*uy)/(L*L);
  const lo=Math.max(0, Math.min(t1,t2)), hi=Math.min(1, Math.max(t1,t2));
  return Math.max(0,(hi-lo))*L;
}
function setKind(e, k, defH){
  e.k=k;
  if(k==='free'){ e.h=0; e.w=0; e.ago=false; }
  if(k==='kabe'){ e.w=0; e.ago=false; if(!e.h)e.h=defH; }
}
window.nnSyncSharedEdges=function(){
  const P=state.polys||[]; if(P.length<2) return 0;
  const defH=+((document.getElementById('defH')||{}).value)||300;
  let n=0;
  for(let a=0;a<P.length;a++)for(let b=a+1;b<P.length;b++){
    const A=P[a], B=P[b];
    for(let i=0;i<A.pts.length;i++){
      const a1=A.pts[i], a2=A.pts[(i+1)%A.pts.length];
      const la=Math.hypot(a2.x-a1.x, a2.y-a1.y); if(la<1e-6) continue;
      for(let j=0;j<B.pts.length;j++){
        const b1=B.pts[j], b2=B.pts[(j+1)%B.pts.length];
        const lb=Math.hypot(b2.x-b1.x, b2.y-b1.y); if(lb<1e-6) continue;
        const ov=segOverlap(a1,a2,b1,b2);
        if(ov < Math.min(la,lb)*0.5) continue;          /* 半分以上重なっていれば「境界」 */
        const ea=A.edges[i], eb=B.edges[j]; if(!ea||!eb) continue;
        const lvA=+A.lv||0, lvB=+B.lv||0;
        if(Math.abs(lvA-lvB)<1e-6){                     /* 同じ高さ＝ただの切れ目 */
          setKind(ea,'free',defH); setKind(eb,'free',defH);
        }else if(lvA<lvB){                              /* Aが下＝Aは壁当り */
          setKind(ea,'kabe',defH); if(eb.k==='kabe') setKind(eb,'para',defH);
        }else{
          setKind(eb,'kabe',defH); if(ea.k==='kabe') setKind(ea,'para',defH);
        }
        n++;
      }
    }
  }
  if(n){ try{ recalc(); dirty3d=true; if(tab==='d3')build3D(); }catch(e){} }
  return n;
};
/* 部位の高さ（GL+）を変えたときも、境界の種別を合わせ直す */
const _setLv=window.setLv;
if(typeof _setLv==='function'){
  window.setLv=function(){ const r=_setLv.apply(null,arguments);
    try{ nnSyncSharedEdges(); saveState(); draw(); }catch(e){} return r; };
}

/* ---- ④ 「ここで閉じる（境界は自動）」の見せ方 ---- */
const _draw=window.draw;
window.draw=function(){
  _draw();
  try{
    const a=PEND; if(!a) return;
    const ctx2=cv.getContext('2d');
    const X=x=>ox+x*cellPx, Y=y=>oy+y*cellPx;
    ctx2.save();
    /* 自動で足す境界を、紫の点線で見せる */
    ctx2.setLineDash([7,5]); ctx2.lineWidth=2.2; ctx2.strokeStyle='#8e44ad';
    ctx2.beginPath();
    for(let i=a.from;i<a.pts.length;i++){
      const p=a.pts[i], q=a.pts[(i+1)%a.pts.length];
      ctx2.moveTo(X(p.x),Y(p.y)); ctx2.lineTo(X(q.x),Y(q.y));
    }
    ctx2.stroke(); ctx2.setLineDash([]);
    /* 閉じる場所の輪と案内 */
    const e=a.endB;
    ctx2.beginPath(); ctx2.arc(X(e.x),Y(e.y),13,0,Math.PI*2);
    ctx2.strokeStyle='#8e44ad'; ctx2.lineWidth=2; ctx2.stroke();
    ctx2.font='bold 12px system-ui, sans-serif'; ctx2.textAlign='center';
    ctx2.lineWidth=3; ctx2.strokeStyle='#fff';
    ctx2.strokeText('ここで閉じる（境界は自動）', X(e.x), Y(e.y)+28);
    ctx2.fillStyle='#8e44ad';
    ctx2.fillText('ここで閉じる（境界は自動）', X(e.x), Y(e.y)+28);
    ctx2.restore();
  }catch(err){}
};
})();
</script>
"""

ANCHOR = u"\n</body>\n</html>"
f = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(f, encoding='utf-8').read()
assert 'id="nn-adj-js"' not in s, 'already'
assert s.count(ANCHOR) == 1, s.count(ANCHOR)
s = s.replace(ANCHOR, BLOCK + ANCHOR, 1)
io.open(f, 'w', encoding='utf-8', newline='').write(s)
print('ok')
