/* ★2026-08-23e 壁当り（壁面）の立上り防水の仕上がり（§157）
   node _check/kabe1.js
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

/* 5m×4mの1部位。辺0だけを壁当りにして、他はパラペットのままにする */
const MAKE=`(kind)=>{
  state.polys=[]; state.parts=[]; state.d3sol=[]; state.sect=null;
  state.scaleM=0.5;
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  const eg=()=>({h:300,w:250,k:'para'});
  /* ★2026-08-23h から p.spec は「屋根ごとの防水仕様」として本当に効くようになった。
     このテストは全体の仕様（state.specCode）を切り替えて見るので、p.spec は付けない。 */
  state.specCode='AS-T1';
  state.polys.push({name:'屋根①', lv:0, pts:pts,
    edges:[eg(),eg(),eg(),eg()], holes:[]});
  if(kind==='kabe'){ state.polys[0].edges[0]={h:600,w:0,k:'kabe'}; }
  dirty3d=true; build3D();
  return (state.polys[0].edges[0]||{}).k;
}`;

/* 立上り防水の板（PlaneGeometry・防水の材質）を集めて素性を返す */
const FACES=`()=>{
  const out=[];
  T.group.traverse(o=>{
    if(!o.isMesh||!o.geometry)return;
    if(o.geometry.type!=='PlaneGeometry')return;
    const uv=o.geometry.attributes&&o.geometry.attributes.uv;
    let umax=0,vmax=0;
    if(uv){ for(let i=0;i<uv.count;i++){ umax=Math.max(umax,uv.getX(i)); vmax=Math.max(vmax,uv.getY(i)); } }
    const p=o.geometry.parameters||{};
    out.push({w:+(p.width||0).toFixed(3), h:+(p.height||0).toFixed(3),
      umax:+umax.toFixed(2), vmax:+vmax.toFixed(2),
      hasMap:!!(o.material&&o.material.map),
      x:+o.position.x.toFixed(3), z:+o.position.z.toFixed(3), y:+o.position.y.toFixed(3)});
  });
  return out;
}`;
/* はみ出しアス（bead材質の棒）の数 */
const BEADS=`()=>{
  let n=0; T.group.traverse(o=>{ if(o.isMesh&&o.material&&o.material.color
    && o.material.color.getHex()===0x14120f) n++; });
  return n;
}`;
/* 押え金物（アルミ）の位置：壁の面からどれだけ手前に出ているか */
const BAR=`()=>{
  let best=null;
  T.group.traverse(o=>{
    if(!o.isMesh||!o.geometry||o.geometry.type!=='BoxGeometry')return;
    const p=o.geometry.parameters||{};
    if(Math.abs(p.height-0.05)>1e-6)return;                 /* 押え金物の高さ50mm */
    best={len:+p.width.toFixed(2), x:+o.position.x.toFixed(3), z:+o.position.z.toFixed(3),
          y:+o.position.y.toFixed(3)};
  });
  return best;
}`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);

/* ── ① パラペットだけの状態を控える（比べる相手） ── */
await p.evaluate(`(${MAKE})('para')`); await p.waitForTimeout(600);
const paraF=await p.evaluate(`(${FACES})()`);
const paraB=await p.evaluate(`(${BEADS})()`);
ok(paraF.length>=4,'パラペット：立上り防水の板がある',paraF.length);
ok(paraB>0,'パラペット：はみ出しアスがある',paraB);

/* ── ② 辺0を壁当りにする ── */
const k=await p.evaluate(`(${MAKE})('kabe')`); await p.waitForTimeout(600);
ok(k==='kabe','辺0を壁当りにできた',k);
const F=await p.evaluate(`(${FACES})()`);
/* 壁当りの立上り＝高さ0.6mの板（他はパラペットの0.28m） */
const kf=F.filter(f=>Math.abs(f.h-0.6)<0.01);
ok(kf.length===1,'壁当りの立上り防水の板が1枚ある',{all:F.length,kabe:kf.length});
const K=kf[0]||{};

/* ★①仕上がりの主因：UVが実寸か（無いと砂の粒が辺いっぱいに伸びて「板」に見える） */
ok(K.hasMap===true,'砂付の質感（模様）が貼られている',K.hasMap);
ok(K.umax>1.5 && K.vmax>1.5,'UVが実寸（1m＝4タイル）＝粒が伸びない',{umax:K.umax,vmax:K.vmax});
const wantU=+(K.w*4).toFixed(2), wantV=+(K.h*4).toFixed(2);
ok(Math.abs(K.umax-wantU)<0.2 && Math.abs(K.vmax-wantV)<0.2,
   'UVの倍率が「長さ×4」とぴったり',{umax:K.umax,want:wantU,vmax:K.vmax,wantV:wantV});

/* ★②角から角まで（joint）＝出隅で切れない。
   板の幅は「辺の長さ」ではなく、隣の壁の厚みぶん短い（＝角で突き合わせている証拠） */
