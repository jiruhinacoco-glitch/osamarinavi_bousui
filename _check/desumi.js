/* ★2026-09-09e §369 出隅（外に出っぱる角）の立上りで、増張りが角の稜線で切れていないか。
   実物の施工では、増張りは出隅の角を **切らずに巻く**（角に穴が空くことはない）。
   ★見方も実物と同じにする：**角の稜線に向かって光線を撃ち、最初に当たるのが増張りか躯体か**。
     躯体が先に見えたら、そこは穴（貼り残し）。モデルの中身の数字ではなく「見えるか」で測る。
   使い方: node _check/desumi.js  ／ node _check/desumi.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:460},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(1000);
  await p.evaluate(()=>{ state.scaleM=1;
    /* L字の屋根：(5,4) が出隅（防水から見て外に出っぱる角） */
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}];
    state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}];
    state.d3sheet=[]; saveState(); setTab('d3'); });
  await p.waitForTimeout(2600);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.25, phi:1.22, tx:4.55, tz:3.55, r:2.4}); T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(1400);

  /* 角の稜線をねらって光線を撃つ。最初に当たるのが nnSheet なら貼れている */
  const scan=()=>p.evaluate(()=>{
    T.scene.updateMatrixWorld(true);            /* 光線を撃つ前に位置を最新にする */
    const objs=[]; T.group.traverse(o=>{ if(o.isMesh&&o.visible&&!(o.userData&&o.userData.pick)) objs.push(o); });
    const rc=new THREE.Raycaster();
    const dir=new THREE.Vector3(1,0,1).normalize();     /* 角の外側から稜線へ向かう向き */
    const out=[];
    for(let k=0;k<12;k++){
      const y=0.02+k*0.02;                              /* 立上りの下から 0.02〜0.24m */
      const o0=new THREE.Vector3(4.744-0.25, y, 3.744-0.25);   /* 角の手前25cmから撃つ（途中の物をよけるため） */
      rc.set(o0, dir);
      const hs=rc.intersectObjects(objs,false)||[];
      let name='(なし)', dist=-1;
      for(let i=0;i<hs.length;i++){
        const m=hs[i].object;
        if(m.material&&m.material.transparent&&m.material.opacity<0.1) continue;
        if(m.name==='nnSolLab'||m.name==='nnSheetLab') continue;
        name=m.name||'(無名)'; dist=+hs[i].distance.toFixed(3); break;
      }
      /* 稜線までの距離は 0.25*√2＝0.354m。そこで当たったものが増張りでなければ穴 */
      out.push({y:+y.toFixed(2), hit:name, d:dist, atEdge:(dist>0.30&&dist<0.41)});
    }
    return out;
  });

  /* ① 出入隅の増張り（角を1回タップ） */
  const A=await p.evaluate(()=>{ state.d3sheet=[];
    window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'corner',w:800,d:250,t:4};
    nnSheetCornerTap({point:new THREE.Vector3(5,0,4)});
    const s=state.d3sheet[0]; return {kado:s&&s.kado, n:s?s.faces.length:0}; });
  await p.waitForTimeout(700);
  const sA=await scan();
  const badA=sA.filter(r=>r.atEdge && r.hit!=='nnSheet');   /* 稜線で躯体が見えている＝穴 */
  console.log('  ① '+JSON.stringify(A)+'  '+JSON.stringify(sA.map(r=>r.y+':'+r.hit)));
  ok(A.kado==='出隅' && A.n>0, '① 出隅の増張りが置ける', A);
  ok(badA.length===0, '① 角の稜線に穴が無い（立上りの高さぜんぶで増張りが見える）', badA);
  ok(sA.filter(r=>r.hit==='nnSheet').length>=8, '① 立上りのほとんどの高さで増張りが見える（検査が空振りしていない）', sA.filter(r=>r.hit==='nnSheet').length);

  /* ② 面にかいた増張り（デカール）が出隅をまたぐとき */
  const B=await p.evaluate(()=>{ state.d3sheet=[];
    window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
    /* 立上りの帯を出隅に巻く（いちばんふつうの増張り） */
    const W=[new THREE.Vector3(4.732,0.02,4.60), new THREE.Vector3(4.732,0.25,4.60),
             new THREE.Vector3(4.732,0.25,3.732), new THREE.Vector3(5.60,0.25,3.732),
             new THREE.Vector3(5.60,0.02,3.732), new THREE.Vector3(4.732,0.02,3.732)];
    const p0=W[0].clone(), u0=new THREE.Vector3(1,0,0), v0=new THREE.Vector3(0,0,1);
    const pts=W.map(w=>{ const d=w.clone().sub(p0); return [d.dot(u0), d.dot(v0)]; });
    nnSheetCommit({p:p0.toArray(), n:[0,1,0], u:u0.toArray(), v:v0.toArray(), pts, w:W, off:0.012});
    const s=state.d3sheet[0]; return {how:(window.__nnWrapUsed||{}).how, n:s?s.faces.length:0}; });
  await p.waitForTimeout(700);
  const sB=await scan();
  const badB=sB.filter(r=>r.atEdge && r.hit!=='nnSheet');
  console.log('  ② '+JSON.stringify(B)+'  '+JSON.stringify(sB.map(r=>r.y+':'+r.hit)));
  ok(B.n>0, '② 出隅をまたいでかいた増張りが置ける', B);
  ok(badB.length===0, '② 角の稜線に穴が無い', badB);
  ok(sB.filter(r=>r.hit==='nnSheet').length>=8, '② こちらも空振りしていない', sB.filter(r=>r.hit==='nnSheet').length);

  /* ③ 角で板が「となりの板より外へ飛び出して」いないか（本人の指摘「どちらかの面が飛び出ている」）
        ★実物：出隅の増張りは角で重ねるが、重ね代が外へはみ出して段差になることはない。
        ★検算は検査側で：板は面から1.5mm浮かせ、厚みtぶん外へ出る＝外側の面は面から 1.5mm+t。
          出っぱった折れ目のとなり合う板について、その外側の面より外へ出た量を測る。 */
  const poke=(mode)=>p.evaluate(mode=>{
    state.d3sheet=[];
    if(mode==='corner'){
      window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'corner',w:800,d:250,t:4};
      nnSheetCornerTap({point:new THREE.Vector3(5,0,4)});
    }else{
      window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
      const W=[new THREE.Vector3(4.40,0.024,4.40), new THREE.Vector3(4.732,0.22,4.40),
               new THREE.Vector3(4.732,0.22,3.732), new THREE.Vector3(5.40,0.22,3.732),
               new THREE.Vector3(5.40,0.024,3.40)];
      const p0=W[0].clone(), u0=new THREE.Vector3(1,0,0), v0=new THREE.Vector3(0,0,1);
      const pts=W.map(w=>{ const d=w.clone().sub(p0); return [d.dot(u0), d.dot(v0)]; });
      nnSheetCommit({p:p0.toArray(), n:[0,1,0], u:u0.toArray(), v:v0.toArray(), pts, w:W, off:0.012});
    }
    const s=state.d3sheet[0]; if(!s) return {none:1};
    const V=a=>new THREE.Vector3(a[0],a[1],a[2]);
    const t=s.t||0.004, OFF=0.0015;
    const F=(s.faces||[]).map(f=>{ const q0=V(f.p),qu=V(f.u),qv=V(f.v);
      return {n:V(f.n), p:q0, W:f.pts.map(q=>q0.clone().addScaledVector(qu,q[0]).addScaledVector(qv,q[1]))}; });
    let mx=-9, pair=null;
    F.forEach((A,i)=>F.forEach((B,j)=>{
      if(i===j || Math.abs(A.n.dot(B.n))>0.98) return;
      const C=new THREE.Vector3(); B.W.forEach(w=>C.add(w)); C.multiplyScalar(1/B.W.length);
      let near=null;
      A.W.forEach((v,k)=>{ const w2=A.W[(k+1)%A.W.length];
        const M=v.clone().add(w2).multiplyScalar(0.5);
        let d=1e9; B.W.forEach((c,m)=>{ const e=B.W[(m+1)%B.W.length];
          const ab=e.clone().sub(c), ap=M.clone().sub(c), L2=ab.lengthSq();
          const tt=L2<1e-12?0:Math.max(0,Math.min(1,ap.dot(ab)/L2));
          d=Math.min(d, M.distanceTo(c.clone().addScaledVector(ab,tt))); });
        if(d<0.025 && A.n.dot(C.clone().sub(M))<-0.002) near=M;    /* 出っぱった折れ目で となり合う */
      });
      if(!near) return;
      A.W.forEach(v=>{ const d=v.clone().sub(B.p).dot(B.n)-(OFF+t);
        if(d>mx){ mx=d; pair=[i,j]; } });
    }));
    return {mx:+(mx*1000).toFixed(1), pair, n:F.length};
  }, mode);
  const P1=await poke('corner'); await p.waitForTimeout(300);
  const P2=await poke('decal');
  console.log('  ③ 角タップ '+JSON.stringify(P1)+'  面にかく '+JSON.stringify(P2));
  ok(P1.mx<=2.0, '③ 角タップ：板がとなりの板より外へ飛び出していない（2mm以内）', P1.mx+'mm');
  ok(P2.mx<=2.0, '③ 面にかく：板がとなりの板より外へ飛び出していない（2mm以内）', P2.mx+'mm');

  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 出隅の角に穴は無い');
  await b.close();
})();
