/* 断面を「描く」方式（2026-08-18g）：作図・閉じる・防水層・3D押し出し・PDF */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(2500);

  /* ① 図面ゼロで③断面 → 作図キャンバスが出る */
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(900);
  const r1=await p.evaluate(()=>({on:document.getElementById('sdWrap').classList.contains('on'),
    tools:['sd_draw','sd_wp','sd_undo','sd_redo','sd_clear','sd_cell','sd_depth'].every(i=>!!document.getElementById(i)),
    note:document.getElementById('secNote').textContent, sel:document.getElementById('sec_poly').value,
    label:document.getElementById('sec_poly').options[0].textContent}));
  ok('図面ゼロで断面の作図キャンバスが開く', r1.on&&r1.tools&&r1.sel==='free', r1.sel);
  ok('選択肢が「断面を描く」', /断面を描く/.test(r1.label), r1.label);
  ok('案内が出ている（道具ごとの使い方・2026-08-19b〜）', /描く|輪郭を描いて/.test(r1.note), r1.note);

  /* ② 平面図と同じ操作でパラペット断面を描く（座標→画面へ変換して実タップ） */
  const w2s=await p.evaluate(()=>{ const f=(x,y)=>{ /* 内部の X(),Y() は非公開なので同じ式で作る */ return null; }; return true; });
  /* 世界→画面は内部変数なので、実タップは「画面座標から世界へ」戻して検算する方式にする */
  const box=await p.evaluate(()=>{ const r=document.getElementById('sdCv').getBoundingClientRect();
    return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  const tap=async(fx,fy)=>{ await p.touchscreen.tap(box.x+box.w*fx, box.y+box.h*fy); await p.waitForTimeout(200); };
  await tap(0.30,0.72); await tap(0.55,0.72); await tap(0.55,0.34); await tap(0.62,0.34); await tap(0.62,0.80); await tap(0.30,0.80);
  const r2=await p.evaluate(()=>({n:state.sect.pts.length, closed:state.sect.closed,
    allSnapped:state.sect.pts.every(p=>Math.abs(p.x*10000-Math.round(p.x*10000))<1e-6)}));
  ok('6点が打てる（照準方式・スマホ）', r2.n===6, r2.n);
  await p.screenshot({path:'out/chk_sd_draw.png'});

  /* ③ 始点をタップで閉じる */
  /* 始点の画面位置を出して、照準（右上+36,-52）がそこに来るようタップする */
  const st=await p.evaluate(()=>{ const s=state.sect, q=nnSdXY(s.pts[0].x,s.pts[0].y),
    r=document.getElementById('sdCv').getBoundingClientRect(); return {x:r.x+q.x-36, y:r.y+q.y+52}; });
  await p.touchscreen.tap(st.x, st.y); await p.waitForTimeout(350);
  const r3=await p.evaluate(()=>({closed:state.sect.closed, n:state.sect.pts.length}));
  ok('始点をタップで閉じる', r3.closed===true, r3);

  /* ④ 防水層の指定：辺をタップ */
  await p.evaluate(()=>document.getElementById('sd_wp').click()); await p.waitForTimeout(200);
  const em=await p.evaluate(()=>{ const s=state.sect, a=s.pts[0], b=s.pts[1],
    q=nnSdXY((a.x+b.x)/2,(a.y+b.y)/2), r=document.getElementById('sdCv').getBoundingClientRect();
    return {x:r.x+q.x, y:r.y+q.y}; });
  await p.touchscreen.tap(em.x, em.y); await p.waitForTimeout(350);
  const r4=await p.evaluate(()=>state.sect.wp.length);
  ok('辺をタップで防水層に指定できる', r4>=1, r4);
  await p.screenshot({path:'out/chk_sd_wp.png'});

  /* ⑤ 戻る／全消しが効く（消したあと描き直す） */
  await p.evaluate(()=>document.getElementById('sd_undo').click()); await p.waitForTimeout(200);
  ok('戻るで防水層の指定が戻る', await p.evaluate(()=>state.sect.wp.length)===r4-1);
  await p.evaluate(()=>document.getElementById('sd_redo').click()); await p.waitForTimeout(200);
  ok('進むでやり直せる', await p.evaluate(()=>state.sect.wp.length)===r4);

  /* ⑥ マス目盛の切替 */
  const c0=await p.evaluate(()=>state.sect.cell);
  await p.evaluate(()=>document.getElementById('sd_cell').click()); await p.waitForTimeout(200);
  ok('マス目盛が切り替わる', await p.evaluate(()=>state.sect.cell)!==c0);
  await p.evaluate(()=>{ state.sect.cell=0.1; document.getElementById('sd_cell').textContent='▦ 100mm'; });

  /* ⑦ 3D：押し出しの立体が出る */
  await p.evaluate(()=>{ document.getElementById('sd_depth').value='3'; document.getElementById('sd_depth').dispatchEvent(new Event('change')); });
  
  await p.evaluate(()=>nnSec3D()); await p.waitForTimeout(4000);
  const r7=await p.evaluate(()=>{
    let body=0, wp=0;
    T.group.traverse(o=>{ if(o.isMesh){ if(o.name==='nnSectWp')wp++; else body++; } });
    return {tab, body, wp, polys:state.polys.length, mode:nnSectIs3D()};
  });
  ok('④3Dに移り、断面を押し出した立体ができる', r7.tab==='d3'&&r7.body>=1, r7);
  ok('防水層に指定した辺の帯も立体になる', r7.wp>=1, r7.wp);
  /* ★帯が躯体の「外」に出ているか（中に埋まっていたら見えない） */
  const outside=await p.evaluate(()=>{
    const s=state.sect; let ok=true;
    T.group.traverse(o=>{ if(o.isMesh&&o.name==='nnSectWp'){
      o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      const cx=(bb.min.x+bb.max.x)/2, cy=(bb.min.y+bb.max.y)/2;
      let inside=false;
      for(let i=0,j=s.pts.length-1;i<s.pts.length;j=i++){
        const xi=s.pts[i].x, yi=s.pts[i].y, xj=s.pts[j].x, yj=s.pts[j].y;
        if(((yi>cy)!==(yj>cy)) && (cx < (xj-xi)*(cy-yi)/((yj-yi)||1e-12)+xi)) inside=!inside;
      }
      if(inside) ok=false;
    }});
    return ok;
  });
  ok('防水層の帯が躯体の外側に付く（中に埋まらない）', outside);
  ok('元の図面データは汚れない（polys=0）', r7.polys===0, r7.polys);
  await p.screenshot({path:'out/chk_sd_3d.png'});

  /* ⑧ PDF：描いた断面のPDFが出る */
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(600);
  const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>document.getElementById('sec_pdf').click())]);
  await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(800);
  const doc=await pop.evaluate(()=>({txt:document.body.textContent,
    paths:document.querySelectorAll('svg path').length, dims:document.querySelectorAll('svg text').length}));
  /* 図の本体＝<path>（躯体の輪郭＋防水層の帯）。寸法は line/text で描かれるので paths は2で正しい */
  ok('描いた断面のPDFが出る（断面詳細図・全幅/全高・層構成・注記）',
     /断面詳細図/.test(doc.txt)&&/全幅/.test(doc.txt)&&/全高/.test(doc.txt)
     &&/工法・層構成/.test(doc.txt)&&/注記/.test(doc.txt)&&doc.paths>=2&&doc.dims>10,
     {paths:doc.paths, texts:doc.dims, 断面詳細図:/断面詳細図/.test(doc.txt), 全幅:/全幅/.test(doc.txt),
      全高:/全高/.test(doc.txt), 層構成:/工法・層構成/.test(doc.txt), 注記:/注記/.test(doc.txt)});
  await pop.screenshot({path:'out/chk_sd_pdf.png'});
  await pop.close();

  /* ⑨ 再読み込みしても描いた断面が残る（state に入っている） */
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(2600);
  const r9=await p.evaluate(()=>({n:(state.sect&&state.sect.pts||[]).length, closed:state.sect&&state.sect.closed,
    wp:(state.sect&&state.sect.wp||[]).length, depth:state.sect&&state.sect.depth}));
  ok('再読み込みしても断面が残る', r9.n===6&&r9.closed===true&&r9.wp>=1&&r9.depth===3, r9);

  /* ⑩ 図面を描いたら断面タブは従来どおり部位で開く */
  await p.evaluate(()=>{ const b=document.getElementById('tl_sample'); if(b)b.click(); }); await p.waitForTimeout(900);
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(700);
  const r10=await p.evaluate(()=>({sel:document.getElementById('sec_poly').value,
    draw:document.getElementById('sdWrap').classList.contains('on'),
    note:document.getElementById('secNote').textContent}));
  ok('図面ができたら従来の自動断面で開く', r10.sel!=='free'&&!r10.draw&&/立上り/.test(r10.note), r10);
  /* 描くモードに戻せる */
  await p.evaluate(()=>{ const sp=document.getElementById('sec_poly'); sp.value='free'; sp.dispatchEvent(new Event('change')); });
  await p.waitForTimeout(500);
  ok('自分で選べば描くモードに戻せる', await p.evaluate(()=>document.getElementById('sdWrap').classList.contains('on')));
  ok('JSエラーなし', errs.length===0, errs);
  console.log(R.join('\n'));
  await b.close();
})();