const edgeLen=await p.evaluate(()=>{
  const s=state.scaleM, a=state.polys[0].pts[0], b2=state.polys[0].pts[1];
  return +Math.hypot((b2.x-a.x)*s,(b2.y-a.y)*s).toFixed(3);
});
ok(K.w>0 && K.w<edgeLen,'板は角から角まで（辺の長さそのままではない）',{ita:K.w,hen:edgeLen});
const wantShort=await p.evaluate(()=>{
  const es=state.polys[0].edges;
  const th=e=>(e.k==='para')?Math.max((e.w||0)/1000,0.08):0.15;
  return +((th(es[3])+0.006)+(th(es[1])+0.006)).toFixed(3);   /* 両隣の防水層の位置ぶん */
});
ok(Math.abs((edgeLen-K.w)-wantShort)<0.01,'両隣の防水層とぴったり突き合う（角ですき間なし）',
   {mijikai:+(edgeLen-K.w).toFixed(3), want:wantShort});

/* ★③露出アス（シート）の継目が壁当りにも出る */
const WALLBEAD=`()=>{
  /* 辺0は z=0 の線。壁当りの立上り防水は z=0.156（th+6mm）に立つ。
     その面の上にある「立ち上がった継目」を数える（平場の継目と混ざらないよう y で切る） */
  let n=0, lap=0;
  T.group.traverse(o=>{
    if(!(o.isMesh&&o.material&&o.material.color&&o.material.color.getHex()===0x14120f))return;
    const z=o.position.z, y=o.position.y;
    if(z>0.13&&z<0.20&&y>0.05) n++;                 /* 壁の面の縦の継目 */
    if(z>0.13&&z<0.30&&y<0.05) lap++;               /* 平場に貼りかけた部分 */
  });
  return {tate:n, hari:lap};
}`;
const wb=await p.evaluate(`(${WALLBEAD})()`);
ok(wb.tate>=1,'壁当りの立上りに 縦の継目（はみ出しアス）が出る',wb);
ok(wb.hari>=1,'平場への貼りかけの継目も出る',wb);

/* ★④押え金物が壁の中に埋まっていない（防水層より手前＝屋根側にある） */
const bar=await p.evaluate(`(${BAR})()`);
ok(!!bar,'押え金物（アルミ）がある',bar);
if(bar){
  /* 辺0は y=0 の線（z=0）。屋根の内側＝+z 向き。壁の厚みは0.15 */
  ok(bar.z>0.15,'押え金物が壁の中に埋まっていない（厚み0.15より手前）',bar.z);
  ok(bar.z>K.z,'押え金物は立上り防水より手前（防水層を押さえている）',{bar:bar.z,memb:K.z});
  ok(bar.y<0.6 && bar.y>0.5,'押え金物は立上りの上端あたりにある',bar.y);
}
/* シーリングが押え金物の上にある */
const seal=await p.evaluate(()=>{ let s=null;
  T.group.traverse(o=>{ if(o.name==='nnKabeSeal') s={y:+o.position.y.toFixed(3), z:+o.position.z.toFixed(3)}; });
  return s; });
ok(!!seal && bar && seal.y>bar.y,'シーリングが押え金物の上にある',{seal:seal&&seal.y,bar:bar&&bar.y});

/* ★⑤ウレタン（塗膜）では継目を出さない（実物に継目が無いので） */
await p.evaluate(()=>{ state.specCode='X-2'; dirty3d=true; build3D(); });
await p.waitForTimeout(500);
const nbU=await p.evaluate(`(${BEADS})()`);
ok(nbU===0,'ウレタン塗膜（継目の無い工法）では継目を出さない',nbU);
await p.evaluate(()=>{ state.specCode='AS-T1'; dirty3d=true; build3D(); });
await p.waitForTimeout(400);

/* ★⑥数量（端末金物m）は今までどおり出る＝積算は壊していない */
const qt=await p.evaluate(()=>{ recalc();
  const d=document.getElementById('sekisan'); return d?d.textContent:''; });
ok(/端末金物/.test(qt),'積算に「端末金物（壁当り）」が出る');

/* ★⑦カメラは動いていない（§152） */
const cam0=await p.evaluate(()=>[T.tx,T.tz,T.r,T.theta,T.phi].map(v=>+v.toFixed(4)));
await p.evaluate(()=>{ dirty3d=true; build3D(); }); await p.waitForTimeout(400);
const cam1=await p.evaluate(()=>[T.tx,T.tz,T.r,T.theta,T.phi].map(v=>+v.toFixed(4)));
ok(JSON.stringify(cam0)===JSON.stringify(cam1),'組み直してもカメラは動かない',{mae:cam0,ato:cam1});

ok(errs.length===0,'JSエラーなし  '+errs.slice(0,3).join(' / '));
await p.evaluate(()=>{ T.theta=-0.7; T.phi=1.15; T.r=14; T.tx=5; T.tz=2; T.rev++; });
await p.waitForTimeout(900);
await p.screenshot({path:'/tmp/kabe1.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
