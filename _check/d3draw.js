/* ★2026-08-23a 3D直接編集（描画→押出し/引込み・立体の選択/削除・スタンプのゴースト）（§153）
   node _check/d3draw.js
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
const CAM=`(()=>({th:+T.theta.toFixed(4),ph:+T.phi.toFixed(4),r:+T.r.toFixed(3),tx:+T.tx.toFixed(3),tz:+T.tz.toFixed(3)}))()`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/* 世界座標 → 画面座標（クリックする場所を決める） */
const SCR=`(wx,wy,wz)=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=new THREE.Vector3(wx,wy,wz).project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
}`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(700);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);
await p.evaluate(()=>d3ViewIso()); await p.waitForTimeout(900);

/* ① 描画ツールにしても3Dから弾き出されない */
await p.evaluate(()=>setTool('draw')); await p.waitForTimeout(300);
ok(await p.evaluate(()=>tab==='d3'&&tool==='draw'),'「描画」を押しても3Dのまま',
   await p.evaluate(()=>tab+'/'+tool));

/* ② 平場：★2026-08-29n 1点目から「自由な形」。閉じたらそのまま部位（屋根の区画）になり、
   平面図・積算にも入る（本人の指示・添付1〜4。長方形限定＋カードは廃止） */
const cam0=await p.evaluate(CAM);
const nPoly0=await p.evaluate(()=>state.polys.length);
/* ★サンプルは多層（lv 6/9/12）。決め打ちの座標は壁・天端に当たるので、
   壁の走査（④）と同じく「画面から平場に見えている画素」を実際に探す */
const deckPts=await p.evaluate(()=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const sM=state.scaleM||0.5, found=[];
  for(let yy=0.28; yy<0.95; yy+=0.03){
    for(let xx=0.05; xx<0.95; xx+=0.03){
      const v=new THREE.Vector2(xx*2-1, -(yy*2-1));
      const rc=new THREE.Raycaster(); rc.setFromCamera(v,T.camera);
      const hits=rc.intersectObjects([T.group],true)||[];
      const h=hits.find(h2=>h2.face&&!(h2.object.userData&&h2.object.userData.pick)
        &&!(h2.object.material&&h2.object.material.transparent&&h2.object.material.opacity<0.1)
        &&h2.object.name!=='nnSolLab');
      if(!h)continue;
      const n=h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
      if(n.dot(rc.ray.direction)>0)n.negate();
      if(n.y<0.95)continue;
      const gx=h.point.x/sM, gy=h.point.z/sM;
      let pi=-1, bl=-1e9;
      state.polys.forEach((pp,i2)=>{ const lv=+pp.lv||0;
        if(lv<=h.point.y+0.06&&lv>h.point.y-0.20&&pointInPoly(pp.pts,gx,gy)&&lv>bl){pi=i2;bl=lv;} });
      if(pi<0)continue;
      found.push({x:r.left+xx*r.width, y:r.top+yy*r.height, pi, lv:bl, gx, gy});
    }
  }
  const by={}; found.forEach(f=>{ (by[f.pi]=by[f.pi]||[]).push(f); });
  let bp=-1, bn=0; for(const k in by){ if(by[k].length>bn){ bn=by[k].length; bp=k; } }
  const arr=by[bp]||[]; if(!arr.length)return null;
  const pick=[arr[0]];
  for(const f of arr){ if(pick.length>=3)break;
    if(!pick.every(g=>Math.hypot(f.gx-g.gx,f.gy-g.gy)>0.9))continue;
    if(pick.length===2){                       /* 3点目は一直線を避ける */
      const a=pick[0], b2=pick[1];
      const cr=(b2.gx-a.gx)*(f.gy-a.gy)-(b2.gy-a.gy)*(f.gx-a.gx);
      if(Math.abs(cr)<0.4)continue;
    }
    pick.push(f);
  }
  return pick.length>=3?{pts:pick, lv:+arr[0].lv}:null;
});
ok(!!deckPts,'平場の画素が画面内に見つかる', deckPts&&{lv:deckPts.lv});
const c1=deckPts.pts[0], c2=deckPts.pts[1];
await p.mouse.click(c1.x,c1.y); await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!(window.nnD3DrawOn&&nnD3DrawOn())),'1点目で面が決まる（描画中になる）');
await p.mouse.move((c1.x+c2.x)/2,(c1.y+c2.y)/2,{steps:4}); await p.waitForTimeout(200);
ok(await p.evaluate(()=>{const d=document.getElementById('nnD3Lab');
   return d&&d.style.display==='block'&&/m/.test(d.textContent);}),'赤い点線に寸法の札がついてくる',
   await p.evaluate(()=>{const d=document.getElementById('nnD3Lab');return d?d.textContent:'';}));
