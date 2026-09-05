/* ★2026-09-06a 防水層を置く：①材料の検索欄で日本語入力（IME）が壊れない ②3D描画の点は画面上で一定の大きさ
   使い方: node _check/sheet2.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:850}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){} state.scaleM=1;
    const pts=[{x:0,y:0},{x:12,y:0},{x:12,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:600,w:400,k:'para'}))}];
    state.parts=[]; state.d3sol=[]; state.d3sheet=[]; state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} T.theta=-Math.PI/2+0.35; T.phi=0.8; T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(800);
  /* ① IME */
  await p.evaluate(()=>{ nnCond.open('sheet'); }); await p.waitForTimeout(300);
  const sq=await p.$('#nnCondBox input.sq[type=search]'); ok(!!sq,'検索欄がある');
  await sq.focus();
  const n0=await p.evaluate(()=>document.querySelectorAll('#nnCondBox .mrow').length);
  /* 日本語IMEの変換中を再現：compositionstart → 途中の文字で input → compositionend */
  const same=await p.evaluate(()=>{ const el=document.querySelector('#nnCondBox input.sq[type=search]'); window.__sq=el;
    el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    ['p','ぽ','ぽr','ぽり','ぽりm','ぽりま','ぽりまr','ぽりまり','ぽりまりt','ぽりまりっ','ぽりまりっt','ぽりまりっと','ポリマリット'].forEach(t=>{ el.value=t; el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true})); });
    const stillSame=(document.querySelector('#nnCondBox input.sq[type=search]')===el);
    const midVal=el.value;
    el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'ポリマリット'}));
    el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:false}));
    return {stillSame, midVal, after:document.querySelector('#nnCondBox input.sq[type=search]').value, same2:(document.querySelector('#nnCondBox input.sq[type=search]')===el),
      rows:document.querySelectorAll('#nnCondBox .mrow').length, focused:document.activeElement===el}; });
  ok(same.stillSame&&same.same2,'変換中に入力欄が作り直されない（同じ要素のまま）',same);
  ok(same.after==='ポリマリット','変換後の文字がそのまま残る',same.after);
  ok(same.rows<n0,'確定すると一覧が絞り込まれる',{before:n0,after:same.rows});
  ok(same.focused,'フォーカスが外れない');
  /* ふつうのタイプ（英字）でも絞り込まれ、欄は残る */
  await p.evaluate(()=>{ const el=document.querySelector('#nnCondBox input.sq[type=search]'); el.value=''; el.dispatchEvent(new InputEvent('input',{bubbles:true})); el.focus(); }); await p.keyboard.type('プライマー');
  const t2=await p.evaluate(()=>({v:document.querySelector('#nnCondBox input.sq[type=search]').value, rows:[...document.querySelectorAll('#nnCondBox .mrow')].map(r=>r.textContent)}));
  ok(t2.v==='プライマー'&&t2.rows.length>=1&&t2.rows.every(x=>/プライマー/.test(x)),'キーボードで打っても絞り込まれる',t2);
  /* ② 点の大きさ：寄っても離れても画面上で同じ（約5px） */
  await p.evaluate(()=>{ nnSheetStart({n:'ポリマリット25',col:'#3f3b36',src:'t'},'poly'); });
  const SCRW=(x,y,z)=>p.evaluate(([x,y,z])=>{ const el=T.renderer.domElement, r=el.getBoundingClientRect(); const q=new THREE.Vector3(x,y,z).project(T.camera); return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },[x,y,z]);
  const pxOf=()=>p.evaluate(()=>{ let out=[]; T.scene.traverse(o=>{ if(o.name==='nnPvDot'){ const r=o.geometry.parameters.radius; const d=T.camera.position.distanceTo(o.position); const H=T.renderer.domElement.clientHeight; const px=r/(d*Math.tan(T.camera.fov*Math.PI/360)*2)*H; out.push({r:+r.toFixed(4), px:+px.toFixed(1)}); } }); return out; });
  let c=await SCRW(6,0.03,4); await p.mouse.click(c.x,c.y); await p.waitForTimeout(300);
  const far=await pxOf();
  await p.evaluate(()=>{ nnD3DrawCancel(); T.r=Math.max(0.6,T.r*0.08); T.tx=6; T.tz=4; T.rev=(T.rev|0)+1; }); await p.waitForTimeout(500);
  c=await SCRW(6,0.03,4); await p.mouse.click(c.x,c.y); await p.waitForTimeout(300);
  const near=await pxOf();
  ok(far.length===1&&near.length===1,'点が1つずつ置ける',{far,near});
  ok(far[0]&&near[0]&&Math.abs(far[0].px-3)<1&&Math.abs(near[0].px-3)<1,'点は寄っても離れても画面上 約3px（実寸ではない）',{far,near});
  ok(near[0]&&near[0].r<far[0].r,'寄ったときは実寸が小さくなる',{far:far[0]&&far[0].r, near:near[0]&&near[0].r});
  /* ① 途中入力で候補：ひらがな途中「ぽりま」でも「ポリマリット」が候補に出る（変換中も一覧が動く） */
  const cand=await p.evaluate(()=>{ const el=document.querySelector('#nnCondBox input.sq[type=search]'); if(!el) return null;
    el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    el.value='ぽりま'; el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
    const rows=[...document.querySelectorAll('#nnCondBox .mrow')].map(r=>r.textContent);
    el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})); el.dispatchEvent(new InputEvent('input',{bubbles:true}));
    return {rows, same:document.querySelector('#nnCondBox input.sq[type=search]')===el}; });
  ok(cand&&cand.same&&cand.rows.length>=1&&cand.rows.every(r=>/ポリマリット/.test(r)),'変換の途中（ぽりま）でも「ポリマリット」の候補が出る',cand);
  const free=await p.evaluate(()=>{ const el=document.querySelector('#nnCondBox input.sq[type=search]'); el.value='ナントカ防水材X'; el.dispatchEvent(new InputEvent('input',{bubbles:true}));
    const r=document.querySelector('#nnCondBox .mrow[data-free]'); if(!r) return null; r.click(); return {txt:r.textContent, mode:window.nnSheetMode&&window.nnSheetMode.mat.n}; });
  ok(free&&free.mode==='ナントカ防水材X','見つからないときは「この名前で置く」が候補に出て、押すと置くモードに',free);
  /* ⑤ 札を出さない・④ 立上り→平場の貼りかけ・③ Shift */
  await p.evaluate(()=>{ nnD3DrawCancel(); state.d3sheet=[]; nnSheetStart({n:'ポリマリット25',col:'#3f3b36',src:'t'},'poly'); d3ViewIso(); T.theta=-Math.PI/2+0.35; T.phi=0.8; T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(500);
  /* 北の壁（y=8・内側の面 z=7.6・立上り600）に、平場より下まで伸びる四角をかく：壁の上 0.45 から下 -0.25（平場の下）まで */
  const W=(x,y,z)=>SCRW(x,y,z);
  const wallPts=[[7,0.45,7.58],[7.8,0.45,7.58],[7.8,0.30,7.58],[7,0.30,7.58]];
  for(const q of wallPts){ const c1=await W(...q); await p.mouse.click(c1.x,c1.y); await p.waitForTimeout(200); }
  /* 3点目・4点目を平場の下へ：面の座標で v<0 になる点は planePt が壁の平面上に返すので、点を直接足す */
  await p.evaluate(()=>{ const DSp=window.nnD3DS?nnD3DS():null; });
  const dbgW=await p.evaluate(()=>({mode:!!window.nnSheetMode, tool, on:nnD3DrawOn&&nnD3DrawOn(), dots:(()=>{let n=0;T.scene.traverse(o=>{if(o.name==='nnPvDot')n++;});return n;})()}));
  const c1=await W(7,0.45,7.58); await p.mouse.click(c1.x,c1.y); await p.waitForTimeout(500);
  if(process.env.DBG) console.log('DBGW',JSON.stringify(dbgW));
  const sh1=await p.evaluate(()=>{ const s=(state.d3sheet||[])[0]; let lab=0; T.group.traverse(o=>{ if(o.name==='nnSheetLab')lab++; }); return {n:(state.d3sheet||[]).length, faces:s&&s.faces.length, lab}; });
  ok(sh1.n===1&&sh1.lab===0,'置いても大きな材料名の札は出ない',sh1);
  /* 貼りかけ：壁の面（v=上）で v が平場より下の点を含む形を nnSheetCommit に渡す → 2面に折れる */
  const fold=await p.evaluate(()=>{ state.d3sheet=[]; window.nnSheetMode={mat:{n:'増し張り',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
    /* 壁の内側の面：p0 は平場から0.3上、n は屋根側（-z）、u=x、v=上 */
    const face={p:[7,0.312,7.6], n:[0,0,-1], u:[1,0,0], v:[0,1,0], pts:[[0,0.2],[1,0.2],[1,-0.45],[0,-0.45]]};   /* 下端は平場より 0.15 下 */
    nnSheetCommit(face); const s=state.d3sheet[0];
    /* ★2026-09-06e 巻く順（平場→立上り→…）になったので、番号ではなく
       「上向きの面」を探して確かめる（§297） */
    const fd=s.faces.find(f=>Math.abs(f.n[1]-1)<0.01);
    /* 折れた面（上向き）の世界の角を出して確かめる（向きの決め方に左右されない見方） */
    let ys=[], zs=[];
    if(fd) fd.pts.forEach(q=>{ ys.push(fd.p[1]+fd.u[1]*q[0]+fd.v[1]*q[1]);
                               zs.push(fd.p[2]+fd.u[2]*q[0]+fd.v[2]*q[1]); });
    return {faces:s.faces.length, fold:s.fold, area:+nnSheetArea(s).toFixed(3),
      up:!!fd, y:fd?+Math.max.apply(null,ys).toFixed(3):null,
      z0:fd?+Math.min.apply(null,zs).toFixed(3):null, z1:fd?+Math.max.apply(null,zs).toFixed(3):null}; });
  ok(fold.faces===2&&fold.fold===1,'立上りにかいた形が平場より下まで伸びると、平場への貼りかけ（2面）に折れる',fold);
  ok(fold.up&&Math.abs(fold.y)<0.02,'折れた面は上向きで、平場の高さにある',{y:fold.y});
  ok(fold.z1<=7.61&&fold.z1>=7.55&&Math.abs(fold.z1-fold.z0-0.138)<0.02,'折れた面は壁ぎわ（z=7.6）から屋根の中へ0.138m',{z0:fold.z0,z1:fold.z1});
  ok(Math.abs(fold.area-0.65)<0.01,'面積は合計のまま（1×0.5＋1×0.15＝0.65㎡）',fold.area);
  /* ③ Shift：直前の点から斜めに狙っても、壁に平行（横）へそろう */
  const sn=await p.evaluate(()=>{ window._nnShift=true; const r=shiftSnapTest(); window._nnShift=false; return r; }).catch(()=>null);
  ok(sn===null||sn.ok,'（Shiftの検算は下の実打で）');
  await p.evaluate(()=>{ nnD3DrawCancel(); state.d3sheet=[]; nnSheetStart({n:'ポリマリット25',col:'#3f3b36',src:'t'},'poly'); });
  const a1=await W(3,0.03,3); await p.mouse.click(a1.x,a1.y); await p.waitForTimeout(200);
  await p.keyboard.down('Shift'); const a2=await W(5,0.03,3.6); await p.mouse.click(a2.x,a2.y); await p.keyboard.up('Shift'); await p.waitForTimeout(300);
  const pts2=await p.evaluate(()=>{ const P=[]; T.scene.traverse(o=>{ if(o.name==='nnPvDot') P.push([+o.position.x.toFixed(2),+o.position.z.toFixed(2)]); }); return P; });
  ok(pts2.length===2&&Math.abs(pts2[1][1]-pts2[0][1])<0.03&&Math.abs(pts2[1][0]-pts2[0][0])>1.5,'Shift＋タップ＝直前の点から壁に平行（真横）にそろう',pts2);
  ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
  await b.close();
  console.log(ng?('★NG '+ng+'件'):'すべて○');
})().catch(e=>{ console.error(e); process.exit(1); });
