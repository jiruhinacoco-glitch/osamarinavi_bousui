/* 継目の形の「置き場（キャッシュ）」が、長く使っても増え続けないか
   ＝ずっと使っていると重くなる・落ちる、の原因になっていた所
   使い方: node _check/beadcache.js   （先に python3 -m http.server 8899 を立てる）
   比べるとき: node _check/beadcache.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1400,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
let ng=0; const ok=(c,m)=>{ console.log((c?'○ ':'★NG ')+m); if(!c)ng++; };

await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}; document.getElementById('tl_sample').click();});
await p.waitForTimeout(700);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(2500);

/* 絵の見た目を数字にする（あとで比べるため） */
const shot=()=>p.evaluate(()=>{
  const g=T.renderer.getContext(); T.renderer.render(T.scene,T.camera);
  const w=T.renderer.domElement.width,h=T.renderer.domElement.height;
  const ww=Math.floor(w*0.5),hh=Math.floor(h*0.5);
  const buf=new Uint8Array(ww*hh*4);
  g.readPixels(Math.floor(w*0.25),Math.floor(h*0.25),ww,hh,g.RGBA,g.UNSIGNED_BYTE,buf);
  let s=0; for(let i=0;i<buf.length;i+=4) s+=buf[i]+buf[i+1]*2+buf[i+2];
  return Math.round(s/(ww*hh));
});
const size=()=>p.evaluate(()=>(typeof _nnBeadCache!=='undefined')?_nnBeadCache.size:-1);
const gpu=()=>p.evaluate(()=>T.renderer.info.memory.geometries);

/* ★控えは「穴の輪」まで含めて取ること（外周だけだと戻し切れず絵が変わる） */
await p.evaluate(()=>{ window.__lv0=state.polys.map(x=>x.lv);
  window.__h0=state.polys.map(x=>nnRingsAll(x).map(rg=>(rg.edges||[]).map(e=>e.h))); });
const s0=await shot(), g0=await gpu();
ok(await size()>0, '置き場が使われている（'+await size()+'個）');

/* 高さをなめらかに動かす＝実際のドラッグ相当。長さが少しずつ変わるので形が増える */
/* 上げ下げをくり返す＝実際の指の動き。辺の高さが何度も変わるので形が増える */
const drag=(sec)=>p.evaluate(async(sec)=>{
  const rg=state.polys[0], eds=rg.edges||[];
  for(let t=0;t<sec*60;t++){
    const v=0.15+0.55*(1-Math.cos(t*0.11));
    nnSetDeckLv(rg, Math.round(v*1000)/1000);
    eds.forEach((e,i)=>{ e.h=180+((t*7+i*53)%900); });   /* 立上りも動かす */
    build3D();
  }
},sec);

await drag(20); await p.waitForTimeout(400);
const s20=await size();
await drag(20); await p.waitForTimeout(400);
const s40=await size();
await drag(20); await p.waitForTimeout(400);
const s60=await size();
console.log('   置き場の大きさ： 20秒'+s20+' → 40秒'+s40+' → 60秒'+s60);
ok(s60<=500, '長く使っても置き場が増え続けない（60秒で'+s60+'個・上限420）');
ok(s60<=s40+120, '頭打ちになっている（40秒→60秒 で+'+(s60-s40)+'個）');

/* 置き場からあふれた形が、解放されずに残っていないか */
const leak=await p.evaluate(()=>{
  let n=0, dead=0;
  T.scene.traverse(o=>{});
  // 置き場に無いのに「使い回す印」が付いたままの形を数える
  const inCache=new Set([..._nnBeadCache.values(), ..._nnBallCache.values()]);
  const seen=new Set(); T.scene.traverse(o=>{ if(o.geometry)seen.add(o.geometry); });
  seen.forEach(g=>{ if(g.userData.nnShared && !inCache.has(g)) n++; });
  return n;
});
ok(leak===0, '置き場に無いのに「使い回す印」が残った形＝0（'+leak+'個）');

/* 入れ替えが起きても絵が変わらないか */
await p.evaluate(()=>{ state.polys.forEach((x,i)=>{ x.lv=window.__lv0[i];
    nnRingsAll(x).forEach((rg,r)=>{ (rg.edges||[]).forEach((e,j)=>{ e.h=window.__h0[i][r][j]; }); });
  }); build3D(); });
await p.waitForTimeout(700);
const s1=await shot();
ok(Math.abs(s1-s0)<12, '入れ替えが起きても同じ絵（明るさ '+s0+' → '+s1+'）');
const g1=await gpu();
ok(g1 < g0+80, 'GPUの形の数が増え続けていない（'+g0+' → '+g1+'）');
ok(errs.length===0, 'JSエラーなし'+(errs.length?' → '+errs.slice(0,2).join(' / '):''));

console.log(ng? ('\n★NG '+ng+'件') : '\n全部○');
await b.close(); process.exit(ng?1:0);
})();