await p.mouse.click(c2.x,c2.y); await p.waitForTimeout(300);
ok(await p.evaluate(()=>/自由な形/.test((document.querySelector('#nnD3Card .tt')||{}).textContent||'')),
   '2点目は点が増える（長方形カードは出ない）');
const c2b=deckPts.pts[2];
await p.mouse.click(c2b.x,c2b.y); await p.waitForTimeout(300);
/* 始点（1つ目の赤い点）をタップ＝閉じる */
const cl1=await p.evaluate(()=>{
  let m=null; T.scene.traverse(o=>{ if(!m&&o.name==='nnPvDot')m=o; });
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=m.position.clone().project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
});
await p.mouse.click(cl1.x,cl1.y); await p.waitForTimeout(700);
const deckMade=await p.evaluate(()=>{
  const pp=state.polys[state.polys.length-1];
  return {n:state.polys.length, lv:pp&&pp.lv, free:pp&&pp.edges.every(e=>(e.k||'para')==='free'),
          sol:(state.d3sol||[]).length,
          card:document.getElementById('nnD3Card').classList.contains('on')};
});
ok(deckMade.n===nPoly0+1,'閉じるとそのまま部位（屋根の区画）になる',deckMade.n);
ok(Math.abs(deckMade.lv-(deckPts.lv+0.3))<0.01,'高さ＝その屋根＋300mm（面のドラッグ・屋根の表で変更可）',deckMade.lv);
ok(deckMade.free,'辺は立上りなし（基礎・かさ上げの形）');
ok(deckMade.sol===0&&!deckMade.card,'カードは出ない・立体（d3sol）ではなく部位になる',JSON.stringify(deckMade));
ok(same(await p.evaluate(CAM),cam0),'かいてもカメラは動かない（§152の決まり）');
await p.evaluate(()=>{ state.polys.pop(); state.active=0; saveState(); renderPolyList(); dirty3d=true; build3D(); });
await p.waitForTimeout(600);

/* ④ 立上りの側面（たての面）にもかける：画面を走査して壁の面を実際に見つけてタップする */
const wallPt=await p.evaluate(()=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  T.group.updateMatrixWorld(true);
  for(let yy=0.25; yy<0.9; yy+=0.05){
    for(let xx=0.1; xx<0.9; xx+=0.04){
      const v=new THREE.Vector2(xx*2-1, -(yy*2-1));
      const rc=new THREE.Raycaster(); rc.setFromCamera(v,T.camera);
      const hits=rc.intersectObjects([T.group],true)||[];
      for(const h of hits){
        if(!h.face)continue;
        const o=h.object; if(o.userData&&o.userData.pick)continue;
        if(o.material&&o.material.transparent&&o.material.opacity<0.1)continue;
        const n=h.face.normal.clone().transformDirection(o.matrixWorld);
        if(Math.abs(n.y)<0.25 && h.point.y>0.05){    /* たての面（壁・立上り） */
          return {x:r.left+xx*r.width, y:r.top+yy*r.height, ny:+n.y.toFixed(2)};
        }
        break;                                        /* 手前が別の面ならこの画素はあきらめる */
      }
    }
  }
  return null;
});
ok(!!wallPt,'たての面（立上り側面）が画面内に見つかる',wallPt);
if(wallPt){
  await p.mouse.click(wallPt.x,wallPt.y); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>!!(window.nnD3DrawOn&&nnD3DrawOn())),'壁の面にも1点目が打てる');
  /* 2点目＝1点目（赤い点）から少し画面をずらした場所（同じ壁の中に収まる近似） */
  const p2=await p.evaluate(()=>{
    /* かき始めの点（赤い点）から、面のよこへ0.6m・たてへ-0.15m の世界座標を作って投影 */
    let dotM=null; T.scene.traverse(o=>{ if(o.name==='nnPvDot')dotM=o; });
    if(!dotM)return null;
    const el=T.renderer.domElement, r=el.getBoundingClientRect();
    /* 面のよこ向き＝世界の上×法線。法線はもう一度その点で当て直すのは大変なので、
       赤い点から上0.12m・カメラ右向き0.5m ずらした画面位置で近似（同じ壁の中に収まる） */
    const q=dotM.position.clone().project(T.camera);
    return {x:r.left+(q.x*0.5+0.5)*r.width+46, y:r.top+(-q.y*0.5+0.5)*r.height-14};
  });
  await p.mouse.click(p2.x,p2.y); await p.waitForTimeout(300);
  await p.mouse.click(p2.x-8,p2.y+16); await p.waitForTimeout(300);   /* 3点目（同じ壁の中） */
  /* 始点（最初の赤い点）をタップ＝閉じる → 壁の面はカード（押出し・引込み）が出る */
  const wcl=await p.evaluate(()=>{
    let m=null; T.scene.traverse(o=>{ if(!m&&o.name==='nnPvDot')m=o; });
    if(!m)return null;
    const el=T.renderer.domElement, r=el.getBoundingClientRect();
    const q=m.position.clone().project(T.camera);
    return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
  });
  await p.mouse.click(wcl.x,wcl.y); await p.waitForTimeout(400);
  const rectOn=await p.evaluate(()=>{
    const c=document.getElementById('nnD3Card');
    return c.classList.contains('on')&&/押出し/.test(c.innerHTML);
  });
  ok(rectOn,'壁の面は閉じるとカード（押出し・引込み）が出る');
  if(rectOn){
    await p.click('#nnD3Card button.pr'); await p.waitForTimeout(300);
    await p.evaluate(()=>{document.querySelector('#nnNumDlg input').value='300';
      document.querySelector('#nnNumDlg .okb').click();});
    await p.waitForTimeout(600);
    const last=await p.evaluate(()=>{const a=state.d3sol||[]; return a.length?a[a.length-1]:null;});
    ok(last && Math.abs(last.n[1])<0.25,'壁からよこ向きに押し出される（法線がよこ）',last&&last.n.map(v=>+v.toFixed(2)));
  } else { await p.evaluate(()=>nnD3DrawCancel()); }
}

