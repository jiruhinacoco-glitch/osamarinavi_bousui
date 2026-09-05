/* ★2026-09-05i すべての面を編集対象に／材料を選んで防水層を置く（§291）
   ①天端内側の面取り（テーパー面）を選べる・ドラッグで大きさが変わる・保存される
   ②役物（箱・鳩小屋）の面をつかんで押す＝その面だけ動く（it.sz）・その面にかける
   ③材料を選んで 面にかく→貼り物／入隅の2面に増し張り／選ぶ・消す・積算・保存・戻る
   使い方: node _check/face2.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:850}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:12,y:0},{x:12,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:600,w:400,k:'para'}))}];
    state.parts=[]; state.d3sol=[]; state.d3sheet=[];
    state.active=0; saveState(); setTab('d3');
  });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} T.theta=-Math.PI/2+0.35; T.phi=0.8; T.rev=(T.rev|0)+1; });  /* 屋根の内側・上から見る（面取りは内側の面） */
  await p.waitForTimeout(900);
  await p.evaluate(()=>setTool('sel'));
  const CAM=()=>p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4)));
  const cam0=await CAM();
  const SCRW=(x,y,z)=>p.evaluate(([x,y,z])=>{ const el=T.renderer.domElement, r=el.getBoundingClientRect();
      const q=new THREE.Vector3(x,y,z).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },[x,y,z]);

  /* ---------- ① 面取り（辺2＝北側 y=8。内向き法線は -z） ---------- */
  const chamBox=await p.evaluate(()=>{ let out=null; T.scene.traverse(o=>{ if(!out&&o.userData&&o.userData.pick&&o.userData.pick.f==='cham'&&o.userData.pick.e===2){ o.updateMatrixWorld(true); const c=new THREE.Vector3(); o.getWorldPosition(c); out=c.toArray(); } }); return out; });
  ok(!!chamBox,'面取り（テーパー面）の当たり判定がある',chamBox);
  let c=await SCRW(...chamBox);
  await p.mouse.click(c.x,c.y); await p.waitForTimeout(500);
  const s1=await p.evaluate(()=>sel&&{p:sel.p,e:sel.e,f:sel.f});
  ok(s1&&s1.f==='cham'&&s1.e===2,'クリックで面取りの面が選ばれる',s1);
  ok(await p.evaluate(()=>{ let n=0; T.scene.traverse(o=>{ if(o.userData&&o.userData.face==='cham')n++; }); return n; })===1,'面取りが赤くハイライトされる（板1枚）');
  /* ドラッグ：斜面の法線（内向き＋上）の反対＝内へ押す → 面取りが大きくなる */
  const hl=await p.evaluate(()=>{ let out=null; T.scene.traverse(o=>{ if(!out&&o.userData&&o.userData.face==='cham'){ const c=new THREE.Vector3(); o.getWorldPosition(c); out=c.toArray(); } }); return out; });
  ok(!!hl,'ハイライトの位置が取れる'); if(!hl){ await b.close(); console.log('★NG 中断'); process.exit(1); }
  c=await SCRW(...hl);
  const nS=[0,1,-1].map(v=>v/Math.SQRT2);                      /* 斜面の法線 */
  const c2=await SCRW(hl[0]+nS[0]*0.3, hl[1]+nS[1]*0.3, hl[2]+nS[2]*0.3);
  const dxu=(c2.x-c.x), dyu=(c2.y-c.y), L=Math.hypot(dxu,dyu);
  await p.mouse.move(c.x,c.y); await p.mouse.down();
  for(let i=1;i<=10;i++){ await p.mouse.move(c.x-dxu/L*8*i, c.y-dyu/L*8*i); await p.waitForTimeout(25); }  /* 内へ80px */
  await p.mouse.up(); await p.waitForTimeout(700);
  const ch1=await p.evaluate(()=>state.polys[0].edges[2].ch);
  ok(ch1>20 && ch1<=270,'内へ押すと面取りが大きくなる（既定20mm→）',ch1);
  ok(await p.evaluate(()=>state.polys[0].edges[1].ch==null && state.polys[0].edges[3].ch==null),'隣の辺の面取りは変わらない');
  /* 3D：面取りの斜面がその大きさで組まれている（内側の面の上端から CH だけ下の高さで、内へ光線） */
  const geo=await p.evaluate((ch)=>{ T.group.updateMatrixWorld(true); const rc=new THREE.Raycaster();
    const objs=[]; T.group.traverse(o=>{ if(o.isMesh&&o.visible&&!(o.userData&&o.userData.pick))objs.push(o); });
    const CH=ch/1000; /* 壁の内面は y=8-0.4 (th=W=0.4)。天端 y=0.6。斜面の中点＝(z=8-0.4+CH/2, y=0.6-CH/2) */
    rc.set(new THREE.Vector3(6, 0.6-CH/2, 8-0.4-0.3), new THREE.Vector3(0,0,1)); rc.far=1;
    const h=rc.intersectObjects(objs,false); return h.length?+(h[0].point.z).toFixed(4):null; },ch1);
  ok(geo!=null && Math.abs(geo-(8-0.4+ch1/2000))<0.01,'3Dの斜面が新しい面取りの位置にある',{hit:geo,want:8-0.4+ch1/2000});
  ok(JSON.stringify(await CAM())===JSON.stringify(cam0),'面取りをドラッグしてもカメラは動かない');
  await p.evaluate(()=>{ saveState(); }); await p.reload({waitUntil:'load'}); await p.waitForTimeout(1300);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  ok(await p.evaluate(()=>state.polys[0].edges[2].ch)===ch1,'面取りは保存して開き直しても残る（normE）');

  /* ---------- ② 役物の面 ---------- */
  await p.evaluate(()=>{ setTab('d3'); });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} T.theta=-Math.PI/2+0.35; T.phi=0.8; T.rev=(T.rev|0)+1; });  /* 屋根の内側・上から見る（面取りは内側の面） */
  await p.waitForTimeout(600);
  await p.evaluate(()=>{ try{ nnSetsubiPanel(); }catch(_){} nnStamp('hatogoya'); nnPlaceAtGrid(4,4); try{ setTool('sel'); }catch(_){} dirty3d=true; build3D(); });
  await p.waitForTimeout(1200);
  await p.waitForFunction(()=>{ try{ return !!T.renderer.domElement._nnFaceDrag; }catch(_){ return false; } },{timeout:8000});  /* 面ドラッグの配線（2.5秒ごと）を待つ */
  const cam1=await CAM();
  const box=await p.evaluate(()=>{ let o=null; T.group.children.forEach(m=>{ if(m.name==='nnPart')o=m; }); if(!o) return null;
    o.updateMatrixWorld(true); const g=o.geometry.parameters; return {pos:o.position.toArray(), w:g.width, d:g.depth, h:g.height, vis:o.visible}; });
  ok(!!box,'鳩小屋を置いた（箱＝当たり判定）',box);
  const D0=await p.evaluate(()=>{ const it=state.parts[0], P=nnPartsLib().find(x=>x.id===it.p); return {x:it.x,y:it.y,sz:it.sz,w:P.w,d:P.d,h:P.h}; });
  if(process.env.DBG){ await p.evaluate(()=>{ const f=window.nnPartFaceTry; window.nnPartFaceTry=function(e){ const r=f(e); console.log('DBG try',r,e.pointerId,e.type,tool); return r; };
    T.renderer.domElement.addEventListener('pointerdown',e=>console.log('DBG el pd tool='+tool+' wired='+!!T.renderer.domElement._nnFaceDrag),true); });
    p.on('console',m=>{ if(/DBG/.test(m.text()))console.log(m.text()); }); }
  /* +x の面（東）をつかんで東へ40px */
  const cf=await SCRW(box.pos[0]+box.w/2, box.pos[1], box.pos[2]);
  if(process.env.DBG) console.log('DBG efp', await p.evaluate((cf)=>{ const e=document.elementFromPoint(cf.x,cf.y); return e&&(e.id||e.tagName+'.'+e.className); },cf), cf);
  const cf2=await SCRW(box.pos[0]+box.w/2+0.5, box.pos[1], box.pos[2]);
  const ex=cf2.x-cf.x, ey=cf2.y-cf.y, eL=Math.hypot(ex,ey);
  await p.mouse.move(cf.x,cf.y); await p.mouse.down();
  for(let i=1;i<=8;i++){ await p.mouse.move(cf.x+ex/eL*8*i, cf.y+ey/eL*8*i); await p.waitForTimeout(25); }
  await p.mouse.up(); await p.waitForTimeout(800);
  const D1=await p.evaluate(()=>{ const it=state.parts[0]; return {x:it.x,y:it.y,sz:it.sz}; });
  ok(D1.sz&&D1.sz.w>D0.w,'役物の東の面を引くと よこ（w）だけ大きくなる',{before:D0.w, after:D1.sz&&D1.sz.w});
  ok(D1.sz&&D1.sz.h==null&&D1.sz.d==null,'奥行き・高さは変わらない',D1.sz);
  const dw=((D1.sz&&D1.sz.w)||D0.w)-D0.w;
  ok(Math.abs((D1.x-D0.x)*1000 - dw/2)<30,'反対の面（西）は動かない＝中心が半分だけ東へ',{dxmm:(D1.x-D0.x)*1000, dw});
  const box2=await p.evaluate(()=>{ let o=null; T.group.children.forEach(m=>{ if(m.name==='nnPart')o=m; }); return o&&{w:o.geometry.parameters.width}; });
  ok(box2&&Math.abs(box2.w*1000-((D1.sz&&D1.sz.w)||0))<1,'3Dの箱の幅も新しい寸法',box2);
  ok(JSON.stringify(await CAM())===JSON.stringify(cam1),'役物の面を押してもカメラは動かない');
  /* 鳩小屋の絵（リッチモデル）の面にかける：faceHit が役物の面を返す */
  const fh=await p.evaluate((pos)=>{ const rc=new THREE.Raycaster(); rc.set(new THREE.Vector3(pos[0],pos[1]+3,pos[2]), new THREE.Vector3(0,-1,0));
    const h=nnD3FaceHit(rc); if(!h) return null; let oo=h.o; while(oo&&(!oo.userData||oo.userData.partIdx==null)&&oo.parent)oo=oo.parent;
    return {ny:+h.n.y.toFixed(2), part:!!(oo&&oo.userData&&oo.userData.partIdx!=null), y:+h.point.y.toFixed(2)}; },box.pos);
  ok(fh&&fh.part&&fh.ny>0.9,'役物（鳩小屋）の上の面に「かく」ことができる（faceHit が役物の面を返す）',fh);
  await p.evaluate(()=>{ state.parts=[]; saveState(); dirty3d=true; build3D(); });
  await p.waitForTimeout(500);

  /* ---------- ③ 防水層を置く ---------- */
  ok(await p.evaluate(()=>!!document.querySelector('#nnCondBar [data-cond="sheet"]')),'3Dで「🧱 防水層を置く」の入口が出る');
  const mats=await p.evaluate(()=>nnSheetMats());
  ok(mats.length>=3 && mats.some(m=>/仕様|工程/.test(m.g)),'材料の一覧に この現場の仕様の工程が並ぶ',mats.slice(0,3).map(m=>m.g+':'+m.n));
  await p.evaluate(()=>{ nnCond.open('sheet'); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(()=>document.querySelectorAll('#nnCondBox .mrow').length)===mats.length,'小窓に材料が全部並ぶ');
  await p.evaluate(()=>{ document.querySelector('#nnCondBox .mrow').click(); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!!window.nnSheetMode && tool==='draw' && tab==='d3'),'材料を選ぶと3Dの「面にかく」モードに');
  /* 平場に四角をかく（3.5m×2m） */
  await p.evaluate(()=>{ nnSheetStart({n:'ポリマリット25',col:'#3f3b36',src:'test'},'poly'); });
  const q=[[2,2],[5.5,2],[5.5,4],[2,4]];
  for(const [gx,gz] of q){ const cc=await SCRW(gx,0.03,gz); await p.mouse.click(cc.x,cc.y); await p.waitForTimeout(180); }
  const cc0=await SCRW(2,0.03,2); await p.mouse.click(cc0.x,cc0.y); await p.waitForTimeout(900);
  const sh=await p.evaluate(()=>({n:(state.d3sheet||[]).length, s:state.d3sheet[0], polys:state.polys.length, sol:(state.d3sol||[]).length,
     mesh:(()=>{let n=0;T.group.traverse(o=>{if(o.name==='nnSheet')n++;});return n;})(), lab:(()=>{let n=0;T.group.traverse(o=>{if(o.name==='nnSheetLab')n++;});return n;})(),
     area:nnSheetArea(state.d3sheet[0]||{faces:[]})}));
  ok(sh.n===1&&sh.s&&sh.s.m.n==='ポリマリット25','閉じると「ポリマリット25」の層が1枚できる',sh.s&&sh.s.m);
  ok(sh.polys===1&&sh.sol===0,'部位にも立体にもならない（貼り物）',{polys:sh.polys,sol:sh.sol});
  ok(Math.abs(sh.area-7)<0.3,'面積は形どおり（3.5×2＝7㎡）',sh.area);
  ok(sh.mesh===1&&sh.lab===1,'3Dに板1枚と材料名の札',{mesh:sh.mesh,lab:sh.lab});
  ok(await p.evaluate(()=>!!window.nnSheetMode),'置いたあとも続けてかける（モードは残る）');
  /* 入隅の増し張り：平場（南の壁ぎわ）→ 南の壁の内側の面 */
  await p.evaluate(()=>{ nnSheetStart({n:'増し張り用ポリマリット',col:'#3f3b36',src:'test'},'corner'); window.nnSheetMode.w=400; window.nnSheetMode.d=200; });
  /* 北の壁（y=8）の内側の面はカメラ（南側）から見える */
  const k1=await SCRW(8,0.03,7.1); await p.mouse.click(k1.x,k1.y); await p.waitForTimeout(300);
  const k2=await SCRW(8,0.25,8-0.4-0.02); await p.mouse.click(k2.x,k2.y); await p.waitForTimeout(900);
  const cn=await p.evaluate(()=>{ const s=(state.d3sheet||[])[1]; if(!s) return null;
    const fa=s.faces[0], fb=s.faces[1]; const dot=fa&&fb? fa.n[0]*fb.n[0]+fa.n[1]*fb.n[1]+fa.n[2]*fb.n[2] : 9;
    return {n:state.d3sheet.length, faces:s.faces.length, corner:s.corner, dot:+dot.toFixed(2), area:+nnSheetArea(s).toFixed(3),
      pA:fa&&fa.p.map(v=>+v.toFixed(2))}; });
  ok(cn&&cn.faces===2&&cn.corner===1,'角をなす2面を続けてタップ＝入隅の増し張り（2面）',cn);
  ok(cn&&Math.abs(cn.dot)<0.2,'2面の向きは直角',cn&&cn.dot);
  ok(cn&&Math.abs(cn.area-0.16)<0.01,'面積＝幅400×出200×2面＝0.16㎡',cn&&cn.area);
  ok(cn&&Math.abs(cn.pA[2]-7.6)<0.05&&Math.abs(cn.pA[1]-0)<0.05,'角の線（壁の内面×平場）の上に置かれる',cn&&cn.pA);
  ok(JSON.stringify(await CAM())===JSON.stringify(cam1),'貼り物を置いてもカメラは動かない');
  /* 積算 */
  const qt=await p.evaluate(()=>{ recalc(); const t=document.getElementById('nnSheetQt'); return t?t.textContent:''; });
  ok(/ポリマリット25/.test(qt)&&/7\.00/.test(qt)&&/増し張り用/.test(qt),'積算に材料ごとの面積・枚数が出る');
  /* 選ぶ・消す */
  await p.evaluate(()=>{ nnSheetStop(); setTool('sel'); });
  const cs=await SCRW(3.75,0.02,3); await p.mouse.click(cs.x,cs.y); await p.waitForTimeout(600);
  ok(await p.evaluate(()=>nnSheetSelIdx())===0,'「選択」で層をタップすると選べる');
  await p.keyboard.press('Delete'); await p.waitForTimeout(600);
  ok(await p.evaluate(()=>(state.d3sheet||[]).length)===1,'Deleteで選んだ層が消える');
  /* 戻る・保存 */
  await p.evaluate(()=>undoStep()); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>(state.d3sheet||[]).length)===2,'↩戻る で消した層が戻る（履歴に入っている）');
  await p.evaluate(()=>saveState()); await p.reload({waitUntil:'load'}); await p.waitForTimeout(1300);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  ok(await p.evaluate(()=>(state.d3sheet||[]).length===2 && state.d3sheet[1].faces.length===2),'保存して開き直しても層が残る');
  /* ---------- ④ 3Dでかいた立体の「横の面」もつかんで動く ---------- */
  await p.evaluate(()=>{ setTab('d3'); });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} T.theta=-Math.PI/2+0.35; T.phi=0.8; T.rev=(T.rev|0)+1;
    state.d3sheet=[]; state.d3sol=[{p:[0,0.012,0],n:[0,1,0],u:[1,0,0],v:[0,0,1],a:[6,2],b:[8,3.5],d:0.6,mode:'out',shape:'box'}];
    saveState(); nnSolRender(); setTool('sel'); });
  await p.waitForTimeout(900);
  await p.waitForFunction(()=>{ try{ return !!T.renderer.domElement._nnFaceDrag; }catch(_){ return false; } },{timeout:8000});
  const cam2=await CAM();
  /* -z の面（南・カメラ側）の中心をつかんで南へ */
  const sf=await SCRW(7,0.012+0.3,2), sf2=await SCRW(7,0.012+0.3,1.5);
  const svx=sf2.x-sf.x, svy=sf2.y-sf.y, svL=Math.hypot(svx,svy);
  await p.mouse.move(sf.x,sf.y); await p.mouse.down();
  for(let i=1;i<=8;i++){ await p.mouse.move(sf.x+svx/svL*6*i, sf.y+svy/svL*6*i); await p.waitForTimeout(25); }
  await p.mouse.up(); await p.waitForTimeout(700);
  const so=await p.evaluate(()=>{ const it=state.d3sol[0]; return {a:it.a.map(v=>+v.toFixed(3)), b:it.b.map(v=>+v.toFixed(3)), d:it.d}; });
  ok(so.a[1]<2-0.05 && so.b[1]===3.5 && so.a[0]===6 && so.b[0]===8 && so.d===0.6,'立体の横の面（南）をつかんで引くと、その面だけ南へ動く（反対の面・奥行きは不変）',so);
  ok(JSON.stringify(await CAM())===JSON.stringify(cam2),'立体の横の面を動かしてもカメラは動かない');
  await p.evaluate(()=>undoStep()); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>state.d3sol[0].a[1]===2),'↩戻る で横の面が元に戻る');

  /* 壊れた保存でも落ちない */
  await p.evaluate(()=>{ const o=JSON.parse(localStorage.getItem('nn_zumen_v1')); o.d3sheet=[null, 5, {faces:'x'}, {faces:[{p:[0,0],n:[0,1,0],u:[1,0,0],v:[0,0,1],pts:[[0,0],[1,0],[1,1]]}]}]; localStorage.setItem('nn_zumen_v1',JSON.stringify(o)); });
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1300);
  ok(await p.evaluate(()=>Array.isArray(state.d3sheet)&&state.d3sheet.length===0),'壊れた貼り物の保存は捨てる（開ける）');
  ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
  await b.close();
  console.log(ng?('★NG '+ng+'件'):'すべて○');
})().catch(e=>{ console.error(e); process.exit(1); });
