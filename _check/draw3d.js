/* ★2026-09-06j 3Dの作図補助（5度きざみ・そろえ・閉じる輪）と、平場→立上りの巻き（§313）
   node _check/draw3d.js  [ファイル名]
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(700);
await p.evaluate(()=>{
  state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
    edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}];
  saveState(); setTab('d3');
});
await p.waitForTimeout(2500);
await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
await p.evaluate(()=>{ T.theta=-Math.PI/2+0.35; T.phi=1.2; T.r=3.2; T.tx=5; T.tz=7.0; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(1200);

/* ── ① 平場 → 立上り の連続した増し張り（本人の指摘） ── */
const wrap=await p.evaluate(()=>{
  state.d3sheet=[];
  window.nnSheetMode={kind:'poly', mat:{n:'増し張り材',col:'#3f3b36',src:''}, t:4};
  /* 平場の面（上向き）で、立上りの足元をまたぐ形をかいた状態を渡す */
  const f={p:[5,0.012,7.5], n:[0,1,0], u:[1,0,0], v:[0,0,-1],
           pts:[[-0.2,0],[0.2,0],[0.2,-0.6],[-0.2,-0.6]]};
  window.nnSheetCommit(f);
  const s=(state.d3sheet||[])[0];
  return {faces:s?s.faces.length:0, area:s?+nnSheetArea(s).toFixed(3):0,
    fn:s?s.faces.map(x=>x.n.map(v=>+v.toFixed(2))):null};
});
ok(wrap.faces>=2,'① 平場からかいた増し張りが立上りに巻く（面が2枚以上）',wrap.faces);
ok(wrap.fn&&wrap.fn.some(n=>n[1]>0.9)&&wrap.fn.some(n=>Math.abs(n[1])<0.2),
   '① 平場の面と立上りの面の両方ができる',wrap.fn);
ok(Math.abs(wrap.area-0.24)<0.005,'① 面積は巻いても変わらない（0.4×0.6＝0.24㎡）',wrap.area);

/* 立上り → 平場（今までどおり動く） */
const wrap2=await p.evaluate(()=>{
  state.d3sheet=[];
  const f={p:[5,0.20,7.75], n:[0,0,-1], u:[-1,0,0], v:[0,1,0],
           pts:[[-0.2,0.05],[0.2,0.05],[0.2,-0.30],[-0.2,-0.30]]};
  window.nnSheetCommit(f);
  const s=(state.d3sheet||[])[0];
  return {faces:s?s.faces.length:0, fn:s?s.faces.map(x=>x.n.map(v=>+v.toFixed(2))):null};
});
ok(wrap2.faces>=2,'① 立上りからかいた増し張りも平場に巻く（今までどおり）',wrap2.faces);

/* 屋根のまん中の平らな貼り物は巻かない（1枚のまま） */
const flat=await p.evaluate(()=>{
  state.d3sheet=[];
  const f={p:[5,0.012,4], n:[0,1,0], u:[1,0,0], v:[0,0,-1],
           pts:[[-0.5,-0.5],[0.5,-0.5],[0.5,0.5],[-0.5,0.5]]};
  window.nnSheetCommit(f);
  const s=(state.d3sheet||[])[0];
  return {faces:s?s.faces.length:0, area:s?+nnSheetArea(s).toFixed(2):0};
});
ok(flat.faces===1 && Math.abs(flat.area-1)<0.02,'① 壁から離れた平らな貼り物は巻かない',flat);

