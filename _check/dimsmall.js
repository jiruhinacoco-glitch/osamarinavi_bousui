/* ★2026-09-26 本人「寸法表示しても出ない」（図面・積算の平面図）
   原因：寸法は「1マスが画面で8px以上」のときだけ描いていた。引いて見る（縮小）・大きな屋根を描くと
   1マスが小さくなり、辺は画面で何百pxもあるのに寸法が全部消えていた（GL+◯m の行も消えていたのが手がかり）。
   ① 1マス＝5px（引いて見た状態）で大きなL字の屋根：寸法の札が辺の数だけ出る
   ② 1マス＝34px（ふつう）でも今まで通り出る
   ③ 寸法表示を切ると出ない
   使い方：node _check/dimsmall.js [ファイル名]（http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const exe=fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).map(d=>'/opt/pw-browsers/'+d+'/chrome-linux/chrome')[0];
const file=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c) ng++; };
(async()=>{const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:1600,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+file); await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
/* 画面で数えるのは「寸法の札（数値入力の当たり）」の数（描いた札ごとに1つ積まれる） */
const run=(cell,big)=>p.evaluate(([cell,big])=>{
  const k=big?8:1; const pts=[[0,0],[16,0],[16,6],[22,6],[22,12],[8,12],[8,5],[0,5]].map(q=>({x:q[0]*k,y:q[1]*k}));
  state.polys=[{lv:0,name:'屋根①',pts,edges:pts.map(()=>({h:300,w:250,k:'para'}))}]; state.active=0;
  saveState(); cellPx=cell; ox=40; oy=40; draw();
  const L=nnLabHit.filter(x=>x.kind==='pdim');
  /* 画面での辺の長さ（自分で計算）：一番短い辺 */
  let mn=1e9; for(let i=0;i<pts.length;i++){ const a=pts[i], c=pts[(i+1)%pts.length]; mn=Math.min(mn,Math.hypot(c.x-a.x,c.y-a.y)*cell); }
  return {n:L.length, edges:pts.length, minEdgePx:Math.round(mn)};
},[cell,big]);
let r=await run(5,true);
ok(r.n===r.edges,'① 引いて見た状態（1マス5px・大きな屋根）でも寸法が辺の数だけ出る',r);
r=await run(34,false);
ok(r.n===r.edges,'② ふつうの表示でも今まで通り出る',r);
await p.evaluate(()=>nnToggleDims()); r=await run(34,false);
ok(r.n===0,'③ 寸法表示を切ると出ない',r);
await p.evaluate(()=>nnToggleDims());
ok(!errs.length,'エラーなし',errs.slice(0,3));
await b.close(); console.log(ng?('★NG '+ng+'件'):'すべて○');})();
