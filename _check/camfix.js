/* ★2026-08-22b 3Dのカメラは「使う人が動かす以外、絶対に動かさない」（§152）
   node _check/camfix.js
   前提： python3 -m http.server 8899 --directory <このフォルダ>
   見ているもの：編集（辺の種別変更・役物を置く/消す・部位の削除・戻る）で
   build3D が走っても、カメラ（向き・距離・中心・ずらし）が1つも変わらないこと。
   ★以前は形の外接箱が変わるたびに全体表示へ戻していた（パラペット→壁当りで
     壁2.6mが立ち maxY が変わる＝カメラが飛ぶ）。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
const CAM=`(()=>({th:+T.theta.toFixed(4), ph:+T.phi.toFixed(4), r:+T.r.toFixed(3),
  tx:+T.tx.toFixed(3), tz:+T.tz.toFixed(3), vx:Math.round(T.voX||0), vy:Math.round(T.voY||0)}))()`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(700);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);

/* 最初の1回は全体表示になる（これは今までどおり） */
const first=await p.evaluate(CAM);
ok(first.r>4,'最初に開いたときは全体表示になる',first.r);

/* 使う人がカメラを動かした、という状態を作る（回す・寄る） */
await p.evaluate(()=>{ T.theta+=0.4; T.phi=0.9; T.r*=0.55; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(300);
const base=await p.evaluate(CAM);

/* ① 辺の種別を パラペット→壁当り に変える（3Dの編集カードと同じ経路） */
await p.evaluate(()=>{ sel={p:0,r:-1,e:0}; edgeKind('kabe'); });
await p.waitForTimeout(600);
ok(same(await p.evaluate(CAM),base),'辺を壁当りに変えてもカメラは動かない');

/* ② 立上りの高さを変える */
await p.evaluate(()=>{ sel={p:0,r:-1,e:1}; edgeSet('h',500); });
await p.waitForTimeout(600);
ok(same(await p.evaluate(CAM),base),'立上り500に変えてもカメラは動かない');

/* ③ 役物を置く／消す */
await p.evaluate(()=>{ nnStamp('dakki'); nnPlaceAtGrid(6,6); });
await p.waitForTimeout(600);
ok(same(await p.evaluate(CAM),base),'役物を置いてもカメラは動かない');
await p.evaluate(()=>{ if(window.nnPartsClear) nnPartsClear(); if(window.saveState) saveState(); });
await p.waitForTimeout(600);
ok(same(await p.evaluate(CAM),base),'役物を消してもカメラは動かない');

/* ④ 部位を1つ削除（confirmは自動で受ける） */
await p.evaluate(()=>{ state.polys.splice(state.polys.length-1,1);
  if(state.active>=state.polys.length)state.active=state.polys.length-1; saveState(); });
await p.waitForTimeout(600);
ok(same(await p.evaluate(CAM),base),'部位を削除してもカメラは動かない');

/* ⑤ 戻る（undo）でもカメラは動かない */
await p.evaluate(()=>undoStep()); await p.waitForTimeout(700);
ok(same(await p.evaluate(CAM),base),'戻る（undo）でもカメラは動かない');

/* ⑥ 視点ボタンは今までどおり効く（明示の操作だけがカメラを動かす） */
await p.evaluate(()=>d3ViewPlan()); await p.waitForTimeout(900);
const plan=await p.evaluate(CAM);
ok(!same(plan,base) && Math.abs(plan.ph-0.16)<0.01,'視点ボタン（図面と同じ）は効く',plan.ph);
await p.evaluate(()=>d3ViewIso()); await p.waitForTimeout(900);
const iso=await p.evaluate(CAM);
ok(Math.abs(iso.ph-0.95)<0.01,'視点ボタン（斜めから）も効く',iso.ph);

ok(errs.length===0,'JSエラーなし  '+errs.slice(0,2).join(' / '));
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
