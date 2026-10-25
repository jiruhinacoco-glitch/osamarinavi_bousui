/* 図面：📐寸法で入れる（2026-10-25d）。スマホで実際に押して、出来上がった屋根の形と面積を測る。
   ①L字に 5200・3・2.5・4 を入れると面積 46.40㎡（7.7×7−2.5×3 を自分で計算）・外周 29.40m が出る
   ②「図面に置く」で屋根が1つ増え、その頂点から測った辺の長さが入れた数字どおり（自動の2辺 7.70・7.00 も）
   ③長方形 10×8 を回して置くと 80㎡・既存の屋根に重ならない ④ボタンが画面からはみ出さない ⑤JSエラーなし
   使い方: node _check/dimin.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof setTool==='function'&&typeof nnZMenuClose==='function');
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(e){} state.polys=[]; state.scaleM=0.5; draw(); });
  await p.waitForTimeout(400);
  const btn=await p.$('#tl_sunpo'); ok(!!btn&&!!(await btn.boundingBox()),'📐寸法のボタンが道具の並びに見える');
  if(btn) await btn.tap(); else await p.evaluate(()=>nnDimInOpen());
  await p.waitForSelector('#nnDimIn.on');
  const T=async s=>{ await p.tap(s); };
  const type=async str=>{ for(const ch of str) await T(`#nnDimIn .dkeys [data-k="${ch}"]`); };
  await T('#nnDimIn [data-s="L"]');
  await type('5200'); await T('#nnDimIn [data-k="next"]');
  await type('3'); await T('#nnDimIn [data-k="next"]');
  await type('2.5'); await T('#nnDimIn [data-k="next"]');
  await type('4');
  const sum=await p.evaluate(()=>({a:nnDimArea.textContent,pe:nnDimPeri.textContent,go:!nnDimGo.disabled}));
  ok(sum.a==='46.40㎡'&&sum.pe==='29.40m'&&sum.go,'①L字の面積・外周がその場で出る（46.40㎡・29.40m）',sum);
  const fit=await p.evaluate(()=>{ const W=document.documentElement.clientWidth,H=document.documentElement.clientHeight;
    return [...document.querySelectorAll('#nnDimIn button')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&(r.left<-1||r.right>W+1||r.top<-1||r.bottom>H+1);}).map(e=>e.textContent.trim()); });
  ok(!fit.length,'④入力画面のボタンが画面からはみ出さない',fit);
  await p.screenshot({path:process.env.SHOT||'/tmp/dimin.png'});
  await T('#nnDimGo');
  const r=await p.evaluate(()=>{ const s=state.scaleM, q=state.polys[state.polys.length-1]; if(!q) return null;
    return {n:state.polys.length, open:document.getElementById('nnDimIn').classList.contains('on'),
      L:q.pts.map((a,i)=>{const c=q.pts[(i+1)%q.pts.length]; return Math.round(Math.hypot(c.x-a.x,c.y-a.y)*s*1000)/1000;}), pts:q.pts}; });
  const want=[5.2,3,2.5,4,7.7,7];
  ok(r&&r.n===1&&!r.open&&want.every((v,i)=>Math.abs(r.L[i]-v)<1e-6),'②図面に置いた屋根の辺が入れた数字どおり（自動の2辺も）',r&&r.L);
  /* 自分で面積を計算（product の関数は使わない） */
  const area=pts=>{let a=0; for(let i=0;i<pts.length;i++){const u=pts[i],v=pts[(i+1)%pts.length]; a+=u.x*v.y-v.x*u.y;} return Math.abs(a)/2;};
  ok(r&&Math.abs(area(r.pts)*0.25-46.4)<1e-6,'②置いた屋根の面積が 46.4㎡',r&&area(r.pts)*0.25);
  /* ③長方形・回す → 置く */
  await p.evaluate(()=>nnDimInOpen()); await p.waitForSelector('#nnDimIn.on');
  await T('#nnDimIn [data-s="rect"]'); await type('10'); await T('#nnDimIn [data-k="next"]'); await type('8000'); await T('#nnDimIn [data-t="rot"]');
  await T('#nnDimGo');
  const r2=await p.evaluate(()=>{ const s=state.scaleM, A=state.polys[0].pts, B=state.polys[1]&&state.polys[1].pts; if(!B) return null;
    return {n:state.polys.length, B, ax:Math.max(...A.map(q=>q.x)), bx:Math.min(...B.map(q=>q.x))}; });
  ok(r2&&r2.n===2&&Math.abs(area(r2.B)*0.25-80)<1e-6&&r2.bx>r2.ax,'③長方形10×8（8000mm）を回して置くと 80㎡・前の屋根の右に並ぶ',r2&&{面積:area(r2.B)*0.25,前の右端:r2.ax,今の左端:r2.bx});
  ok(!errs.length,'⑤JSエラーなし',errs.slice(0,2));
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');
})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
