/* ★2026-09-06j 脱気筒のBlenderモデル（models/vent.glb）
   node _check/vent1.js
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const req=[]; p.on('request',r=>{ if(/\.glb(\?|$)/.test(r.url())) req.push(r.url().split('/').pop()); });
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(700);

/* ① 置ける・既定の寸法がGLBの実寸 */
await p.evaluate(()=>{ nnStamp('dakki'); nnPlaceAtGrid(6,6); });
await p.waitForTimeout(400);
const P=await p.evaluate(()=>{ const it=(state.parts||[]).slice(-1)[0];
  const P=nnPartsLib().find(x=>x.id===it.p); return P?{k:P.kind,w:P.w,d:P.d,h:P.h}:null; });
ok(!!P && P.k==='vent','◆脱気筒を置ける（kind=vent）',P&&P.k);
ok(!!P && P.w===300 && P.d===300 && P.h===400,'既定の寸法がGLBの実寸 300×300×400',P);

/* ② 3Dで vent.glb を取りに行き、箱が差し替わる */
await p.evaluate(()=>setTab("d3")); await p.waitForTimeout(9000);
ok(req.some(u=>u==='vent.glb'),'models/vent.glb を読みに行く',req);
const r=await p.evaluate(()=>{
  let hidden=0, mesh=0, tri=0, mats={}, box=null;
  T.group.traverse(o=>{
    if(o.name==='nnPart'&&o.userData.partIdx!=null&&!o.visible) hidden++;
  });
  // GLB由来のメッシュ＝partIdxを持ち、nnPartでないもの
  T.group.traverse(o=>{
    if(o.isMesh && o.userData.partIdx!=null && o.name!=='nnPart'){
      mesh++;
      const g=o.geometry;
      if(g&&g.index) tri+=g.index.count/3; else if(g&&g.attributes&&g.attributes.position) tri+=g.attributes.position.count/3;
      if(o.material&&o.material.name) mats[o.material.name]=1;
      const bb=new THREE.Box3().setFromObject(o);
      if(!box) box={x0:bb.min.x,x1:bb.max.x,y0:bb.min.y,y1:bb.max.y};
      else { box.x0=Math.min(box.x0,bb.min.x); box.x1=Math.max(box.x1,bb.max.x);
             box.y0=Math.min(box.y0,bb.min.y); box.y1=Math.max(box.y1,bb.max.y); }
    }
  });
  return {hidden,mesh,tri:Math.round(tri),mats:Object.keys(mats),box};
});
ok(r.hidden>=1,'箱は見えなくなる（当たり判定は残る）',r.hidden);
ok(r.mesh>=8,'Blenderのモデルが出る（部品10個ぶん）',r.mesh);
ok(r.tri>6000 && r.tri<9000,'三角形の数がGLBどおり（約7360）',r.tri);
ok(r.mats.some(n=>/Stainless|Steel|Metal/.test(n)),'材質がGLBのもの（ステンレス）',r.mats);
const wpx=r.box?+(r.box.x1-r.box.x0).toFixed(3):0, hpx=r.box?+(r.box.y1-r.box.y0).toFixed(3):0;
ok(Math.abs(wpx-0.30)<0.02,'横幅が部品のW（300mm）にそろう',wpx);
ok(Math.abs(hpx-0.40)<0.03,'高さが400mm（等倍で縮尺）',hpx);

/* ③ タップで部品として選べる（partIdx を持っている） */
ok(await p.evaluate(()=>{ let n=0; T.group.traverse(o=>{ if(o.isMesh&&o.name!=='nnPart'&&o.userData.partIdx!=null)n++; }); return n>0; }),'モデルをタップして部品を選べる（partIdx付き）');

/* ④ .glb の無い部品は取りに行かない（404を増やさない） */
await p.evaluate(()=>{ setTab('zu'); nnStamp('tatedrain'); nnPlaceAtGrid(9,9); setTab('d3'); });
await p.waitForTimeout(2500);
ok(!req.some(u=>/drain/.test(u)),'.glb の無い部品は取りに行かない',req);

ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
console.log('\n★NG '+ng+' 件'); await b.close(); process.exit(ng?1:0);
})();
