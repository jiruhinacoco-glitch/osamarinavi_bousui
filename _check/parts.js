/* ★2026-09-09j §375 増張りパーツ：あらかじめ用意した形を選んで貼り、**あとから寸法を変えられる**。
   本人の依頼「あらかじめ増貼りパーツを用意しておいて、あとは寸法を変えるだけで
   自在に希望の箇所に貼り付けられるようにしたい」。
   ★検算は検査側で別に計算する：
     入隅＝平場 W×W ＋ 立上り W×D×2 ／ 出隅＝平場 W×W×3 ＋ 立上り W×D×2
   使い方: node _check/parts.js  ／ node _check/parts.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const want=(kado,w,d)=>{ const W=w/1000, D=d/1000; return (kado==='入隅'?W*W:W*W*3) + W*D*2; };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:700}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(1000);
  await p.evaluate(()=>{ state.scaleM=1;
    /* L字：(5,4) が出隅、(0,0) は入隅 */
    const P=[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4},{x:5,y:8},{x:0,y:8}];
    state.polys=[{pts:P, edges:P.map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}];
    state.d3sheet=[]; saveState(); setTab('d3'); });
  await p.waitForTimeout(2600);
  await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});

  /* ① パーツの一覧がある */
  const cat=await p.evaluate(()=>window.nnSheetParts?nnSheetParts():null);
  ok(Array.isArray(cat)&&cat.length>=3, '① 増張りパーツの一覧がある', cat&&cat.map(x=>x.n+' '+x.w+'×'+x.d));

  /* ② パーツを選ぶと、形と寸法がまとめて決まる */
  const md=await p.evaluate(()=>{ if(!window.nnSheetParts) return {err:'パーツの一覧が無い'};
    nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'poly');
    const P=nnSheetParts()[2];                       /* 出入隅 500×250 */
    nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'}, P.kind);
    window.nnSheetMode.w=P.w; window.nnSheetMode.d=P.d;
    return {kind:window.nnSheetMode.kind, w:window.nnSheetMode.w, d:window.nnSheetMode.d}; });
  ok(!md.err&&md.kind==='corner'&&md.w===500&&md.d===250, '② パーツを選ぶと 形と寸法が決まる', md);

  /* ③ 角をタップすると、レシピ（作り方）を持った貼り物ができる */
  const A=await p.evaluate(()=>{ state.d3sheet=[];
    nnSheetCornerTap({point:new THREE.Vector3(0,0,0)});           /* 入隅 (0,0) */
    const s=state.d3sheet[0]; if(!s) return {none:1};
    return {kado:s.kado, part:s.part, area:+nnSheetArea(s).toFixed(4), n:s.faces.length}; });
  console.log('  ③ '+JSON.stringify(A));
  ok(!A.none && A.part && A.part.kind==='corner', '③ 作り方（レシピ）を持っている', A.part);
  ok(A.kado==='入隅', '③ 入隅として貼れる', A.kado);
  ok(Math.abs(A.area-want('入隅',500,250))<0.005, '③ 面積は W×W＋W×D×2（＝'+want('入隅',500,250).toFixed(3)+'㎡）', {出た:A.area, 期待:+want('入隅',500,250).toFixed(4)});

  /* ④ あとから寸法を変えると、形も積算も変わる */
  const B=await p.evaluate(()=>{ if(!window.nnSheetPartResize) return {err:'寸法を変える仕組みが無い', okr:false, area:0};
    const okr=nnSheetPartResize(0, 800, 400);
    const s=state.d3sheet[0];
    return {okr, part:s.part, area:+nnSheetArea(s).toFixed(4), n:s.faces.length}; });
  console.log('  ④ '+JSON.stringify(B));
  ok(B.okr===true, '④ 寸法を変えられる', B.okr);
  ok(B.part && B.part.w===800 && B.part.d===400, '④ 新しい寸法が残る', B.part);
  ok(Math.abs(B.area-want('入隅',800,400))<0.01, '④ 積算も新しい寸法どおり（＝'+want('入隅',800,400).toFixed(3)+'㎡）', {出た:B.area, 期待:+want('入隅',800,400).toFixed(4)});

  /* ⑤ 出隅でも同じ（形が違うので面積の式も違う） */
  const C=await p.evaluate(()=>{ state.d3sheet=[];
    window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'corner',w:400,d:200,t:4};
    nnSheetCornerTap({point:new THREE.Vector3(5,0,4)});           /* 出隅 (5,4) */
    const s=state.d3sheet[0]; if(!s) return {none:1};
    const r=window.nnSheetPartResize?nnSheetPartResize(0, 600, 300):false;
    return {kado:s.kado, r, part:s.part, area:+nnSheetArea(s).toFixed(4)}; });
  console.log('  ⑤ '+JSON.stringify(C));
  ok(C.kado==='出隅', '⑤ 出隅として貼れる', C.kado);
  ok(Math.abs(C.area-want('出隅',600,300))<0.02, '⑤ 出隅も寸法どおり（＝'+want('出隅',600,300).toFixed(3)+'㎡）', {出た:C.area, 期待:+want('出隅',600,300).toFixed(4)});

  /* ⑥ 寸法を変えても、角に穴が空かない（§369 の決まりを守る） */
  const D=await p.evaluate(()=>{
    T.scene.updateMatrixWorld(true);
    const objs=[]; T.group.traverse(o=>{ if(o.isMesh&&o.visible&&!(o.userData&&o.userData.pick)) objs.push(o); });
    const rc=new THREE.Raycaster(), dir=new THREE.Vector3(1,0,1).normalize();
    const out=[];
    for(let k=0;k<10;k++){ const y=0.03+k*0.02;
      rc.set(new THREE.Vector3(4.744-0.25,y,3.744-0.25), dir);
      const hs=rc.intersectObjects(objs,false)||[];
      let nm='(なし)', d=-1;
      for(let i=0;i<hs.length;i++){ const m=hs[i].object;
        if(m.material&&m.material.transparent&&m.material.opacity<0.1) continue;
        nm=m.name||'(無名)'; d=hs[i].distance; break; }
      if(d>0.30&&d<0.41) out.push({y:+y.toFixed(2), hit:nm});
    }
    return out; });
  const bad=D.filter(r=>r.hit!=='nnSheet');
  ok(D.length>=6, '⑥ 稜線まで光線が届いている（検査が空振りしていない）', D.length);
  ok(bad.length===0, '⑥ 寸法を変えても角に穴が空かない', bad);

  /* ⑦ 保存して開き直しても、レシピが残る（あとで寸法を変えられる） */
  const E=await p.evaluate(()=>{ saveState();
    /* 保存のキーは決め打ちにしない：中身に貼り物が入っているものを探す */
    let raw='';
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i), v=localStorage.getItem(k)||'';
      if(/"d3sheet"/.test(v) && v.length>raw.length) raw=v; }
    let hit=false; try{ hit=/"part":\{"kind":"corner"/.test(raw.replace(/\s+/g,'')); }catch(e){}
    return {len:raw.length, hit}; });
  ok(E.hit, '⑦ 保存にも作り方（レシピ）が入る', E);

  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ パーツを選んで貼り、あとから寸法を変えられる');
  await b.close();
})();
