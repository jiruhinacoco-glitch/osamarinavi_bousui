# -*- coding: utf-8 -*-
# 図面・積算の致命バグ2件：
#  ①磁石が強すぎて2棟目の直線が引けない → 磁石を半マス以内に限定
#  ②3Dで90度以外のパラペットがずれる → 壁・笠木を角で突き合わせた形（留め継ぎ）で作る
import io, sys

PATH = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []

# ---------- ①磁石を弱める ----------
reps.append((
"""/* ★頂点の磁石：指の位置から画面上26px以内に既存の頂点があれば吸い付く。
   ・作図中の「始点」＝図形を閉じるための磁石（これが無いと永遠に閉じられない）
   ・確定済みの部位の頂点＝隣の屋根とぴったり繋げるための磁石 */
function vertexMagnet(g){
  const R=26/cellPx;                     /* 画面26px分をマス数に換算 */""",
"""/* ★頂点の磁石（2026-08-06i 弱めた）：
   打点はもともと方眼の交差点に丸まる（snapG）ので、格子の上にある頂点とは
   磁石が無くても一致する。磁石が要るのは「数値入力で格子から外れた頂点」だけ。
   以前は画面26px（縮小表示だと1マス以上）で吸っていたため、既存の屋根の
   近くに2棟目をかくと頂点に持っていかれ、まっすぐな線が引けなかった。
   ※図形を閉じる磁石は nnResolvePoint 側（26pxのまま）なので影響しない。 */
function vertexMagnet(g){
  const R=Math.min(12/cellPx, 0.45);     /* 半マスを上限に、画面12px分だけ */""",
'M1 磁石を半マスに限定'))

# ---------- ②3Dパラペットの留め継ぎ ----------
OLD3D = """    /* 辺ごとの立上り（外周＋中抜きの縁） */
    ringsOf(poly).forEach(ring=>{
      const rpts=ring.pts;
      const rptsM=rpts.map(p=>({x:p.x*s,y:p.y*s}));
      for(let i=0;i<rpts.length;i++){
        const e=ek(ring.edges[i]);
        if(e.h<=0)continue;
        const a=rptsM[i], b=rptsM[(i+1)%rptsM.length];
        const len=Math.hypot(b.x-a.x,b.y-a.y);
        const hh=e.h/1000;
        const nrm=ringNormal(poly, rpts, rpts[i], rpts[(i+1)%rpts.length]);
        const ang=Math.atan2(b.y-a.y, b.x-a.x);
        if(e.k==='para'){
          const th=Math.max(e.w/1000,0.08);
          const cx=(a.x+b.x)/2 + nrm.x*th/2, cz=(a.y+b.y)/2 + nrm.y*th/2;
          const wall=new THREE.Mesh(new THREE.BoxGeometry(len,hh,th),
            new THREE.MeshLambertMaterial({color:0xcfd2ca}));
          wall.position.set(cx,lv+hh/2,cz); wall.rotation.y=-ang; g.add(wall);
          const face=new THREE.Mesh(new THREE.PlaneGeometry(len,hh),
            new THREE.MeshLambertMaterial({color:sp.fill,side:THREE.DoubleSide}));
          face.position.set((a.x+b.x)/2+nrm.x*0.012, lv+hh/2, (a.y+b.y)/2+nrm.y*0.012);
          face.rotation.y=-ang; g.add(face);
          const cap=new THREE.Mesh(new THREE.BoxGeometry(len+0.04,0.035,th+0.07),
            new THREE.MeshLambertMaterial({color:0x8d949c}));
          cap.position.set(cx,lv+hh+0.018,cz); cap.rotation.y=-ang; g.add(cap);
        }else if(e.k==='kabe'){
          /* 壁当り：段差ライン等で上位レベルの部位と辺を共有していれば、外壁高さ＝レベル差を自動採用 */
          const th=0.15;
          let wallUp=2.6;
          const shared=findSharedLevel(poly, rpts[i], rpts[(i+1)%rpts.length]);
          if(shared!=null && shared>lv+hh) wallUp=shared-lv-hh+0.0;
          const cx=(a.x+b.x)/2 + nrm.x*th/2, cz=(a.y+b.y)/2 + nrm.y*th/2;
          const wall=new THREE.Mesh(new THREE.BoxGeometry(len,hh+wallUp,th),
            new THREE.MeshLambertMaterial({color:0xd8d0c2}));
          wall.position.set(cx,lv+(hh+wallUp)/2,cz); wall.rotation.y=-ang; g.add(wall);
          maxY=Math.max(maxY,lv+hh+wallUp);
          const face=new THREE.Mesh(new THREE.PlaneGeometry(len,hh),
            new THREE.MeshLambertMaterial({color:sp.fill,side:THREE.DoubleSide}));
          face.position.set((a.x+b.x)/2+nrm.x*0.012, lv+hh/2, (a.y+b.y)/2+nrm.y*0.012);
          face.rotation.y=-ang; g.add(face);
          const bar=new THREE.Mesh(new THREE.BoxGeometry(len,0.05,0.03),
            new THREE.MeshLambertMaterial({color:0xb8bec6}));
          bar.position.set((a.x+b.x)/2+nrm.x*0.028, lv+hh-0.025, (a.y+b.y)/2+nrm.y*0.028);
          bar.rotation.y=-ang; g.add(bar);
        }
      }
    });"""