/* ⑤ 引込みも作れる（★2026-08-29n 平場は部位になるので、立体の面＝壁の立体の上でかく） */
const solTop=await p.evaluate(()=>{
  const a=state.d3sol||[]; if(!a.length)return null;
  const it=a[0];
  const u=new THREE.Vector3().fromArray(it.u), v=new THREE.Vector3().fromArray(it.v),
        n=new THREE.Vector3().fromArray(it.n), p0=new THREE.Vector3().fromArray(it.p);
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  /* 立体の手前の面（押し出した先の面）の中に4点＋始点を投影して返す */
  const mid=[(it.a[0]+it.b[0])/2,(it.a[1]+it.b[1])/2];
  const w=Math.abs(it.b[0]-it.a[0]), h=Math.abs(it.b[1]-it.a[1]);
  const off=[[-.2,-.2],[.2,-.2],[.2,.2],[-.2,.2]].map(q=>[mid[0]+q[0]*w, mid[1]+q[1]*h]);
  return off.map(q=>{
    const c=new THREE.Vector3().copy(p0).addScaledVector(u,q[0]).addScaledVector(v,q[1]).addScaledVector(n,it.d+0.002);
    const s2=c.project(T.camera);
    return {x:r.left+(s2.x*0.5+0.5)*r.width, y:r.top+(-s2.y*0.5+0.5)*r.height};
  });
});
if(solTop){
  for(const q of solTop){ await p.mouse.click(q.x,q.y); await p.waitForTimeout(200); }
  await p.mouse.click(solTop[0].x,solTop[0].y); await p.waitForTimeout(400);   /* 始点で閉じる */
  await p.click('#nnD3Card button.in'); await p.waitForTimeout(400);
  await p.evaluate(()=>{document.querySelector('#nnNumDlg input').value='250';
    document.querySelector('#nnNumDlg .okb').click();});
  await p.waitForTimeout(600);
}
ok(await p.evaluate(()=>(state.d3sol||[]).length)===2,'引込みも作れる（立体の面の上・計2件）',
   await p.evaluate(()=>(state.d3sol||[]).length));
ok(await p.evaluate(()=>{const a=state.d3sol||[]; return a[1]&&a[1].mode==='in';}),'2件目は引込み');