/* ── ② 作図補助（平面図と同じ・§313） ── */
await p.evaluate(()=>{ state.d3sheet=[]; window.nnSheetMode=null; setTool('draw'); });
await p.waitForTimeout(200);
const spots=await p.evaluate(()=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  function hitAt(x,y){ const v=new THREE.Vector2(((x-r.left)/r.width)*2-1,-((y-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(v,T.camera); return nnD3FaceHit(rc); }
  const deck=[];
  for(let y=r.top+30;y<r.top+r.height-30;y+=6)
    for(let x=r.left+30;x<r.left+r.width-30;x+=6){
      const h=hitAt(x,y); if(h&&h.n.y>0.9&&h.point.y<0.05) deck.push({x,y}); }
  return deck.length?{x:deck[Math.floor(deck.length/2)].x, y:deck[Math.floor(deck.length/2)].y}:null;
});
ok(!!spots,'② 平場の画素が見つかる');
async function tap(x,y,mod){ await p.mouse.move(x,y); await p.waitForTimeout(50);
  if(mod)await p.keyboard.down(mod);
  await p.mouse.down(); await p.waitForTimeout(50); await p.mouse.up();
  if(mod)await p.keyboard.up(mod);
  await p.waitForTimeout(300); }
if(spots){
  await tap(spots.x, spots.y);
  /* 2点目：わざと半端な位置を狙う → 5度・5cmきざみに丸まる */
  await tap(spots.x+97, spots.y+13);
  const g=await p.evaluate(()=>{
    const P=(window.nnD3DrawPts?nnD3DrawPts():null); return null; });
  const st=await p.evaluate(()=>{
    /* 面の座標の2点目を、内部の状態から見る */
    const d=document.getElementById('nnD3Dims');
    return {dims:d?d.querySelectorAll('.dm').length:0, txt:d?d.textContent:''};
  });
  ok(st.dims>=1,'② かいた辺に寸法の札が出る',st.txt);
  /* 5cmきざみ・5度きざみになっているか（札の数字は 0.05 の倍数） */
  const m=(st.txt||'').match(/([0-9.]+)\s*m/);
  const L=m?+m[1]:0;
  ok(L>0 && Math.abs(Math.round(L/0.05)*0.05-L)<0.011,'② 長さが5cmきざみ',L);
  /* 3点目 → 角度の札が出る */
  await tap(spots.x+97, spots.y+90);
  const st2=await p.evaluate(()=>{ const d=document.getElementById('nnD3Dims');
    return {ag:d?d.querySelectorAll('.dm.ag').length:0, txt:d?d.textContent:''}; });
  ok(st2.ag>=1,'② 角の角度の札が出る',st2.txt);
  const ma=(st2.txt||'').match(/(\d+)°/);
  ok(ma && (+ma[1])%5===0,'② 角度が5度の倍数',ma&&ma[1]);
  /* そろえ（始点の真上・他の角と同じ高さ）の紫の線が出る。
     ★狙いを少しずつ動かして、どこかで効けば○（画面の見え方で効く位置が変わるため） */
  let gd=false;
  for(const dy of [20,26,34,44,56,70]){
    await p.mouse.move(spots.x, spots.y+dy); await p.waitForTimeout(220);
    gd=await p.evaluate(()=>{ const g=T.scene.getObjectByName('nnSolG'), h=g&&g.getObjectByName('nnPvGuide');
      return !!(h&&h.children.length); });
    if(gd)break;
  }
  ok(gd,'② 始点の真上・真横にそろうと紫の目印が出る');
  /* 始点の近くに「ここで閉じる」の輪が出る */
  const ring=await p.evaluate(()=>{
    const g=T.scene.getObjectByName('nnSolG'); return !!(g&&g.getObjectByName('nnPvRing')); });
  ok(ring,'② 3点以上で「ここで閉じる」の輪が出る');
  /* 始点の近くを狙うと閉じる（行きすぎ・足らないが起きない） */
  await tap(spots.x+4, spots.y+4);
  const closed=await p.evaluate(()=>({on:!!(window.nnD3DrawOn&&nnD3DrawOn()), sol:(state.d3sol||[]).length}));
  ok(closed.on===false,'② 始点の近くをタップすると閉じる',closed);
}

/* ── ③ 後片付け（補助の線・輪が残らない） ── */
const left=await p.evaluate(()=>{ try{ nnD3DrawCancel(); }catch(_){}
  const g=T.scene.getObjectByName('nnSolG');
  return g?['nnPvGuide','nnPvRing','nnPvLine','nnPvRect'].filter(n=>!!g.getObjectByName(n)):[]; });
ok(left.length===0,'③ やめると補助の線・輪が残らない',left);

ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
console.log('\n★NG '+ng+' 件'); await b.close(); process.exit(ng?1:0);
})();
