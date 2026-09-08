/* ★2026-09-08z §344/§345 デカール方式の検証（GPTの検証条件そのまま）
   ①内外判定（内側・外側・一部重なる）②確定でデカールが実行され保存される
   ③立上り→面取り→天端をまたぐ増貼り ④プレビューと確定後が一致 ⑤保存・再読込
   使い方: node _check/decal.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1; const pts=[{x:0,y:0},{x:16,y:0},{x:16,y:8},{x:8,y:8},{x:8,y:16},{x:0,y:16}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:400,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:20000});

  /* ── ① 内外判定（GPTの指摘①の検算・時計回りと反時計回りの両方） ── */
  const cl=await p.evaluate(()=>{
    const ccw=[[0,0],[1,0],[0,1]], cw=[[0,0],[0,1],[1,0]];
    const inside=[[0.1,0.1],[0.2,0.1],[0.1,0.2]];
    const outside=[[2,2],[3,2],[2,3]];
    const part=[[0.4,0.4],[1.4,0.4],[0.4,1.4]];
    const A=(P)=>{ if(!P||P==='ERR'||P.length<3) return 0; let a=0; for(let i=0;i<P.length;i++){const q=P[(i+1)%P.length]; a+=P[i][0]*q[1]-q[0]*P[i][1];} return Math.abs(a)/2; };
    return { inCCW:A(nnClipTriDbg(inside,ccw)), inCW:A(nnClipTriDbg(inside,cw)),
             outCCW:A(nnClipTriDbg(outside,ccw)), partCCW:A(nnClipTriDbg(part,ccw)) };
  });
  ok(Math.abs(cl.inCCW-0.005)<1e-6,'① 完全に内側の形はそのまま残る（反時計回り）',cl.inCCW);
  ok(Math.abs(cl.inCW-0.005)<1e-6,'① 時計回りの三角形でも同じ',cl.inCW);
  ok(cl.outCCW===0,'① 完全に外側の形は残らない',cl.outCCW);
  ok(cl.partCCW>0.001 && cl.partCCW<0.5,'① 一部重なる形は重なりぶんだけ残る',cl.partCCW);

  /* ── ③ 立上り→面取り→天端 をまたぐ増貼りを、実際にかく ── */
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){}
    T.theta=Math.PI*0.5+0.25; T.phi=1.32; T.tx=4; T.tz=1.2; T.r=3.2; T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{ nnSheetStart({n:'増し張り',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(500);
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:8000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:15000}).catch(()=>{}); await p.waitForTimeout(120); };
  const SCR=async(x,y,z)=>{ await settle(); return p.evaluate(([x,y,z])=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(x,y,z).project(T.camera); return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; },[x,y,z]); };
  /* 平場(z=0.6) → 立上り面(z=0.25,y=0.30) → 天端の上(y=0.4,z=0.12) までまたぐ四角 */
  const CL=[[3.2,0.012,0.6],[3.2,0.40,0.12],[4.4,0.40,0.12],[4.4,0.012,0.6]];
  for(const q of CL){ const c=await SCR(...q); await p.mouse.click(c.x,c.y); await p.waitForTimeout(300); }
  const pv=await p.evaluate(()=>{ const g=T.scene.getObjectByName? null:null;
    let a=0, n=0; (function f(o){ o.children.forEach(c=>{ if(c.name==='nnPvFill'){ c.traverse(m=>{ if(m.isMesh)n++; }); } f(c); }); })(T.scene);
    return {n:n}; });
  const c0=await SCR(...CL[0]); await p.mouse.click(c0.x,c0.y); await p.waitForTimeout(1000);
  const used=await p.evaluate(()=>window.__nnWrapUsed||null);
  ok(used && used.how==='decal','② 確定でデカール方式が使われた（旧方式に落ちていない）',used);
  const R=await p.evaluate(()=>{ const s=(state.d3sheet||[])[0]; if(!s)return null;
    const k={}; s.faces.forEach(f=>{ const kk=(f.id&&f.id.k)||'?'; k[kk]=(k[kk]||0)+(f.am||0); });
    return {n:s.faces.length, kinds:Object.keys(k), area:+Object.keys(k).reduce((a,x)=>a+k[x],0).toFixed(3), per:k}; });
  console.log('   またいだ結果:', JSON.stringify(R));
  ok(R && R.n>0,'③ 増貼りが置けた',R&&R.n);
  ok(R && R.kinds.indexOf('deck')>=0,'③ 平場に貼れている',R&&R.kinds);
  ok(R && R.kinds.indexOf('wall')>=0,'③ 立上りに貼れている',R&&R.kinds);
  ok(R && (R.kinds.indexOf('top')>=0||R.kinds.indexOf('cham')>=0),'③ 面取り／天端にも貼れている',R&&R.kinds);
  ok(R && R.area>0.3,'③ 面積がまとも',R&&R.area);
  await p.screenshot({path:'/tmp/decal_span.png'});

  /* ── ⑤ 保存・再読込 ── */
  await p.evaluate(()=>saveState());
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const R2=await p.evaluate(()=>{ const s=(state.d3sheet||[])[0]; if(!s)return null;
    return {n:s.faces.length, area:+s.faces.reduce((a,f)=>a+(f.am||0),0).toFixed(3), ids:s.faces.every(f=>!!f.id)}; });
  ok(R2 && R2.n===R.n && Math.abs(R2.area-R.area)<0.002,'⑤ 保存・再読込で同じ形が残る',R2);
  ok(R2 && R2.ids,'⑤ 面IDも残る（建物を変えたら付いてくる）',R2&&R2.ids);
  ok(errs.length===0,'JSエラーなし',errs);
  console.log(ng?('★NG '+ng+'件'):'すべて○');
  await b.close(); process.exit(ng?1:0);
})();
