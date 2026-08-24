/* 2026-08-23k：3Dで壁の面をクリック→赤くハイライト（面全体＋点線枠）→押出し・引込み／
   屋根名が枠に収まる／build3D の速さ実測  node _check/face1.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let okN=0,ngN=0;
const chk=(n,c,i)=>{ console.log((c?'○ ':'★NG ')+n+(i!==undefined?('  '+JSON.stringify(i)):'')); c?okN++:ngN++; };
const SCR=`(x,y,z)=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
  const q=new THREE.Vector3(x,y,z).project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; }`;
(async()=>{
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await (await br.newContext({viewport:{width:1600,height:900}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(900);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){} localStorage.removeItem('nn_zumen_rtblpos'); });

  /* メイン屋根＋その上の塔屋（写真と同じ形） */
  await p.evaluate(()=>{
    const E=n=>Array.from({length:n},()=>({h:300,w:250,k:'para'}));
    state.polys=[
      {name:'屋根①（メイン屋根・南面）',lv:0,bodyLv:0,pts:[{x:0,y:0},{x:24,y:0},{x:24,y:16},{x:0,y:16}],edges:E(4)},
      {name:'塔屋③',lv:3,bodyLv:3,pts:[{x:14,y:4},{x:20,y:4},{x:20,y:10},{x:14,y:10}],edges:E(4)}
    ];
    state.active=1; state.specCode='AS-T1'; state.scaleM=0.5; saveState(); renderPolyList(); recalc(); draw();
    setTab('d3');
  });
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:15000});
  await p.evaluate(()=>d3ViewIso()); await p.waitForTimeout(900);
  await p.evaluate(()=>{ setTool('sel'); try{nnRoofFold(true);}catch(_){} }); await p.waitForTimeout(300);

  /* 塔屋の壁（南側 y=4マス→2m・x=17マス→8.5m・高さ1.5m）をクリック */
  const pt=await p.evaluate(`(${SCR})(8.5, 2.4, 2.0)`);   /* 塔屋の壁の上のほう（手前の低い判定を避ける） */
  await p.mouse.click(pt.x,pt.y); await p.waitForTimeout(500);
  const hl=await p.evaluate(()=>{
    let m=null,dash=0;
    T.scene.traverse(o=>{ if(o.isMesh&&o.material&&o.material.color&&o.material.opacity>0.3&&o.material.opacity<0.6
      && o.renderOrder===999) m=o;
      if(o.type==='LineSegments'&&o.material&&o.material.isLineDashedMaterial) dash++; });
    if(!m)return null;
    m.geometry.computeBoundingBox(); const bb=m.geometry.boundingBox;
    return {col:'0x'+m.material.color.getHex().toString(16), h:+(bb.max.y-bb.min.y).toFixed(2),
      y:+m.position.y.toFixed(2), dash, sel:(typeof sel!=='undefined'&&sel)?{p:sel.p,e:sel.e}:null};
  });
  chk('壁の面をクリックすると選ばれる', hl&&hl.sel&&hl.sel.p===1, hl&&hl.sel);
  chk('ハイライトが赤（#ff4136）', hl&&hl.col==='0xff4136', hl&&hl.col);
  /* ★2026-08-23u ハイライトは「選んだ1面だけの板」。高さは面の種類で変わるので
     「パラペット全体（躯体＋立上り）ほど高くない」ことだけを見る。
     ★点線の枠は本人の指示で廃止（2026-08-23r）。 */
  chk('赤くなるのは選んだ1面だけ（パラペット全体ではない）', hl&&hl.h<3.4, hl&&hl.h);
  chk('赤い点線の枠は出さない（本人の指示）', hl&&hl.dash===0, hl&&hl.dash);
  /* ★2026-08-24p ここは「ページのどこかに同じ文字があるか」を見ていただけで、
     何を選んでいても必ず通る空振りの判定だった（実際、廃止されたカードでも○になっていた）。
     いまは「左下の編集カードは出さない（本人の指示・2026-08-23p）」ことを確かめる。
     押し出しそのものは、このすぐ下で面積の変化を見て確かめている＝そちらが本物の判定。 */
  const cd=await p.evaluate(()=>{
    const d=document.getElementById('d3edit');
    return {ある:!!d, 中身:(d&&d.textContent||'').trim().slice(0,20), 見えて:!!(d&&d.style.display!=='none')};
  });
  chk('左下の辺の編集カードは出さない（本人の指示で廃止）', !cd.中身, cd);

  /* 押出し：塔屋の南面が外へ0.5m → 面積が増える */
  const a0=await p.evaluate(()=>+polyAreaM(state.polys[1].pts,state.scaleM).toFixed(2));
  /* ★2026-08-23u 平場も選べるようになったので、壁の辺を選んでいることを確かめてから押し出す */
  await p.evaluate(()=>{ if(!sel||sel.f==='deck'||sel.e<0) pick3({p:1,r:-1,e:0,f:'out'}); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>nnEdgeOffset(0.5)); await p.waitForTimeout(600);
  const a1=await p.evaluate(()=>+polyAreaM(state.polys[1].pts,state.scaleM).toFixed(2));
  chk('押出しで面が外へ動く（面積が増える）', a1>a0+1.4, {前:a0,後:a1});
  await p.evaluate(()=>nnEdgeOffset(-0.5)); await p.waitForTimeout(600);
  const a2=await p.evaluate(()=>+polyAreaM(state.polys[1].pts,state.scaleM).toFixed(2));
  chk('引込みで元に戻る', Math.abs(a2-a0)<0.05, {戻り:a2,元:a0});
  const cam=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4)).join(','));
  await p.evaluate(()=>nnEdgeOffset(0.5)); await p.waitForTimeout(500);
  const cam2=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4)).join(','));
  chk('押出ししてもカメラは動かない', cam===cam2);
  await p.evaluate(()=>nnEdgeOffset(-0.5)); await p.waitForTimeout(400);

  /* 屋根名が枠に収まる */
  await p.evaluate(()=>{ setTab('zu'); try{nnRoofFold(false);}catch(_){} nnRoofTbl(true); });
  await p.waitForTimeout(500);
  const nm=await p.evaluate(()=>{
    return [...document.querySelectorAll('#nnRoofTbl .rnm')].map(el=>({
      v:el.value, over:el.scrollWidth-el.clientWidth, fs:getComputedStyle(el).fontSize,
      w:Math.round(el.getBoundingClientRect().width)}));
  });
  chk('長い屋根名が見切れない（はみ出し0）', nm.every(x=>x.over<=1), nm.map(x=>x.over));
  chk('長い名前は文字が自動で小さくなる', parseFloat(nm[0].fs)<12, nm[0].fs);
  chk('屋根の枠が広い（150px以上）', nm[0].w>=150, nm[0].w);

  /* build3D の速さ */
  const ms=await p.evaluate(()=>{
    setTab('d3'); const t=[];
    for(let i=0;i<3;i++){ const t0=performance.now(); dirty3d=true; build3D(); t.push(performance.now()-t0); }
    return Math.round(Math.min(...t));
  });
  console.log('   （参考）build3D 1回 = '+ms+'ms');
  chk('3Dの組み直しが速い（250ms以内）', ms<250, ms+'ms');
  /* ★2026-08-23k 追加分：表の立上り・天端／積算・設定の整理／下絵はツールバー */
  await p.evaluate(()=>{ setTab('zu'); nnRoofTbl(true); }); await p.waitForTimeout(400);
  const hw=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    return {th:[...t.querySelectorAll('th')].map(x=>x.textContent),
      h:t.querySelectorAll('.rhw[data-k="h"]').length, w:t.querySelectorAll('.rhw[data-k="w"]').length,
      v:(t.querySelector('.rhw[data-k="h"]')||{}).value};
  });
  chk('表に「立上り」「天端」の列がある', /立上り/.test(hw.th[3])&&/天端/.test(hw.th[4]), hw.th.join('|'));
  chk('立上り・天端の入力が屋根ごと（各2個）', hw.h===2&&hw.w===2, {h:hw.h,w:hw.w});
  chk('いまの立上り高さ（300mm）が出る', hw.v==='300', hw.v);
  const ap=await p.evaluate(()=>{
    const el=document.querySelector('#nnRoofTbl tr.rrow[data-pi="1"] .rhw[data-k="h"]');
    el.value='500'; el.dispatchEvent(new Event('change',{bubbles:true}));
    return state.polys[1].edges.map(e=>e.h);
  });
  chk('立上りを変えるとその屋根の全辺に入る', ap.every(h=>h===500), ap);
  const pn=await p.evaluate(()=>{
    const hid=el=>{ const e=document.getElementById(el); const pp=e?e.closest('.panel'):null;
      return pp?getComputedStyle(pp).display==='none':'no'; };
    return {edge:hid('edgeedit'), spec:hid('specsel'),
      upanel:getComputedStyle(document.getElementById('upanel')).display==='none',
      btn:!!document.getElementById('tl_uimg')};
  });
  chk('積算・設定から「選択中の辺」が消えた', pn.edge===true, pn.edge);
  chk('積算・設定から「防水仕様の選定」が消えた', pn.spec===true, pn.spec);
  chk('積算・設定から「下絵」が消えた', pn.upanel===true, pn.upanel);
  chk('ツールバーに「🖼 下絵」ボタンがある', pn.btn);
  await p.click('#tl_uimg'); await p.waitForTimeout(300);
  const fl=await p.evaluate(()=>{
    const u=document.getElementById('upanel');
    return {float:u.classList.contains('nnFloat'), vis:getComputedStyle(u).display!=='none',
      inCanvas:!!u.closest('#canvaswrap'), x:!!u.querySelector('.nnUx')};
  });
  chk('「🖼 下絵」で作図面の上に小窓が出る', fl.float&&fl.vis&&fl.inCanvas&&fl.x, fl);
  await p.click('#tl_uimg'); await p.waitForTimeout(300);
  chk('もう一度押すと閉じる', await p.evaluate(()=>getComputedStyle(document.getElementById('upanel')).display==='none'));

  chk('JSエラーなし', errs.length===0, errs.slice(0,2));
  console.log('○'+okN+' ★NG'+ngN);
  await br.close(); process.exit(ngN?1:0);
})();
