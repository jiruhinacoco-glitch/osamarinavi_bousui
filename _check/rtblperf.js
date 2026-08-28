/* 屋根の表の作り直しが重くないか（屋根20面）
   ★「書く→測る」をくり返すと、そのたびに画面の置き場所の計算が走る（§203の型）。
     直す前は1回あたり約180ms、いまは10ms以下。
   使い方: node _check/rtblperf.js   （先に python3 -m http.server 8899 を立てる）
   直す前と比べる: node _check/rtblperf.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(900);
const r=await p.evaluate(async()=>{
  state.polys=[];
  for(let i=0;i<20;i++){ const x=(i%5)*12, y=Math.floor(i/5)*10; const pts=[];
    for(let k=0;k<30;k++){ const a=k/30*Math.PI*2; pts.push({x:x+5+4*Math.cos(a), y:y+4+3*Math.sin(a)}); }
    state.polys.push({name:'屋根'+(i+1)+'（とても長い名前の部位です）',lv:0,pts,
      edges:pts.map(()=>({k:'para',h:300,w:250})),holes:[]}); }
  commit(); nnRoofTbl(true);
  const raf=()=>new Promise(x=>requestAnimationFrame(()=>requestAnimationFrame(x)));
  await raf();
  const times=[];
  for(let i=0;i<9;i++){ await raf(); const t0=performance.now(); nnRoofTbl(true); times.push(performance.now()-t0); }
  times.sort((a,b)=>a-b);
  const t=document.getElementById('nnRoofTbl');
  const nm=[...t.querySelectorAll('.rnm')];
  const over=nm.filter(e=>e.scrollWidth>e.clientWidth+2).length;
  const q=t.getBoundingClientRect();
  const tb=document.getElementById('toolbar').getBoundingClientRect();
  return {mid:Math.round(times[4]*10)/10, min:Math.round(times[0]*10)/10,
    rows:t.querySelectorAll('tbody tr, tr.rrow').length, over, names:nm.length,
    belowToolbar:q.top>=tb.bottom-2, inScreen:(q.right<=innerWidth+2 && q.bottom<=innerHeight+2)};
});
console.log('     作り直し 中央値'+r.mid+'ms（いちばん速い回 '+r.min+'ms）／行'+r.rows);
ok(r.mid<30,'屋根20面でも作り直しが30ms以内 ('+r.mid+'ms)');
ok(r.names===20,'名前の欄が20個 ('+r.names+')');
ok(r.over===0,'長い名前が枠からはみ出していない ('+r.over+'個)');
ok(r.belowToolbar,'表がツールバーの下にある');
ok(r.inScreen,'表が画面の中に収まっている');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
