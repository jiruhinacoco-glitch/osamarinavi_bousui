/* ★2026-08-27g パラペットの高さが辺ごとに違うとき、角が「斜めに切られた」ように見える不具合
   留め継ぎ（45度）の合わせ目は、高さがそろっているうちは両方の壁に挟まれて見えない。
   片方だけ高くすると、その差のぶんだけ45度の面がむき出しになる（本人の指摘）。
   → 高さが違う角は留め継ぎにせず、高いほうが角を通しで作り、低いほうが突き当たる。
   使い方: node _check/corner1.js        （いまのファイル）
           node _check/corner1.js before （直す前と比べる。_check/mkbefore.js が用意）*/
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BEFORE=process.argv[2]==='before';
const FILE=BEFORE? '_before.html' : 'zumen_sekisan.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const CASES=[
  ['長方形・1辺だけ高い',        [[0,0],[16,0],[16,9],[0,9]], 3],
  ['長方形・別の辺が高い',       [[0,0],[16,0],[16,9],[0,9]], 0],
  ['逆回りの長方形',             [[0,0],[0,9],[16,9],[16,0]], 3],
  ['L字の形',                    [[0,0],[16,0],[16,5],[8,5],[8,9],[0,9]], 5],
];
(async()=>{
  if(BEFORE) require('./mkbefore')();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:900,height:640}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1300);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ state.scaleM=1; setTab('d3'); });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.renderer; }catch(_){return false;} },null,{timeout:20000});

  for(const [name, pts, hi] of CASES){
    const r=await p.evaluate(async(a)=>{
      const [pts,hi]=a;
      state.polys=[{name:'屋根①', lv:0, pts:pts.map(q=>({x:q[0],y:q[1]})),
        edges:pts.map(()=>({h:600,w:250,k:'para'}))}];
      state.active=0;
      nnKasagiSet(0,true);
      ringsOf(state.polys[0])[0].edges[hi].h=1400;
      saveState(); recalc(); draw(); build3D();
      await new Promise(r2=>setTimeout(r2,260));
      /* ★45度の「留め継ぎの面」は法線が水平（ny=0）なので、上下の傾きだけ見ても見つからない。
         壁の向き（x軸・z軸）のどちらにも平行でない縦の面＝斜めに切った断面、として探す。
         低いほう（600mm）の天端より上に出ているものだけを数える。 */
      let cnt=0, ex=null;
      T.scene.traverse(o=>{
        const g=o.geometry; if(!o.isMesh||!g||!g.attributes||!g.attributes.position) return;
        if(o.material && o.material.opacity===0) return;
        const pos=g.attributes.position, idx=g.index, m=idx?idx.count:pos.count;
        o.updateMatrixWorld(); const M=o.matrixWorld.elements;
        const get=k=>{ const j=idx?idx.getX(k):k; const x=pos.getX(j),y=pos.getY(j),z=pos.getZ(j);
          return [M[0]*x+M[4]*y+M[8]*z+M[12], M[1]*x+M[5]*y+M[9]*z+M[13], M[2]*x+M[6]*y+M[10]*z+M[14]]; };
        for(let k=0;k+2<m;k+=3){
          const A=get(k),B=get(k+1),C=get(k+2);
          const u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]], v=[C[0]-A[0],C[1]-A[1],C[2]-A[2]];
          const nx=u[1]*v[2]-u[2]*v[1], ny=u[2]*v[0]-u[0]*v[2], nz=u[0]*v[1]-u[1]*v[0];
          const nl=Math.hypot(nx,ny,nz); if(nl<1e-12) continue;
          if(Math.abs(ny)/nl>0.30) continue;                 /* 上や下を向く面は対象外 */
          const hn=Math.hypot(nx,nz)||1e-9;
          const mn=Math.min(Math.abs(nx/hn), Math.abs(nz/hn));
          const ys=[A[1],B[1],C[1]];
          if(mn>0.30 && nl/2>0.03 && Math.max(...ys)>0.70 && (Math.max(...ys)-Math.min(...ys))>0.15){
            cnt++; if(!ex) ex={n:[+(nx/nl).toFixed(2),+(nz/nl).toFixed(2)],
              y:[+Math.min(...ys).toFixed(2),+Math.max(...ys).toFixed(2)],
              col:o.material.color?('#'+o.material.color.getHexString()):''};
          }
        }
      });
      return {cnt, ex};
    }, [pts,hi]);
    ok('むき出しの斜めカットが無い（'+name+'）', r.cnt===0, r.cnt+'件 '+(r.ex?JSON.stringify(r.ex):''));
  }

  /* 高さが同じ角は、今までどおり留め継ぎのまま（見えないので直す必要はない） */
  const same=await p.evaluate(async()=>{
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:16,y:0},{x:16,y:9},{x:0,y:9}],
      edges:[0,1,2,3].map(()=>({h:600,w:250,k:'para'}))}];
    state.active=0; saveState(); recalc(); draw(); build3D();
    await new Promise(r=>setTimeout(r,260));
    /* 角の内側の点が、両方の壁のどちらかに入っているか（すき間ができていないか） */
    const box=new THREE.Box3(); let hit=0;
    T.group.traverse(o=>{ if(!o.isMesh)return; const bb=new THREE.Box3().setFromObject(o);
      if(bb.min.x<0.13&&bb.max.x>0.12&&bb.min.z<0.13&&bb.max.z>0.12&&bb.max.y>0.5) hit++; });
    return hit;
  });
  ok('高さがそろっている角は、すき間なく塞がっている', same>0, same+'個の部品が角にある');

  /* 数量（立上り面積）は変わらない＝見積に影響しない */
  const q=await p.evaluate(()=>{
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:16,y:0},{x:16,y:9},{x:0,y:9}],
      edges:[0,1,2,3].map(()=>({h:600,w:250,k:'para'}))}];
    state.active=0; ringsOf(state.polys[0])[0].edges[3].h=1400;
    saveState(); recalc();
    const x=quantities(state.polys[0], state.scaleM);
    return {hira:Math.round(x.hira*10)/10, tachi:Math.round(x.tachi*10)/10};
  });
  /* 立上り＝(16+16+9)×0.6 + 9×1.4 = 24.6+12.6 = 37.2 ／ 平場＝144 */
  ok('平場の数量は144㎡のまま', Math.abs(q.hira-144)<0.05, q.hira);
  ok('立上りの数量は37.2㎡のまま（角の作りを変えても見積は変わらない）',
     Math.abs(q.tachi-37.2)<0.05, q.tachi);

  await p.evaluate(()=>{ state.polys=[]; state.active=-1; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((BEFORE?'【直す前 _before.html】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
