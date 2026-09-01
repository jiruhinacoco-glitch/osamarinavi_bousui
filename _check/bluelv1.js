/* 2026-08-23h の検証：
   ①GL+は青い面（防水面）だけ動く（躯体・パラペット不動・カメラ不動）
     「⬆ 躯体も合わせる」で初めて躯体が動く／境界の辺種別もそのときだけ変わる
   ②下地・防水仕様が屋根ごとに選べる（浮かぶ表のプルダウン・3Dの色/質感・積算の仕様別集計）
   ③引き出しの「部位」「下地」パネルは隠れ、回転の行は「選択中の辺」パネルへ（PCのみ）
   使い方: サーバー(8899)を立ててから  node _check/bluelv1.js   ／  node _check/bluelv1.js ph
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PH = process.argv[2]==='ph';
const URL='http://localhost:8899/zumen_sekisan.html';
let okN=0, ngN=0;
const chk=(name,cond,info)=>{ const m=(cond?'○ ':'★NG ')+name+(info?('  '+info):''); console.log(m); cond?okN++:ngN++; };

(async()=>{
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await br.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(_){}});
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{ if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(600);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){}});

  /* 2つの隣り合う屋根を作る（右の辺を共有）＋離れた塔屋ではなく単純な並び */
  await p.evaluate(()=>{
    localStorage.removeItem('nn_zumen_state_v1');
    const E=(n)=>Array.from({length:n},()=>({h:300,w:250,k:'para'}));
    state.polys=[
      {name:'屋根①',lv:0,pts:[{x:2,y:2},{x:12,y:2},{x:12,y:10},{x:2,y:10}],edges:E(4)},
      {name:'屋根②',lv:0,pts:[{x:12,y:2},{x:20,y:2},{x:20,y:10},{x:12,y:10}],edges:E(4)}
    ];
    state.active=0; saveState(); renderPolyList(); recalc(); draw();
  });
  await p.waitForTimeout(300);

  /* ---- 3Dを開く ---- */
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:15000});
  await p.waitForTimeout(500);

  const snap=await p.evaluate(()=>{
    const r={cam:{th:T.theta,ph:T.phi,r:T.r,tx:T.tx,tz:T.tz,voX:T.voX||0,voY:T.voY||0}, body:[], mem:[], wallTop:null};
    T.group.children.forEach(o=>{
      if(o.name==='nnBody') r.body.push({i:o.userData.bodyIdx,y:o.position.y});
      if(o.userData&&o.userData.polyIdx!=null) r.mem.push({i:o.userData.polyIdx,y:o.position.y});
    });
    /* パラペットの最高点（bbox） */
    let top=-1e9;
    T.group.traverse(o=>{ if(o.isMesh&&o.geometry&&o.geometry.computeBoundingBox){ try{
      o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      if(bb) top=Math.max(top, bb.max.y+o.position.y); }catch(_){}}});
    r.wallTop=top;
    return r;
  });

  /* ---- ① GL+＝青い面だけ ---- */
  await p.evaluate(()=>nnLvLive(0, 2, 1));
  await p.waitForTimeout(600);
  const after=await p.evaluate(()=>{
    const r={cam:{th:T.theta,ph:T.phi,r:T.r,tx:T.tx,tz:T.tz,voX:T.voX||0,voY:T.voY||0}, body:[], mem:[], kinds:[]};
    T.group.children.forEach(o=>{
      if(o.name==='nnBody') r.body.push({i:o.userData.bodyIdx,y:o.position.y});
      if(o.userData&&o.userData.polyIdx!=null) r.mem.push({i:o.userData.polyIdx,y:o.position.y});
    });
    r.kinds=state.polys.map(pl=>pl.edges.map(e=>e.k).join(','));
    r.bodyLv=state.polys.map(pl=>pl.bodyLv);
    return r;
  });
  const m0=after.mem.find(m=>m.i===0), b0=after.body.find(b=>b.i===0);
  chk('GL+2で青い面（防水面）だけ 2.012m に上がる', m0&&Math.abs(m0.y-2.012)<1e-6, 'mem.y='+(m0&&m0.y));
  /* ★2026-08-24q 仕様が変わった所（product は正しく、検査が古かった）。
     §160 の「GL+は青い面だけ動かす／躯体は別の高さを持つ」は、その後の本人の指示
     「真ん中の平場が躯体一緒に持ち上がるのが正しい動き」（§174・§176）で置き換わった。
     いまは高さの持ち主は平場（lv）ひとつだけで、bodyLv という項目は廃止した。 */
  chk('躯体も平場と一緒に上がる（本人の指示・§174）', b0&&Math.abs(b0.y-2)<1e-6, 'body.y='+(b0&&b0.y));
  chk('bodyLv という項目は持たない（廃止）', after.bodyLv[0]===undefined, String(after.bodyLv));
  chk('境界の辺種別は変わらない（GL+ではsyncしない）',
      after.kinds[0]===snapKinds(after,0)&&/para/.test(after.kinds[0]), after.kinds.join(' / '));
  function snapKinds(){ return 'para,para,para,para'; }
  const camSame=JSON.stringify(snap.cam)===JSON.stringify(after.cam);
  chk('カメラ7値は1つも変わらない', camSame, JSON.stringify(after.cam));

  /* ---- ⬆ 躯体も合わせる（廃止）----
     ★2026-08-24q 「躯体GL+」と「⬆ 躯体も合わせる」は3Dに一切効かない飾りだったので削除した。
     押しても何も起きないうえ、値が平場とずれると壁の足元や境界の辺の種別を古い高さで
     決めてしまい、塔屋が宙に浮く不具合になっていた。＝出ないことが正しい。 */
  const noBtn=await p.evaluate(()=>{
    state.active=0; if(window.nnPolySync)nnPolySync();
    const d=document.getElementById('nnPolyCard');
    return {なし:!(d&&/躯体も合わせる/.test(d.innerHTML)), 欄なし:!document.getElementById('nnPvBl'),
            関数なし:(typeof window.nnLvFollow==='undefined'&&typeof window.nnBlLive==='undefined')};
  });
  chk('カードに「⬆ 躯体も合わせる」は無い（廃止）', noBtn.なし, JSON.stringify(noBtn));
  chk('カードに「躯体GL+」の欄も無い', noBtn.欄なし);
  chk('効かない処理（nnLvFollow／nnBlLive）も残っていない', noBtn.関数なし);

  /* ---- ② 屋根ごとの仕様・下地 ---- */
  await p.evaluate(()=>{
    state.polys[1].spec='X-2'; state.polys[1].kouzou='w';
    saveState(); recalc(); draw(); dirty3d=true; build3D();
  });
  await p.waitForTimeout(600);
  const spx=await p.evaluate(()=>{
    const r={memColors:{},bodyColors:{},sek:document.getElementById('sekisan').innerHTML};
    T.group.children.forEach(o=>{
      if(o.userData&&o.userData.polyIdx!=null&&o.material&&o.material.color){
        /* ★2026-09-02a 屋根の質感（§255）が入ってからは、防水面の色は白で
           仕様の違いは「貼っている質感」で出る。質感があればそちらで見分ける。 */
        const im=o.material.map&&o.material.map.image;
        const u=(im&&(im.currentSrc||im.src))||'';
        const g=/roof_([a-z_]+)_c\.jpg/.exec(u);
        r.memColors[o.userData.polyIdx]= g? g[1] : o.material.color.getHex();
      }
      if(o.name==='nnBody'&&o.material&&o.material.color) r.bodyColors[o.userData.bodyIdx]=o.material.color.getHex();
    });
    const ed=nnEstimateData();
    r.rows=ed.rows.map(x=>x.n+'|'+x.q+'|'+x.p);
    r.calcOk=ed.rows.every(x=>Math.abs(x.q*x.p-Math.round(x.q*x.p))<1e-6);
    r.hiraRows=ed.rows.filter(x=>/平場防水/.test(x.n)).length;
    r.polySpecs=ed.polys.map(x=>x.spec);
    return r;
  });
  chk('3D：屋根②の防水面の色が屋根①と違う（仕様別）', spx.memColors[0]!==spx.memColors[1],
      JSON.stringify(spx.memColors));
  /* ★2026-08-27e からコンクリートの質感に写真を貼るようになり、
     写真を貼る材質は「いちばん明るい成分が1.0」になるよう色をそろえている（§227）。
     そのため木の 0xc9a97a は 0xffd79c として出る。どちらでも合格にする。 */
  chk('3D：屋根②の躯体が木造の色（下地別）', spx.bodyColors[1]===0xc9a97a||spx.bodyColors[1]===0xffd79c,
      '0x'+(spx.bodyColors[1]||0).toString(16));
  chk('3D：屋根①の躯体はRCのまま', spx.bodyColors[0]!==spx.bodyColors[1], '0x'+(spx.bodyColors[0]||0).toString(16));
  chk('積算：仕様別に集計（平場が2行・コード表記）', /平場（AS-T1）/.test(spx.sek)&&/平場（X-2）/.test(spx.sek), '');
  chk('積算：仕様が混在の注記が出る', /仕様別に集計/.test(spx.sek), '');
  chk('見積データ：平場防水が仕様ごとに2行', spx.hiraRows===2, spx.rows.join(' / '));
  chk('見積データ：polysに仕様コードが入る', spx.polySpecs[0]==='AS-T1'&&spx.polySpecs[1]==='X-2', String(spx.polySpecs));

  if(!PH){
    /* ---- 浮かぶ表のプルダウン ---- */
    await p.evaluate(()=>setTab('zu'));
    await p.waitForTimeout(400);
    const tbl=await p.evaluate(()=>{
      nnRoofTbl(true);
      const t=document.getElementById('nnRoofTbl');
      const r={vis:t&&getComputedStyle(t).display!=='none',
        kzN:t?t.querySelectorAll('select.rkz').length:0,
        spN:t?t.querySelectorAll('select.rsp').length:0,
        kzVal:t?[...t.querySelectorAll('select.rkz')].map(s=>s.value):[],
        spVal:t?[...t.querySelectorAll('select.rsp')].map(s=>s.value):[]};
      return r;
    });
    chk('表：下地プルダウンが屋根ごと（2個）', tbl.kzN===2, String(tbl.kzN));
    chk('表：仕様プルダウンが屋根ごと（2個）', tbl.spN===2, String(tbl.spN));
    chk('表：屋根②の値が選んだもの（w／X-2）', tbl.kzVal[1]==='w'&&tbl.spVal[1]==='X-2',
        tbl.kzVal.join(',')+' / '+tbl.spVal.join(','));
    const chg=await p.evaluate(()=>{
      const t=document.getElementById('nnRoofTbl');
      const s0=t.querySelectorAll('select.rsp')[0];
      s0.value='S-M2'; s0.dispatchEvent(new Event('change',{bubbles:true}));
      return {spec:state.polys[0].spec, sek:document.getElementById('sekisan').innerHTML};
    });
    chk('表：仕様を変えると保存され積算に反映', chg.spec==='S-M2'&&/S-M2/.test(chg.sek), chg.spec);
    const chg2=await p.evaluate(()=>{
      const t=document.getElementById('nnRoofTbl');
      const k0=t.querySelectorAll('select.rkz')[0];
      k0.value='sdeck'; k0.dispatchEvent(new Event('change',{bubbles:true}));
      return state.polys[0].kouzou;
    });
    chk('表：下地を変えると保存される', chg2==='sdeck', String(chg2));

    /* ---- ③ 引き出しのパネル ---- */
    const pan=await p.evaluate(()=>{
      const pl=document.getElementById('polylist');
      const pn=pl?pl.closest('.panel'):null;
      const kz=document.getElementById('nnKzPanel');
      const rot=document.getElementById('rotdeg');
      const ee=document.getElementById('edgeedit');
      const ep=ee?ee.closest('.panel'):null;
      return {polyHidden:pn?getComputedStyle(pn).display==='none':false,
              kzHidden:kz?getComputedStyle(kz).display==='none':true,
              rotMoved:!!(rot&&ep&&ep.contains(rot))};
    });
    chk('引き出し：部位パネルは隠れている', pan.polyHidden);
    chk('引き出し：下地パネルは隠れている', pan.kzHidden);
    chk('「選択部位を回転」は辺パネルへ移動', pan.rotMoved);
  }else{
    /* スマホ：パネルは今までどおり（表が無いため） */
    const pan=await p.evaluate(()=>{
      const pl=document.getElementById('polylist');
      const pn=pl?pl.closest('.panel'):null;
      return {polyShown:pn?getComputedStyle(pn).display!=='none':false,
              noTbl:!document.getElementById('nnRoofTbl')};
    });
    chk('スマホ：部位パネルは残っている', pan.polyShown);
    chk('スマホ：浮かぶ表は出さない（従来どおり）', pan.noTbl);
  }

  /* ---- 再読み込みで残るか ---- */
  await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){}});
  const per=await p.evaluate(()=>({
    lv:state.polys[0].lv,
    spec1:state.polys[1].spec, kz1:state.polys[1].kouzou }));
  chk('再読み込み：lv／仕様／下地が残る',
      per.lv===2&&per.spec1==='X-2'&&per.kz1==='w', JSON.stringify(per));

  chk('JSエラーなし', errs.length===0, errs.slice(0,3).join(' | '));
  console.log(PH?'[スマホ]':'[PC]', '○'+okN+' ★NG'+ngN);
  await br.close();
  process.exit(ngN?1:0);
})();
