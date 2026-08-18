/* 断面図の直接作成＋断面→3D変換（2026-08-18f） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(2500);

  /* ① 図面ゼロのまま③断面へ → 直接入力モードで断面図が描かれる */
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(800);
  const r1=await p.evaluate(()=>{
    const cv=document.getElementById('secCv'), c=cv.getContext('2d');
    const d=c.getImageData(0,0,cv.width,cv.height).data;
    let ink=0; for(let i=0;i<d.length;i+=16){ if(d[i]<200&&d[i+3]>200)ink++; }
    return {mode:_nnSecFreeMode(), free:getComputedStyle(document.getElementById('secFree')).display!=='none',
      note:document.getElementById('secNote').textContent, ink,
      polySel:document.getElementById('sec_poly').value};
  });
  ok('図面ゼロでも③断面が直接入力モードで開く', r1.mode&&r1.free&&r1.polySel==='free', r1.polySel);
  ok('断面詳細図が描かれている（案内文だけで終わらない）', r1.ink>500 && /立上り 300/.test(r1.note), {ink:r1.ink, note:r1.note});
  await p.screenshot({path:'out/chk_sec_free.png'});

  /* ② H・W・種別を変えると追従 */
  await p.evaluate(()=>{ document.getElementById('secF_h').value=500; document.getElementById('secF_h').dispatchEvent(new Event('change')); });
  await p.waitForTimeout(300);
  ok('Hを500に変えると図が追従', await p.evaluate(()=>/立上り 500/.test(document.getElementById('secNote').textContent)));
  await p.evaluate(()=>{ const k=document.getElementById('secF_k'); k.value='kabe'; k.dispatchEvent(new Event('change')); });
  await p.waitForTimeout(300);
  ok('壁当りに変えると天端W欄が消える', await p.evaluate(()=>document.getElementById('secF_w').style.display==='none'));
  await p.evaluate(()=>{ const k=document.getElementById('secF_k'); k.value='para'; k.dispatchEvent(new Event('change')); });

  /* ③ ⬔ 3Dで見る → 仮部位（パラペット1辺・500）で3Dが組まれる */
  await p.evaluate(()=>nnSec3D()); await p.waitForTimeout(3200);
  const r3=await p.evaluate(()=>{
    const g=T&&T.group;
    return {tab:tab, kids:g?g.children.length:0,
      polysReal:state.polys.length,      /* ★元の図面データは空のまま（差し替えは組む瞬間だけ） */
      th:+T.theta.toFixed(2), ph:+T.phi.toFixed(2)};
  });
  ok('④3Dタブに移り、モックアップが組まれる', r3.tab==='d3'&&r3.kids>5, {kids:r3.kids});
  ok('元の図面データは汚れていない（polys=0のまま）', r3.polysReal===0, r3.polysReal);
  ok('斜めアングルで表示', Math.abs(r3.th-(Math.PI/2+0.5))<0.01 && Math.abs(r3.ph-0.95)<0.01, {th:r3.th,ph:r3.ph});
  await p.screenshot({path:'out/chk_sec_3d.png'});

  /* ④ PDF：直接入力モードで発行できる（window.open が開く） */
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(500);
  const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>document.getElementById('sec_pdf').click())]);
  await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(700);
  const doc=await pop.evaluate(()=>({t:document.title||'', txt:document.body.textContent.slice(0,400),
    has:/断面詳細図/.test(document.body.textContent), h500:/500/.test(document.body.textContent)}));
  ok('直接入力のままPDFが出る（断面詳細図・H500入り）', doc.has&&doc.h500);
  await pop.close();

  /* ⑤ ①図面に戻る→サンプル→ヘッダー④3D＝いつもの図面の3D（モックアップが残らない） */
  await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const b=document.getElementById('tl_sample'); if(b)b.click(); }); await p.waitForTimeout(800);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(2500);
  const r5=await p.evaluate(()=>({kids:T.group.children.length, polys:state.polys.length}));
  ok('通常の④3Dは本物の図面で組まれる（部位3つ・子が多い）', r5.polys>=3 && r5.kids>20, r5);

  /* ⑥ 図面がある状態でも③断面→⬔3D（代表値でモックアップ） */
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(400);
  await p.evaluate(()=>nnSec3D()); await p.waitForTimeout(2200);
  const r6=await p.evaluate(()=>({kids:T.group.children.length, polys:state.polys.length}));
  ok('図面ありでも断面→3D（仮部位1つぶんの子・図面は3部位のまま）', r6.polys>=3 && r6.kids<r5.kids, {mock:r6.kids, real:r5.kids});
  ok('JSエラーなし', errs.length===0, errs);
  console.log(R.join('\n'));
  await b.close();
})();
