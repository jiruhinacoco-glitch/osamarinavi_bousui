/* ★2026-08-27c 取り合い（仕様の違う屋根どうしの境界）の検証
   本人の指示「塗膜防水と露出防水の取り合い・露出アスと塗膜アスの取り合いを
   3Dで見せながら打ち合わせできるように」。
   ・隣り合う屋根で平場の仕様が違う境界を自動で見つけるか
   ・納まり3種（見切り＋シール／重ね／立上りで縁切り）を選べるか
   ・3D・図面(2D)・積算に出るか／保存して開き直しても残るか
   使い方: node _check/toriai.js  ／ スマホは node _check/toriai.js ph */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const TWO=`
  state.polys=[
    {name:'屋根①', lv:0, spec:'X-2',   pts:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))},
    {name:'屋根②', lv:0, spec:'AS-T1', pts:[{x:10,y:0},{x:20,y:0},{x:20,y:8},{x:10,y:8}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
  state.active=0; state.scaleM=0.5; saveState(); nnSyncSharedEdges(); renderPolyList(); recalc(); draw();`;
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                            :{viewport:{width:1600,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

  /* --- ① 仕様が同じうちは取り合いにならない --- */
  const same=await p.evaluate(()=>{
    state.polys=[
      {name:'屋根①', lv:0, spec:'AS-T1', pts:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],
        edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))},
      {name:'屋根②', lv:0, spec:'AS-T1', pts:[{x:10,y:0},{x:20,y:0},{x:20,y:8},{x:10,y:8}],
        edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; state.scaleM=0.5; saveState(); nnSyncSharedEdges(); recalc();
    return nnToriaiList().length;
  });
  ok('仕様が同じ隣どうしは取り合いにしない', same===0, same+'件');

  /* --- ② 高さ（GL+）が違えば取り合いではない（パラペット／壁当りで縁が切れる） --- */
  const lvdiff=await p.evaluate(()=>{
    state.polys[1].spec='X-2'; state.polys[1].lv=3; saveState(); nnSyncSharedEdges(); recalc();
    const n=nnToriaiList().length; state.polys[1].lv=0; saveState(); nnSyncSharedEdges(); recalc();
    return n;
  });
  ok('高さが違う境界は取り合いにしない', lvdiff===0, lvdiff+'件');

  /* --- ③ 仕様が違えば自動で見つかる --- */
  const f=await p.evaluate(t=>{ eval(t); const L=nnToriaiList();
    return {n:L.length, len:L[0]?Math.round(L[0].lenM*10)/10:0,
      a:L[0]?L[0].spA.code:'', bb:L[0]?L[0].spB.code:'', kind:L[0]?L[0].kind:''}; }, TWO);
  ok('仕様が違う境界を自動で見つける', f.n===1, f.n+'件');
  ok('長さが図面と合う（8マス×0.5m＝4.0m）', Math.abs(f.len-4)<0.05, f.len+'m');
  ok('両側の仕様が分かる', f.a==='X-2'&&f.bb==='AS-T1', f.a+'／'+f.bb);
  ok('既定の納まりは「見切り＋シール」', f.kind==='mikiri', f.kind);

  /* --- ④ 積算に出る（数量＝長さ・金額＝長さ×単価） --- */
  const sk=await p.evaluate(()=>{
    const tr=[...document.querySelectorAll('#sekisan tr')].map(t=>[...t.children].map(c=>c.textContent.trim()))
      .filter(c=>/取り合い/.test(c[0]||''));
    return {rows:tr, price:NN_TOR_KINDS.mikiri.price};
  });
  const row=sk.rows[0]||[];
  const num=s=>parseFloat(String(s).replace(/[^0-9.]/g,''))||0;
  ok('積算に「取り合い処理」の行が出る', sk.rows.length===1, JSON.stringify(row));
  ok('積算の数量が長さと合う', Math.abs(num(row[1])-4)<0.05, row[1]);
  ok('積算の金額＝数量×単価', Math.abs(num(row[3])-4*sk.price)<2, row[3]+'（'+4*sk.price+'）');

  /* --- ⑤ 納まりを3種とも選べる。3Dにも出る --- */
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.renderer;}catch(_){return false;}},null,{timeout:15000});
  await p.waitForTimeout(600);
  const g3=async k=>await p.evaluate(kk=>{ nnTorSet(0,kk);
    let g=null; T.scene.traverse(o=>{ if(o.name==='nnToriai')g=o; });
    const L=nnToriaiList();
    return {kind:L[0].kind, n:g?g.children.length:-1,
      x:g&&g.children[0]?+g.children[0].position.x.toFixed(2):null,
      y:g&&g.children[0]?+g.children[0].position.y.toFixed(3):null,
      row:([...document.querySelectorAll('#sekisan tr')].map(t=>t.textContent).find(t=>/取り合い/.test(t))||'').trim()};
  },k);
  const m=await g3('mikiri'), ka=await g3('kasane'), ta=await g3('tachi');
  ok('見切り＋シール：3Dに部材が出る（境界の真上）', m.n>=2 && Math.abs(m.x-5)<0.05 && m.y<0.05, JSON.stringify(m));
  ok('重ね：3Dに帯が出る（境界からずれた位置に乗る）', ka.n>=2 && Math.abs(ka.x-5)>0.02, JSON.stringify(ka));
  ok('立上りで縁切り：3Dに立上りが出る（高さ100mm）', ta.n>=2 && ta.y>0.03, JSON.stringify(ta));
  ok('納まりを変えると積算も変わる', /立上り/.test(ta.row), ta.row);

  /* --- ⑥ 「重ね」の乗せる側を入れ替えられる --- */
  const sw=await p.evaluate(()=>{ nnTorSet(0,'kasane');
    const b1=nnToriaiList()[0].up; nnTorSwap(0); const b2=nnToriaiList()[0].up;
    let g=null; T.scene.traverse(o=>{ if(o.name==='nnToriai')g=o; });
    return {before:b1, after:b2, x:g&&g.children[0]?+g.children[0].position.x.toFixed(2):null};
  });
  ok('乗せる側を入れ替えられる', sw.before!==sw.after, JSON.stringify(sw));

  /* --- ⑦ 一覧の小窓 --- */
  await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(500);
  await p.click('#tl_tor'); await p.waitForTimeout(500);
  const bx=await p.evaluate(()=>{
    const d=document.getElementById('nnTorBox');
    const g=x=>{const e=document.querySelector(x); return e?e.getBoundingClientRect():null;};
    const o=(a,b2)=>a&&b2&&!(a.right<=b2.left||a.left>=b2.right||a.bottom<=b2.top||a.top>=b2.bottom);
    const t=d.getBoundingClientRect();
    return {open:d.classList.contains('on'), rows:d.querySelectorAll('.tri').length,
      btn:d.querySelectorAll('.tri .trb button').length,
      swap:!!d.querySelector('.trs'),
      画面内:(t.left>=-1&&t.right<=innerWidth+1&&t.top>=-1&&t.bottom<=innerHeight+1),
      表と重なる:o(t,g('#nnRoofTbl')), 帯と重なる:o(t,g('#toolbar'))};
  });
  ok('一覧の小窓が開く', bx.open && bx.rows===1, JSON.stringify(bx));
  ok('納まりの3ボタンが出る', bx.btn===3, bx.btn+'個');
  ok('小窓が画面内・屋根の表とツールバーに重ならない',
     bx.画面内 && !bx.表と重なる && !bx.帯と重なる, JSON.stringify(bx));

  /* --- ⑧ 保存して開き直しても残る --- */
  await p.evaluate(()=>{ nnTorSet(0,'tachi'); saveState(); });
  await p.reload(); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const after=await p.evaluate(()=>{ const L=nnToriaiList();
    return {n:L.length, kind:L[0]?L[0].kind:''}; });
  ok('開き直しても取り合いと納まりが残る', after.n===1 && after.kind==='tachi', JSON.stringify(after));

  await p.evaluate(()=>{ state.polys=[]; state.active=-1; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((PH?'== スマホ ==\n':'== パソコン ==\n')+R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'':'全部○');
  await b.close();
})();