NEW3D = """    /* 辺ごとの立上り（外周＋中抜きの縁）
       ★2026-08-06i 作り直し：壁・笠木は「辺ごとの直方体」をやめ、
       角で互いに突き合わせた台形（留め継ぎ）を押し出して作る。
       直方体だと90度以外の角で壁どうしが届かず、パラペットがずれて見えた
       （90度は隣の壁の厚みがすき間を偶然隠していただけ）。 */
    ringsOf(poly).forEach(ring=>{
      const rpts=ring.pts;
      const rptsM=rpts.map(p=>({x:p.x*s,y:p.y*s}));
      const N=rptsM.length;
      /* 各辺の情報（壁の無い辺は null） */
      const eds=[];
      for(let i=0;i<N;i++){
        const e=ek(ring.edges[i]);
        if(e.h<=0){ eds.push(null); continue; }
        const a=rptsM[i], b=rptsM[(i+1)%N];
        eds.push({e, a, b,
          len:Math.hypot(b.x-a.x,b.y-a.y),
          hh:e.h/1000,
          th:(e.k==='para')?Math.max(e.w/1000,0.08):0.15,
          nrm:ringNormal(poly, rpts, rpts[i], rpts[(i+1)%N]),
          ang:Math.atan2(b.y-a.y, b.x-a.x)});
      }
      /* 辺 ed の線を、屋根の内側へ off だけずらした上の点P（offが負なら外側） */
      const offPt=(ed,P,off)=>({x:P.x+ed.nrm.x*off, y:P.y+ed.nrm.y*off});
      /* 角P（edA→edB の継ぎ目）：それぞれ offA/offB ずらした2本の線の交点＝留め継ぎの角。
         隣に壁が無い・平行・極端に尖った角は、そのまま直角に切る */
      function joint(edA, edB, P, offA, offB){
        if(!edA) return offPt(edB,P,offB);
        if(!edB) return offPt(edA,P,offA);
        const p1=offPt(edA,P,offA), d1={x:edA.b.x-edA.a.x, y:edA.b.y-edA.a.y};
        const p2=offPt(edB,P,offB), d2={x:edB.b.x-edB.a.x, y:edB.b.y-edB.a.y};
        const den=d1.x*d2.y-d1.y*d2.x;
        if(Math.abs(den)<1e-9) return p2;
        const t=((p2.x-p1.x)*d2.y-(p2.y-p1.y)*d2.x)/den;
        const ix=p1.x+d1.x*t, iy=p1.y+d1.y*t;
        if(Math.hypot(ix-P.x, iy-P.y) > (Math.abs(offA)+Math.abs(offB))*4+0.2) return p2;
        return {x:ix, y:iy};
      }
      /* 平面の台形 [外始→外終→内終→内始] を高さhで押し出して置く（yTop＝上端の高さ） */
      function strip(o1,o2,i2,i1,h,yTop,color){
        let q=[o1,o2,i2,i1];
        const area=q.reduce((s2,p,idx)=>{const n2=q[(idx+1)%4]; return s2+(p.x*n2.y-n2.x*p.y);},0);
        if(area<0)q=q.slice().reverse();
        const sh=new THREE.Shape(q.map(p=>new THREE.Vector2(p.x,p.y)));
        const gm=new THREE.ExtrudeGeometry(sh,{depth:h,bevelEnabled:false});
        gm.rotateX(Math.PI/2);
        const m=new THREE.Mesh(gm,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
        m.position.y=yTop; g.add(m);
      }
      for(let i=0;i<N;i++){
        const ed=eds[i]; if(!ed)continue;
        const prev=eds[(i+N-1)%N], next=eds[(i+1)%N];
        const e=ed.e, hh=ed.hh, th=ed.th, nrm=ed.nrm, a=ed.a, b=ed.b, len=ed.len, ang=ed.ang;
        const P0=rptsM[i], P1=rptsM[(i+1)%N];
        if(e.k==='para'){
          /* 壁：外側の線＝辺そのもの。内側＝厚みth。角は隣の壁と留め継ぎ */
          strip(joint(prev,ed,P0,0,0), joint(ed,next,P1,0,0),
                joint(ed,next,P1,th,(next?next.th:th)),
                joint(prev,ed,P0,(prev?prev.th:th),th),
                hh, lv+hh, 0xcfd2ca);
          /* 立上り面（防水色）は内側の面に貼る */
          const face=new THREE.Mesh(new THREE.PlaneGeometry(len,hh),
            new THREE.MeshLambertMaterial({color:sp.fill,side:THREE.DoubleSide}));
          face.position.set((a.x+b.x)/2+nrm.x*0.012, lv+hh/2, (a.y+b.y)/2+nrm.y*0.012);
          face.rotation.y=-ang; g.add(face);
          /* 笠木：外へ35mm・内へ th+35mm はみ出し。笠木どうしだけ留め継ぎ */
          const pc=(prev&&prev.e.k==='para')?prev:null, nc=(next&&next.e.k==='para')?next:null;
          strip(joint(pc,ed,P0,-0.035,-0.035), joint(ed,nc,P1,-0.035,-0.035),
                joint(ed,nc,P1,th+0.035,(nc?nc.th+0.035:th+0.035)),
                joint(pc,ed,P0,(pc?pc.th+0.035:th+0.035),th+0.035),
                0.035, lv+hh+0.035, 0x8d949c);
        }else if(e.k==='kabe'){
          /* 壁当り：段差ライン等で上位レベルの部位と辺を共有していれば、外壁高さ＝レベル差を自動採用 */
          let wallUp=2.6;
          const shared=findSharedLevel(poly, rpts[i], rpts[(i+1)%N]);
          if(shared!=null && shared>lv+hh) wallUp=shared-lv-hh+0.0;
          strip(joint(prev,ed,P0,0,0), joint(ed,next,P1,0,0),
                joint(ed,next,P1,th,(next?next.th:th)),
                joint(prev,ed,P0,(prev?prev.th:th),th),
                hh+wallUp, lv+hh+wallUp, 0xd8d0c2);
          maxY=Math.max(maxY,lv+hh+wallUp);
          const face=new THREE.Mesh(new THREE.PlaneGeometry(len,hh),
            new THREE.MeshLambertMaterial({color:sp.fill,side:THREE.DoubleSide}));
          face.position.set((a.x+b.x)/2+nrm.x*0.012, lv+hh/2, (a.y+b.y)/2+nrm.y*0.012);
          face.rotation.y=-ang; g.add(face);
          const bar=new THREE.Mesh(new THREE.BoxGeometry(len,0.05,0.03),
            new THREE.MeshLambertMaterial({color:0xb8bec6}));
          bar.position.set((a.x+b.x)/2+nrm.x*0.028, lv+hh-0.025, (a.y+b.y)/2+nrm.y*0.028);
          bar.rotation.y=-ang; g.add(bar);
        }
      }
    });"""

reps.append((OLD3D, NEW3D, 'M2 3Dパラペット留め継ぎ'))

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
