/* §1432 ①躯体の表示：パラペット天端の角に、斜めの輪郭線（部品の合わせ目）が出ない。
   L字の屋根（角6つ・パラペット H300 W250）を躯体表示・スタジオの光で開き、輪郭線の線分を世界の座標で数える。
   ・角のまわり（0.5m以内）にある「水平で斜め」の線分＝合わせ目 → 0本
   ・残すべき線：外側の角の縦の線（6つの角それぞれに1本以上）・天端の外側のふちの長い線
   直す前の版は★NG。使い方: node _check/tenbasen.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.evaluate(()=>{ try{nnZMenuClose()}catch(_){} state.kubun='kaishu'; state.kizon='roshutsu'; state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[];
  const pts=[{x:0,y:0},{x:12,y:0},{x:12,y:4},{x:8,y:4},{x:8,y:8},{x:0,y:8}];
  state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); state.active=0; state.genkyo='body'; recalc(); setTab('d3'); });
await p.waitForFunction(()=>{ let n=0; try{ T.group.traverse(o=>{ if(o.userData&&o.userData.nnEdgeLine) n++; }); }catch(_){ } return n>10; },null,{timeout:20000}).catch(()=>{});
const r=await p.evaluate(()=>{ const C=[[0,0],[12,0],[12,4],[8,4],[8,8],[0,8]]; T.group.updateMatrixWorld(true); const P=new THREE.Vector3(), Q=new THREE.Vector3();
  let diag=0, total=0, longTop=0; const vert=C.map(()=>0);
  T.group.traverse(o=>{ if(!o.userData||!o.userData.nnEdgeLine||!o.visible) return; const a=o.geometry.attributes.position, m=o.parent;
    for(let i=0;i+1<a.count;i+=2){ P.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld); Q.fromBufferAttribute(a,i+1).applyMatrix4(m.matrixWorld); total++;
      const dx=Math.abs(P.x-Q.x), dy=Math.abs(P.y-Q.y), dz=Math.abs(P.z-Q.z);
      C.forEach((c,k)=>{ const near=v=>Math.hypot(v.x-c[0],v.z-c[1])<0.5;
        if(near(P)&&near(Q)&&dy<1e-6&&dx>0.02&&dz>0.02) diag++;                                   /* 水平で斜め＝合わせ目 */
        if(Math.hypot(P.x-c[0],P.z-c[1])<1e-3&&Math.hypot(Q.x-c[0],Q.z-c[1])<1e-3&&dy>0.1) vert[k]++; });  /* 角の真上の縦の線 */
      if(dy<1e-6&&Math.max(P.y,Q.y)>=0.3&&dz<1e-6&&Math.abs(P.z)<1e-3&&dx>11) longTop++; } });           /* 天端の外側のふち（手前の辺・長さ12m） */
  return {diag,total,vert,longTop}; });
ck(r.total>40,'輪郭線が引かれている（'+r.total+'本）');
ck(r.diag===0,'角のまわりに、水平で斜めの線（部品の合わせ目）が無い（'+r.diag+'本）');
ck(r.vert.every(v=>v>=1),'外側の角の縦の線は6つの角とも残っている（'+r.vert.join(',')+'）');
ck(r.longTop>=1,'天端の外側のふちの長い線は残っている（'+r.longTop+'本）');
console.log('errors',errs.slice(0,3)); if(errs.length) NG++;
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
