/* ★2026-08-28b 外壁の面を選んだときの赤いハイライト（§230①）
   本人の指摘「選択面を外壁側面側にしてるんだけど、なぜ赤で示されてる面が、途中で終わってるの？」
   ＝押せる範囲（当たり判定）は笠木の下まであるのに、赤く塗る範囲は躯体の壁だけだった。
   使い方: node _check/facehl.js ／ node _check/facehl.js before（直す前と比較） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BEFORE=process.argv[2]==='before';
const FILE=BEFORE? '_before.html' : 'zumen_sekisan.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const CASES=[
  ['壁3m＋立上り400mm', 3.0, 400],
  ['壁0m（平屋・立上りだけ）', 0.0, 400],
  ['壁6m＋立上り800mm', 6.0, 800],
];
(async()=>{
  if(BEFORE) require('./mkbefore')();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:700}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'}); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ state.scaleM=1; setTab('d3'); });
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.renderer,{timeout:20000});

  for(const [name, lv, h] of CASES){
    const r=await p.evaluate(async(a)=>{
      const [lv,h]=a;
      state.polys=[];state.parts=[];state.d3sol=[];
      drawPts=[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}]; closePoly();
      const P=state.polys[0]; P.lv=lv;
      P.edges.forEach(e=>{e.h=h;e.w=250;e.k='para';});
      saveState(); build3D();
      await new Promise(r2=>setTimeout(r2,400));
      sel={p:0,r:-1,e:0,f:'out'}; try{nn3dSync();}catch(_){}
      await new Promise(r2=>setTimeout(r2,250));
      const box=(pred,root)=>{ let lo=1e9,hi=-1e9;
        root.traverse(o=>{ if(!o.isMesh||!o.geometry)return; if(!pred(o))return;
          const bb=new THREE.Box3().setFromObject(o); lo=Math.min(lo,bb.min.y); hi=Math.max(hi,bb.max.y); });
        return [lo,hi]; };
      /* 赤いハイライト（f:'out' の板） */
      const hl=box(o=>o.userData&&o.userData.face==='out'&&o.geometry.type==='PlaneGeometry', T.scene);
      /* 押せる範囲（f:'out' の当たり判定の箱） */
      let pk=[1e9,-1e9];
      T.scene.traverse(o=>{ const u=o.userData&&o.userData.pick;
        if(u&&u.f==='out'&&o.isMesh&&o.geometry&&o.geometry.type==='BoxGeometry'){
          const bb=new THREE.Box3().setFromObject(o);
          pk=[Math.min(pk[0],bb.min.y), Math.max(pk[1],bb.max.y)]; } });
      return {hl:hl.map(v=>+v.toFixed(3)), pk:pk.map(v=>+v.toFixed(3)),
              wantTop:+(lv+h/1000).toFixed(3)};
    }, [lv,h]);
    ok('赤い面が笠木の下（立上りの上端）まで届く（'+name+'）',
       Math.abs(r.hl[1]-r.wantTop)<0.03, '赤 '+r.hl[1]+'m / 立上りの上端 '+r.wantTop+'m');
    ok('赤い面が地面（壁の足元）から始まる（'+name+'）',
       r.hl[0]<=0.03, r.hl[0]+'m');
    ok('押せる範囲と、赤くなる範囲がそろっている（'+name+'）',
       Math.abs(r.hl[1]-r.pk[1])<0.35 && Math.abs(r.hl[0]-r.pk[0])<0.05,
       '赤 '+JSON.stringify(r.hl)+' / 当たり判定 '+JSON.stringify(r.pk));
  }
  await p.evaluate(()=>{ state.polys=[]; state.active=-1; sel=null; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((BEFORE?'【直す前 _before.html】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
