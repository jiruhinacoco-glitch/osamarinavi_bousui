/* 図面：📐寸法で入れる 3回目（2026-10-25f）。スマホで実際に押して測る。
   ①コの字 3/4/4/4/3/8 → 64㎡・出隅6・入隅2（10×8−4×4 を自分で計算）
   ②立上り＋2回＝400mm・ドレン2か所 → 概算が「平場64×単価＋立上り17.6×単価＋天端11×単価＋ドレン2×8000」と一致（単価は SPECS の表から読む）
   ③置くと屋根の全辺が H400・ドレンが2つ屋根の内側に置かれる・初期値の欄（defH）は元のまま
   ④凸型 3/2/4/2/3/5 → 58㎡・出隅6・入隅2 ⑤はみ出し・JSエラーなし
   使い方: node _check/dimopt.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
const inPoly=(P,x,y)=>{let c=false; for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j]; if(((a.y>y)!==(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)) c=!c;} return c;};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof setTool==='function'&&typeof nnZMenuClose==='function');
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(e){} state.polys=[]; state.parts=[]; state.scaleM=0.5; document.getElementById('defH').value='300'; draw(); });
  await p.waitForTimeout(300);
  const T=async s=>{ await p.tap(s); };
  const type=async str=>{ for(const ch of str) await T(`#nnDimIn .dkeys [data-k="${ch}"]`); };
  const fill=async vals=>{ for(let i=0;i<vals.length;i++){ await type(vals[i]); if(i<vals.length-1) await T('#nnDimIn [data-k="next"]'); } };
  const ui=()=>p.evaluate(()=>({a:nnDimArea.textContent,c:nnDimCorner.textContent,h:nnDimH.textContent,d:nnDimDr.textContent,cost:nnDimCost.textContent,note:nnDimCostNote.textContent,go:!nnDimGo.disabled}));
  await p.evaluate(()=>nnDimInOpen()); await p.waitForSelector('#nnDimIn.on');
  await T('#nnDimIn [data-s="U"]'); await fill(['3','4','4','4','3','8']);
  let u=await ui(); ok(u.a==='64.00㎡'&&u.c==='出隅6・入隅2'&&u.go,'①コの字：64㎡・出隅6・入隅2',u);
  await T('#nnDimIn [data-t="hp"]'); await T('#nnDimIn [data-t="hp"]'); await T('#nnDimIn [data-t="dp"]'); await T('#nnDimIn [data-t="dp"]');
  u=await ui();
  /* 期待値を自分で計算（単価は表のデータを読むだけ） */
  const ex=await p.evaluate(()=>{ const sp=SPECS.find(x=>x.code===state.specCode)||SPECS[0]; const ago=!!(window.nnAgoDef&&nnAgoDef()); const w=+document.getElementById('defW').value;
    return {pr:sp.prices, ago, w, term:TERM_PRICE}; });
  const per=44, r1=v=>Math.round(v*10)/10;
  const want=64*ex.pr.hira + r1(per*0.4)*ex.pr.tachi + (ex.ago?0:r1(per*ex.w/1000)*ex.pr.tenba) + (ex.ago?per*ex.term:0) + 2*8000;
  ok(u.h==='400mm'&&u.d==='2か所'&&u.cost==='¥'+Math.round(want).toLocaleString(),'②立上り400mm・ドレン2か所で概算が自分の計算と一致',{表示:u.cost,計算:Math.round(want),内訳:u.note});
  const fit=await p.evaluate(()=>{ const W=document.documentElement.clientWidth,H=document.documentElement.clientHeight;
    return [...document.querySelectorAll('#nnDimIn button')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&(r.left<-1||r.right>W+1||r.top<-1||r.bottom>H+1);}).map(e=>e.textContent.trim()); });
  ok(!fit.length,'⑤ボタンが画面からはみ出さない',fit);
  await p.screenshot({path:(process.env.SHOT||'/tmp/dimopt')+'_1.png'});
  await T('#nnDimGo'); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{ const q=state.polys[0]; return {n:state.polys.length, hs:q.edges.map(e=>e.h), pts:q.pts, parts:(state.parts||[]).map(x=>({x:x.x,y:x.y})), defH:document.getElementById('defH').value}; });
  ok(r.n===1&&r.hs.length===8&&r.hs.every(h=>h===400)&&r.defH==='300','③置いた屋根の全辺が H400・初期値の欄は300のまま',{h:r.hs,defH:r.defH});
  ok(r.parts.length===2&&r.parts.every(q=>inPoly(r.pts,q.x,q.y)),'③ドレンが2つ、屋根の内側に置かれる',r.parts);
  await p.screenshot({path:(process.env.SHOT||'/tmp/dimopt')+'_2.png'});
  await p.evaluate(()=>nnDimInOpen()); await p.waitForSelector('#nnDimIn.on');
  await T('#nnDimIn [data-s="T"]'); await fill(['3','2','4','2','3','5']);
  u=await ui(); ok(u.a==='58.00㎡'&&u.c==='出隅6・入隅2','④凸型：58㎡・出隅6・入隅2',u);
  ok(!errs.length,'⑤JSエラーなし',errs.slice(0,2));
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');
})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
