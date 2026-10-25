/* 図面：📐寸法で入れる「⟳ 一周」（2026-10-25e）。スマホで実際に押して、出来上がった屋根を測る。
   ①凹型：→10 ↓8 ←3 ↑4 ←4 ↓4 ←3 と入れる（最後の↑8は自動）→ 面積64㎡・外周44m（10×8−4×4 を自分で計算）・置くと8つの角
   ②合わない：→5 ↓4 ←5.12 ↑3.95 → 「よこ12cm・たて5cm 合いません」と赤く出る → 置くと最後のよこ・たての辺で合わせて 5×4＝20㎡
   ③2辺だけ（→6 ↓4）→ 残り2辺を自動で閉じて24㎡
   ④線が交差（→4 ↓4 ←2 ↑6）→ 赤い知らせ・置けない ⑤1辺消す ⑥はみ出し・JSエラーなし
   使い方: node _check/dimwalk.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
const area=pts=>{let a=0; for(let i=0;i<pts.length;i++){const u=pts[i],v=pts[(i+1)%pts.length]; a+=u.x*v.y-v.x*u.y;} return Math.abs(a)/2;};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof setTool==='function'&&typeof nnZMenuClose==='function');
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(e){} state.polys=[]; state.scaleM=0.5; draw(); });
  await p.waitForTimeout(300);
  const T=async s=>{ await p.tap(s); };
  const open=async()=>{ await p.evaluate(()=>nnDimInOpen()); await p.waitForSelector('#nnDimIn.on'); await T('#nnDimIn [data-s="walk"]'); };
  /* 「数字 → 矢印」で1辺 */
  const edge=async(num,a)=>{ for(const ch of num) await T(`#nnDimIn .dkeys [data-k="${ch}"]`); await T(`#nnDimIn .darr [data-a="${a}"]`); };
  const ui=()=>p.evaluate(()=>({a:nnDimArea.textContent,pe:nnDimPeri.textContent,gap:nnDimGap.textContent,bad:nnDimGap.classList.contains('bad'),go:!nnDimGo.disabled,goT:nnDimGo.textContent}));
  const last=()=>p.evaluate(()=>{const q=state.polys[state.polys.length-1]; return q?{n:state.polys.length,pts:q.pts.map(v=>({x:v.x*state.scaleM,y:v.y*state.scaleM}))}:null;});
  /* ① */
  await open();
  const arr=await p.$('#nnDimIn .darr [data-a="R"]'); ok(!!arr&&!!(await arr.boundingBox()),'一周を選ぶと矢印の段が出る');
  for(const [n,a] of [['10','R'],['8','D'],['3','L'],['4','U'],['4','L'],['4','D'],['3','L']]) await edge(n,a);
  let u=await ui(); ok(u.a==='64.00㎡'&&u.pe==='44.00m'&&u.go&&!u.bad,'①凹型：面積64㎡・外周44m がその場で出る（最後の↑8は自動）',u);
  const fit=await p.evaluate(()=>{ const W=document.documentElement.clientWidth,H=document.documentElement.clientHeight;
    return [...document.querySelectorAll('#nnDimIn button')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&(r.left<-1||r.right>W+1||r.top<-1||r.bottom>H+1);}).map(e=>e.textContent.trim()); });
  ok(!fit.length,'⑥一周の画面でもボタンがはみ出さない',fit);
  await p.screenshot({path:(process.env.SHOT||'/tmp/dimwalk')+'_1.png'});
  await T('#nnDimGo'); let r=await last();
  ok(r&&r.n===1&&r.pts.length===8&&Math.abs(area(r.pts)-64)<1e-6,'①置いた屋根は8つの角・64㎡',r&&{角:r.pts.length,面積:area(r.pts)});
  /* ② */
  await open();
  for(const [n,a] of [['5','R'],['4','D'],['5.12','L'],['3.95','U']]) await edge(n,a);
  u=await ui(); ok(u.bad&&/よこ12cm/.test(u.gap)&&/たて5cm/.test(u.gap)&&u.go&&u.goT==='合わせて図面に置く','②一周して合わないと「よこ12cm・たて5cm 合いません」と赤く出る',u);
  await p.screenshot({path:(process.env.SHOT||'/tmp/dimwalk')+'_2.png'});
  await T('#nnDimGo'); r=await last();
  const xs=r.pts.map(q=>q.x), ys=r.pts.map(q=>q.y);
  ok(r.n===2&&r.pts.length===4&&Math.abs(area(r.pts)-20)<1e-6&&Math.abs(Math.max(...xs)-Math.min(...xs)-5)<1e-6&&Math.abs(Math.max(...ys)-Math.min(...ys)-4)<1e-6,
     '②置くと最後のよこ・たての辺で合わせて 5×4＝20㎡の長方形',{角:r.pts.length,面積:area(r.pts)});
  /* ③ */
  await open(); await edge('6','R'); await edge('4000','D');
  u=await ui(); await T('#nnDimGo'); r=await last();
  ok(u.a==='24.00㎡'&&r.n===3&&r.pts.length===4&&Math.abs(area(r.pts)-24)<1e-6,'③2辺だけ入れると残り2辺を自動で閉じて24㎡（4000mm も可）',{表示:u.a,面積:r&&area(r.pts)});
  /* ④⑤ */
  await open(); for(const [n,a] of [['4','R'],['4','D'],['2','L'],['6','U']]) await edge(n,a);
  u=await ui(); ok(u.bad&&/交差/.test(u.gap)&&!u.go,'④線が交差すると赤い知らせ・置けない',u);
  await T('#nnDimIn [data-t="undo"]'); u=await ui();
  ok(!u.bad&&u.go,'⑤「1辺消す」で最後の辺が消え、また置ける',u);
  ok(!errs.length,'⑥JSエラーなし',errs.slice(0,2));
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');
})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
