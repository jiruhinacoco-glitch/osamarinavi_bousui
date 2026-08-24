/* 3Dで面を動かしている間、ページが利用者に応えられる状態に戻ってこられるか。
   ★コマ数（fps）では測らない。この環境の3DはGPUを使わない絵描き（SwiftShader）なので
     コマ数は実機とまったく違う（§63）。代わりに「合図を出してから返ってくるまでの遅れ」
     ＝主の処理が空くまでの時間を測る。これは端末に関係なく意味がある。
   使い方： node _check/dragfps.js  [ファイル名] [屋根の数]                    */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html'; const N=+(process.argv[3]||20);
let NG=0; const ok=(c,t,v)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(v!==undefined?'  '+JSON.stringify(v):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1400,height:900}});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(400);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4200);
const cdp=await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});      /* スマホ相当 */
await p.evaluate((n)=>{ state.polys=[];
  for(let i=0;i<n;i++){ const ox=(i%5)*14, oy=Math.floor(i/5)*12;
    const pts=[{x:ox,y:oy},{x:ox+10,y:oy},{x:ox+10,y:oy+8},{x:ox,y:oy+8}];
    state.polys.push({name:'屋根'+(i+1),pts,edges:pts.map(()=>({k:'para',h:300,w:250})),holes:[],lv:0}); }
  dirty3d=true; build3D(); },N);
await p.waitForTimeout(2000);
const r=await p.evaluate(async()=>{
  const lag=[]; let stop=false;
  (function ping(){ if(stop)return; const t=performance.now();
    setTimeout(()=>{ lag.push(performance.now()-t); ping(); },16); })();
  const pp=state.polys[0];
  for(let i=0;i<60;i++){ pp.lv=(i%20)*0.05; nnBuild3DSoon(); await new Promise(r2=>setTimeout(r2,25)); }
  await new Promise(r2=>setTimeout(r2,700)); stop=true;
  lag.sort((a,b)=>a-b);
  return {n:lag.length, med:Math.round(lag[Math.floor(lag.length/2)]),
    p90:Math.round(lag[Math.floor(lag.length*0.9)]), max:Math.round(lag[lag.length-1]),
    lv:+pp.lv, cost:window.nnB3Cost|0};
});
console.log('   応答の遅れ 中央値'+r.med+'ms / 上位10% '+r.p90+'ms / いちばん長い '+r.max+'ms（'+r.n+'回）  組み直し1回 '+r.cost+'ms');
ok(r.med<=60,'ふだんは0.06秒以内に応えられる（固まって見えない）',r.med+'ms');
ok(r.p90<=120,'9割は0.12秒以内',r.p90+'ms');
ok(r.max<=900,'いちばん長い止まりでも0.9秒以内',r.max+'ms');
ok(r.n>=60,'動かしている間も合図が通り続ける',r.n+'回');
ok(r.lv>0,'動かした結果がちゃんと入る',r.lv);
ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
await b.close(); console.log('★NG'+NG);
})();
