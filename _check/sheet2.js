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
  ok(far[0]&&near[0]&&Math.abs(far[0].px-5)<1.5&&Math.abs(near[0].px-5)<1.5,'点は寄っても離れても画面上 約5px（実寸ではない）',{far,near});
  ok(near[0]&&near[0].r<far[0].r,'寄ったときは実寸が小さくなる',{far:far[0]&&far[0].r, near:near[0]&&near[0].r});
  ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
  await b.close();
  console.log(ng?('★NG '+ng+'件'):'すべて○');
})().catch(e=>{ console.error(e); process.exit(1); });
