/* ★2026-08-24j 継目の「まとめ描き」（同じ形を1回で描く・§179）
   node _check/inst3d.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1400,height:820}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[]; state.scaleM=0.5;
  for(let k=0;k<20;k++){ const ox=(k%5)*14, oy=Math.floor(k/5)*12;
    drawPts=[{x:ox,y:oy},{x:ox+12,y:oy},{x:ox+12,y:oy+10},{x:ox,y:oy+10}]; closePoly(); } });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(6000);
/* ★2026-08-24y 「GPUが無い端末ではまとめ描きを切る」のは誤りだった（1回目のシェーダー作成の
   時間が計測に混ざっていた）。温めてから測るとソフト描画でもまとめ描きのほうが速い。
   いまは端末の種類では切らず、継目が1200本以上のときだけまとめる。
   比べるための切り替えは window.nnInstanceOff（逃げ道も兼ねる）。 */
const shot=()=>p.evaluate(()=>{
  T.renderer.render(T.scene,T.camera);          /* 温め（シェーダー作成をここで済ませる） */
  const rs=[]; for(let k=0;k<5;k++){ const t=performance.now();
    T.renderer.render(T.scene,T.camera); rs.push(performance.now()-t); }
  let inst=0,sum=0; T.group.traverse(o=>{ if(o.isInstancedMesh){inst++; sum+=o.count;} });
  return {parts:T.group.children.length, calls:T.renderer.info.render.calls,
          tri:T.renderer.info.render.triangles, まとめ:inst, 本数:sum,
          描画:+rs.slice().sort((u,v)=>u-v)[2].toFixed(1)};
});
/* ① 既定（まとめ描きが効く） */
ok(await p.evaluate(()=>nnIsSoftGL()===true),'①この環境はソフト描画だと分かっている');
const on=await shot();
ok(on['まとめ']>0 && on['本数']>1000,'①既定でまとめ描きが効く（GPUの有無で切らない）',on);
/* ② 切ってみると、部品も呼び出しも増える＝まとめ描きが効いている証拠 */
await p.evaluate(()=>{ window.nnInstanceOff=true; dirty3d=true; build3D(); });
await p.waitForTimeout(500);
const off=await shot();
ok(off['まとめ']===0,'②切ると1本ずつに戻る',off['まとめ']);
ok(on.parts < off.parts*0.5,'②まとめ描きで部品が半分以下になる',{あり:on.parts,なし:off.parts});
ok(on.calls < off.calls*0.6,'②描画の呼び出し回数も減る',{あり:on.calls,なし:off.calls});
ok(Math.abs(on.tri-off.tri)<200,'②三角形の数は変わらない（見た目が同じ）',{あり:on.tri,なし:off.tri});
ok(on.描画 <= off.描画*1.05,'★③ソフト描画でも、まとめ描きのほうが遅くならない',
   {まとめあり:on.描画+'ms', まとめなし:off.描画+'ms'});
await p.evaluate(()=>{ window.nnInstanceOff=false; dirty3d=true; build3D(); });
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
