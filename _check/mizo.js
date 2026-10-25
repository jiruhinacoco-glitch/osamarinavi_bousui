/* 図面：⊓ 溝・帯をつける（2026-10-25h）。スマホで実際に押して、出来上がった2つの屋根を測る。
   外形 12.4×9.4m（パラペット600）の右と手前の2辺に、幅1.2m・間の立上り幅200高さ200・段差200 の溝を「内側に作る」
   ①平場＝11.0×8.0＝88㎡（12.4−1.2−0.2 ×9.4−1.2−0.2）②溝＝12.4×9.4−11.2×8.2＝24.72㎡のL字（自分で計算）
   ③辺の種類：平場の溝側＝立上り200・天端200／溝の外側＝パラペット800（600＋段差）／溝の内側＝立上り400・天端0
   ④段差：元の高さGL0なので平場をGL+0.2（躯体の基準 wallLv も0.2＝平場から測った立上りの意味が変わらない）、溝はGL0
   ⑤とびとびの辺・全部の辺は断る ⑥外側に足す（平場はそのまま・溝が外に）⑦戻るで元に戻る ⑧はみ出し・JSエラーなし
   使い方: node _check/mizo.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
const area=P=>{let a=0; for(let i=0;i<P.length;i++){const u=P[i],v=P[(i+1)%P.length]; a+=u.x*v.y-v.x*u.y;} return Math.abs(a)/2;};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof nnZMenuClose==='function'&&typeof setTool==='function');
  const reset=()=>p.evaluate(()=>{ const E=()=>({h:600,w:250,k:'para'}); state.scaleM=1;
    state.polys=[{name:'屋上',lv:0,pts:[{x:0,y:0},{x:12.4,y:0},{x:12.4,y:9.4},{x:0,y:9.4}],edges:[E(),E(),E(),E()],holes:[]}]; state.active=0; saveState(); renderPolyList(); draw(); });
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(e){} }); await reset(); await p.waitForTimeout(300);
  const btn=await p.$('#tl_mizo'); ok(!!btn&&!!(await btn.boundingBox()),'⊓溝・帯のボタンが道具の並びに見える');
  await (btn?btn.tap():p.evaluate(()=>nnMizoOpen())); await p.waitForSelector('#nnMizo.on');
  const tapEdge=async e=>{ await p.tap(`#nnMizo g.medge[data-e="${e}"]`); };
  /* ⑤ とびとび（右と左）は断る */
  await tapEdge(1); await tapEdge(3);
  let u=await p.evaluate(()=>({h:nnMizoHint.textContent,go:!nnMizoGo.disabled}));
  ok(!u.go&&/とびとび/.test(u.h),'⑤とびとびの辺は断る',u);
  await tapEdge(3); await tapEdge(2);
  u=await p.evaluate(()=>({h:nnMizoHint.textContent,go:!nnMizoGo.disabled,a1:nnMizoA1.textContent,a2:nnMizoA2.textContent}));
  ok(u.go&&u.a1==='88.00㎡'&&u.a2==='24.72㎡','①②入力画面で 平場88㎡・溝24.72㎡ がその場で出る',u);
  const fit=await p.evaluate(()=>{ const W=document.documentElement.clientWidth,H=document.documentElement.clientHeight;
    return [...document.querySelectorAll('#nnMizo button,#nnMizo input')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&(r.left<-1||r.right>W+1||r.top<-1||r.bottom>H+1);}).map(e=>e.textContent.trim()||e.id); });
  ok(!fit.length,'⑧入力画面がはみ出さない',fit);
  await p.screenshot({path:(process.env.SHOT||'/tmp/mizo')+'_1.png'});
  await p.tap('#nnMizoGo'); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>state.polys.map(q=>({n:q.name,lv:q.lv,wl:q.wallLv,pts:q.pts,e:q.edges.map(e=>e.k+':'+e.h+'/'+e.w)})));
  ok(r.length===2&&Math.abs(area(r[0].pts)-88)<1e-6&&Math.abs(area(r[1].pts)-24.72)<1e-6,'①②屋根が平場88㎡と溝24.72㎡の2つに分かれる',r.map(q=>[q.n,area(q.pts)]));
  const xs=r[0].pts.map(q=>q.x), ys=r[0].pts.map(q=>q.y);
  ok(Math.abs(Math.max(...xs)-11)<1e-6&&Math.abs(Math.max(...ys)-8)<1e-6&&Math.min(...xs)===0&&Math.min(...ys)===0,'①平場は (0,0)〜(11.0,8.0)',{x:[Math.min(...xs),Math.max(...xs)],y:[Math.min(...ys),Math.max(...ys)]});
  const de=r[0].e.join(','), ce=r[1].e;
  ok(de==='para:600/250,para:200/200,para:200/200,para:600/250','③平場：奥と左はパラペットのまま・溝側2辺は立上り200・天端200',de);
  ok(ce.length===6&&ce.filter(x=>x==='para:800/250').length===4&&ce.filter(x=>x==='para:400/0').length===2,'③溝：外側と両端はパラペット800・内側は立上り400（天端なし）',ce);
  ok(r[0].lv===0.2&&r[0].wl===0.2&&r[1].lv===0,'④段差：平場GL+0.2（躯体の基準も0.2）・溝GL0',{平場:r[0].lv,基準:r[0].wl,溝:r[1].lv});
  await p.screenshot({path:(process.env.SHOT||'/tmp/mizo')+'_2.png'});
  /* ⑦ 戻る */
  await p.evaluate(()=>undoStep()); await p.waitForTimeout(200);
  const back=await p.evaluate(()=>({n:state.polys.length,a:state.polys[0].pts.length}));
  ok(back.n===1&&back.a===4,'⑦戻るで元の1つの屋根に戻る',back);
  /* ⑤ 全部の辺 */
  await reset(); await p.evaluate(()=>nnMizoOpen()); await p.waitForSelector('#nnMizo.on');
  for(const e of [0,1,2,3]) await tapEdge(e);
  u=await p.evaluate(()=>({h:nnMizoHint.textContent,go:!nnMizoGo.disabled})); ok(!u.go&&/全部の辺/.test(u.h),'⑤全部の辺は断る',u);
  /* ⑥ 外側に足す（右の1辺） */
  for(const e of [0,2,3]) await tapEdge(e);
  await p.tap('#nnMizo [data-m="out"]'); await p.tap('#nnMizoGo'); await p.waitForTimeout(200);
  const r2=await p.evaluate(()=>state.polys.map(q=>({pts:q.pts})));
  const x2=r2[1]?r2[1].pts.map(q=>q.x):[];
  ok(r2.length===2&&Math.abs(area(r2[0].pts)-12.4*9.4)<1e-6&&Math.abs(area(r2[1].pts)-1.2*9.4)<1e-6&&Math.abs(Math.min(...x2)-12.6)<1e-6,
     '⑥外側に足す：平場はそのまま116.56㎡・右の外0.2m先に幅1.2mの溝11.28㎡',r2.map(q=>area(q.pts)));
  /* ⑨ ほぼ一直線の角（指でかくとよくできる：上の辺が真ん中で5cmだけ折れている）。上の左半分だけに溝 → 巨大な形にならない */
  await p.evaluate(()=>{ const E=()=>({h:600,w:250,k:'para'}); state.scaleM=1;
    state.polys=[{name:'屋上',lv:0,pts:[{x:0,y:0},{x:6.2,y:0.05},{x:12.4,y:0},{x:12.4,y:9.4},{x:0,y:9.4}],edges:[E(),E(),E(),E(),E()],holes:[]}]; state.active=0; saveState(); renderPolyList(); draw(); nnMizoOpen(); });
  await p.waitForSelector('#nnMizo.on'); await p.tap('#nnMizo [data-m="in"]'); await tapEdge(0);
  const u9=await p.evaluate(()=>({go:!nnMizoGo.disabled,a1:nnMizoA1.textContent,a2:nnMizoA2.textContent,h:nnMizoHint.textContent}));
  const a1=parseFloat(u9.a1), a2=parseFloat(u9.a2);
  ok(u9.go&&Math.abs(a1-(116.6-6.2*1.4))<0.5&&Math.abs(a2-6.2*1.2)<0.1,'⑨ほぼ一直線の角でも巨大な形にならず、溝は端をまっすぐ切って約7.44㎡（6.2×1.2）・平場は約107.9㎡',u9);
  ok(!errs.length,'⑧JSエラーなし',errs.slice(0,2));
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');
})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