/* ⑥ 選択ツールでタップ → 選べる → 🗑で消える */
await p.evaluate(()=>setTool('sel')); await p.waitForTimeout(300);
const s0=await p.evaluate(()=>{
  const it=state.d3sol[0];
  const u=new THREE.Vector3().fromArray(it.u), v=new THREE.Vector3().fromArray(it.v),
        n=new THREE.Vector3().fromArray(it.n), p0=new THREE.Vector3().fromArray(it.p);
  /* ★中心は⑤で積み重ねた立体にふさがれているので、少し外し（+0.4/-0.4）を狙う */
  const w=it.b[0]-it.a[0], h2=it.b[1]-it.a[1];
  const c=new THREE.Vector3().copy(p0)
    .addScaledVector(u,(it.a[0]+it.b[0])/2+w*0.4).addScaledVector(v,(it.a[1]+it.b[1])/2-h2*0.4)
    .addScaledVector(n,it.d+0.001);
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=c.project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
});
await p.mouse.click(s0.x,s0.y); await p.waitForTimeout(400);
ok(await p.evaluate(()=>nnSolSelIdx())===0,'選択ツールでタップすると選べる',
   await p.evaluate(()=>nnSolSelIdx()));
ok(await p.evaluate(()=>/押出し/.test(document.querySelector('#nnD3Card .tt').textContent)),'カードに押出しの寸法が出る');
await p.evaluate(()=>smartDelete()); await p.waitForTimeout(400);
ok(await p.evaluate(()=>(state.d3sol||[]).length)===1,'🗑削除で消える（残り1件）');

/* ⑦ 再読み込みしても残る */
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1200);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3500);
ok(await p.evaluate(()=>(state.d3sol||[]).length)===1,'再読み込みしても立体が残る');
ok(await p.evaluate(()=>{let n=0; T.scene.traverse(o=>{ if(o.userData&&o.userData.solIdx!=null)n++; }); return n===1;}),
   '再読み込み後も絵が出る');

/* ⑧ 役物スタンプのゴースト（リアルタイムプレビュー） */
await p.evaluate(()=>nnStamp('dakki')); await p.waitForTimeout(300);
const roof=await p.evaluate(`(${SCR})(3.0, 0.35, 5.0)`);
await p.mouse.move(roof.x,roof.y,{steps:3}); await p.waitForTimeout(400);
const gh=await p.evaluate(()=>{
  let g=null; T.scene.traverse(o=>{ if(o.name==='nnGhost')g=o; });
  const d=document.getElementById('nnD3Lab');
  return {has:!!g, lab:d&&d.style.display==='block'?d.textContent:'',
          pos:g?[+g.position.x.toFixed(1),+g.position.z.toFixed(1)]:null};
});
ok(gh.has,'スタンプ中はゴースト（半透明の箱）がついてくる');
ok(/脱気筒|タップで設置/.test(gh.lab),'札に名前と案内が出る',gh.lab);
await p.mouse.click(roof.x,roof.y); await p.waitForTimeout(600);
ok(await p.evaluate(()=>(state.parts||[]).length)>=1,'タップで置ける',
   await p.evaluate(()=>(state.parts||[]).length));
/* ★2026-08-28e 置いたあとも「続けて置ける」仕様に変えた（巡回で見つけた手間の解消）。
   なのでゴーストは残ったままが正しい。消えるのは「やめた」とき。 */
await p.mouse.move(roof.x+40,roof.y+20); await p.waitForTimeout(400);
ok(await p.evaluate(()=>{let g=null; T.scene.traverse(o=>{ if(o.name==='nnGhost')g=o; }); return !!g;}),
   '置いたあとも続けて置ける（ゴーストが残る）');
await p.evaluate(()=>{ nnPlaceStop(); });
await p.mouse.move(roof.x+60,roof.y+30); await p.waitForTimeout(400);
ok(await p.evaluate(()=>{let g=null; T.scene.traverse(o=>{ if(o.name==='nnGhost')g=o; }); return !g;}),
   'やめる（Esc・同じボタン・道具の切替）とゴーストは消える');

/* ⑨ 全削除で立体も一緒に消える */
await p.evaluate(()=>clearAll()); await p.waitForTimeout(600);
ok(await p.evaluate(()=>(state.d3sol||[]).length)===0,'全削除で立体も消える');

/* ⑩ 2Dの描画は今までどおり（回帰） */
await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(400);
await p.evaluate(()=>setTool('draw'));
ok(await p.evaluate(()=>tab==='zu'&&tool==='draw'),'①図面タブの描画は今までどおり');
ok(errs.length===0,'JSエラーなし  '+errs.slice(0,3).join(' / '));
await p.screenshot({path:'/tmp/d3draw.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
