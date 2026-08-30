/* ★2026-08-30c 水勾配（片流れ）の検査
   ・屋根ごとに 勾配（1/100 等）と水下（みずしも）の辺を選ぶと、
     3Dの平場の防水面が本当に傾く（1枚の平面・独立に検算）
   ・平場の継目（はみ出しアス）も面に沿って傾く
   ・数量・見積は水平投影のまま**1円も変わらない**
   ・勾配なしのときは、これまでの形と完全に同じ（回帰ゼロの根拠）
   ・水上で立上り150mmを割ると警告が出る
   ・保存して開き直しても残る／カメラは動かさない（§152）
   使い方：node _check/koubai.js            … いまのファイル
   　　　　node _check/koubai.js <file>    … 変更前（例 _before.html）と比較 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const file=process.argv[2]||'zumen_sekisan.html';
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/'+file,{waitUntil:'load'});
  await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{try{localStorage.clear();}catch(_){}});
  const NG=[];
  const ok=(c,name,info)=>{ console.log((c?'○':'★NG')+' '+name+(info!==undefined?('　'+info):'')); if(!c)NG.push(name); };

  /* 20m×10m・立上り300・水下＝北側（y=0の辺）。独立の検算：高さ = lv + (z−0)×1/100 */
  await p.evaluate(()=>{
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[],
      edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; try{saveState();}catch(_){}
    try{renderPolyList();}catch(_){}      /* 屋根の表を作り直す（表はこの中で組み立てられる） */
    setTab('d3');
  });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.waitForTimeout(500);

  /* ---- ① 勾配なし＝これまでどおり（平場の防水面がすべて lv+0.012 の水平） ---- */
  const flat=await p.evaluate(()=>{
    let mem=null; T.group.traverse(o=>{ if(o.isMesh&&o.userData&&o.userData.polyIdx===0) mem=o; });
    if(!mem) return null;
    const pa=mem.geometry.attributes.position;
    let mn=1e9,mx=-1e9; for(let i=0;i<pa.count;i++){ mn=Math.min(mn,pa.getY(i)); mx=Math.max(mx,pa.getY(i)); }
    let seams=0, tilted=0;
    T.group.traverse(o=>{ if(o.name==='nnFlatSeam'){ seams++;
      if(Math.abs(o.rotation.x)>1e-6||Math.abs(o.rotation.z)>1e-6) tilted++; } });
    return {mn,mx,y:mem.position.y,seams,tilted};
  });
  ok(flat && Math.abs(flat.mn)<1e-9 && Math.abs(flat.mx)<1e-9 && Math.abs(flat.y-0.012)<1e-9,
    '① 勾配なし＝平場は完全な水平（これまでどおり）', flat&&(flat.mn+'〜'+flat.mx+' / y='+flat.y));
  ok(flat && flat.seams>0 && flat.tilted===0,
    '① 勾配なし＝平場の継目に傾きが1本も無い', flat&&(flat.tilted+'/'+flat.seams+'本'));

  /* ---- ② 数量・見積の控え（勾配前） ---- */
  const est0=await p.evaluate(()=>{ const d=nnEstimateData();
    let t=0; (d.rows||[]).forEach(r=>t+=r.q*r.p); return {hira:d.hira, total:t}; });

  /* ---- ③ カメラの控え → 表の列から勾配を入れる ---- */
  const cam0=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz,T.voX|0,T.voY|0].map(v=>+(+v).toFixed(6)));
  const has=await p.evaluate(()=>({
    col:[...document.querySelectorAll('#nnRoofTbl th')].map(th=>th.textContent).join(','),
    sel:!!document.querySelector('#nnRoofTbl select.rkb')}));
  ok(/勾配/.test(has.col), '③ 屋根の表に「勾配」の列がある', has.col);
  ok(has.sel, '③ 勾配のプルダウンがある');
  await p.selectOption('#nnRoofTbl select.rkb','100');
  await p.waitForTimeout(600);
  const st1=await p.evaluate(()=>({s:state.polys[0].kbS, e:state.polys[0].kbE,
    toast:document.getElementById('toast').textContent}));
  ok(st1.s===100, '③ 表から 1/100 を選ぶと入る', '1/'+st1.s);
  ok(st1.e===0||st1.e===2, '③ 水下＝いちばん長い辺（20mの辺）が自動で選ばれる', '辺'+st1.e);

  /* 検算をそろえるため、水下＝北側（辺0）に固定 */
  await p.evaluate(()=>nnKbSet(0, null, 0));
  await p.waitForTimeout(600);

  /* ---- ④ 3Dの平場が「1枚の平面」で傾く（独立の検算） ---- */
  const tilt=await p.evaluate(()=>{
    let mem=null; T.group.traverse(o=>{ if(o.isMesh&&o.userData&&o.userData.polyIdx===0) mem=o; });
    T.group.updateMatrixWorld(true);
    const rc=new THREE.Raycaster(), objs=[mem];
    const at=(x,z)=>{ rc.set(new THREE.Vector3(x,5,z), new THREE.Vector3(0,-1,0)); rc.far=10;
      const h=rc.intersectObjects(objs,false)[0]; return h?+h.point.y.toFixed(4):null; };
    return {a:at(10,0.05), b:at(10,5), c:at(10,9.95), d:at(3,7)};
  });
  /* 期待値（独立に手計算）：高さ = z×1/100 + 0.012 */
  const near=(v,e)=>v!=null&&Math.abs(v-e)<0.002;
  ok(near(tilt.a,0.0125)&&near(tilt.b,0.062)&&near(tilt.c,0.1115)&&near(tilt.d,0.082),
    '④ 平場が 1/100 の平面で傾く（4点とも z×1/100+0.012 と一致）', JSON.stringify(tilt));

  /* ---- ⑤ 平場の継目が面に沿って傾く ---- */
  const seam=await p.evaluate(()=>{
    const out={n:0, bad:0, worst:0};
    const g=1/100;
    T.group.updateMatrixWorld(true);
    T.group.traverse(o=>{
      if(o.name!=='nnFlatSeam') return;
      out.n++;
      const len=(o.geometry.parameters&&o.geometry.parameters.height)||0; if(!len) return;
      /* 軸：rotation.z あり＝X軸／rotation.x あり＝Z軸／どちらも0＝置き方から判断できないので飛ばす */
      let axis=null;
      if(Math.abs(o.rotation.z)>1e-6) axis='x';
      else if(Math.abs(o.rotation.x)>1e-6) axis='z';
      if(!axis) return;
      const v1=new THREE.Vector3(axis==='x'?-len/2:0,0,axis==='z'?-len/2:0).applyMatrix4(o.matrixWorld);
      const v2=new THREE.Vector3(axis==='x'? len/2:0,0,axis==='z'? len/2:0).applyMatrix4(o.matrixWorld);
      [v1,v2].forEach(v=>{
        const want=Math.max(0,v.z)*g+0.016;          /* 独立の検算：z×1/100＋0.016 */
        const d=Math.abs(v.y-want);
        out.worst=Math.max(out.worst,d);
        if(d>0.004) out.bad++;
      });
    });
    return out;
  });
  ok(seam.n>10, '⑤ 平場の継目が出ている', seam.n+'本');
  ok(seam.bad===0, '⑤ 傾いた継目の両端が、面の高さと一致（独立検算）', 'ずれ最大'+(seam.worst*1000).toFixed(1)+'mm');

  /* ---- ⑥ 数量・見積は1円も変わらない ---- */
  const est1=await p.evaluate(()=>{ const d=nnEstimateData();
    let t=0; (d.rows||[]).forEach(r=>t+=r.q*r.p); return {hira:d.hira, total:t}; });
  ok(est0.hira===est1.hira && est0.total===est1.total,
    '⑥ 数量・見積は水平投影のまま変わらない', est1.hira+'㎡ / ¥'+est1.total);

  /* ---- ⑦ カメラは動かない（§152） ---- */
  const cam1=await p.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz,T.voX|0,T.voY|0].map(v=>+(+v).toFixed(6)));
  ok(JSON.stringify(cam0)===JSON.stringify(cam1), '⑦ 勾配を変えてもカメラは動かない', '');

  /* ---- ⑧ カードに 勾配・水下・実質立上り が出る ---- */
  await p.evaluate(()=>{ state.active=0; nnPolySync(); });
  await p.waitForTimeout(300);
  const card=await p.evaluate(()=>{
    const d=document.getElementById('nnPolyCard');
    return {tx:d?d.textContent:'', sel:d?d.querySelectorAll('select').length:0};
  });
  ok(/水勾配/.test(card.tx)&&card.sel>=2, '⑧ カードに水勾配・水下のプルダウン', card.sel+'個');
  ok(/実質200mm/.test(card.tx), '⑧ 水上の立上り 実質200mm（300−10m×1/100）', (card.tx.match(/実質\d+mm/)||[])[0]);

  /* ---- ⑨ 1/20 にすると水上150mm未満の警告＋カードが赤くなる ---- */
  await p.evaluate(()=>nnKbSet(0, 20));
  await p.waitForTimeout(400);
  const warn=await p.evaluate(()=>({
    toast:document.getElementById('toast').textContent,
    card:document.getElementById('nnPolyCard').textContent}));
  ok(/150mm未満/.test(warn.toast), '⑨ 水上150mm未満の警告が出る', warn.toast.slice(0,44));
  ok(/実質-200mm|実質−200mm/.test(warn.card.replace('−','-')), '⑨ 実質−200mm（300−10m×1/20）が出る',
    (warn.card.match(/実質[−-]?\d+mm/)||[])[0]);

  /* ---- ⑩ 2Dの図面に矢印と 1/◯ が描かれる ---- */
  await p.evaluate(()=>{ nnKbSet(0, 100); setTab('zu'); });
  await p.waitForTimeout(600);
  const arrow=await p.evaluate(()=>{
    const cv=document.getElementById('cv'), c=cv.getContext('2d');
    /* 重心(10,5)→水下の辺(10,0)の中点へ向かう線上を、矢印の色（#1663b3）で走査 */
    let hits=0;
    for(let t=0.35;t<=0.85;t+=0.02){
      const gx=10, gy=5*(1-t);
      const x=Math.round(gx2px(gx)*devicePixelRatio*(cv.width/(cv.getBoundingClientRect().width*devicePixelRatio))||0);
      const px=Math.round(gx2px(gx)*(cv.width/cv.getBoundingClientRect().width));
      const py=Math.round(gy2px(gy)*(cv.height/cv.getBoundingClientRect().height));
      const d=c.getImageData(Math.max(0,px-3), Math.max(0,py-3), 7, 7).data;
      for(let i=0;i<d.length;i+=4){
        if(Math.abs(d[i]-0x16)<40 && Math.abs(d[i+1]-0x63)<40 && Math.abs(d[i+2]-0xb3)<40){ hits++; break; }
      }
    }
    return hits;
  });
  ok(arrow>=5, '⑩ 図面に水下への矢印（青）が描かれる', arrow+'点で検出');

  /* ---- ⑪ 保存して開き直しても残る ---- */
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const keep=await p.evaluate(()=>({s:state.polys[0].kbS, e:state.polys[0].kbE}));
  ok(keep.s===100&&keep.e===0, '⑪ 開き直しても勾配・水下が残る', '1/'+keep.s+'・辺'+keep.e);
  const keep3d=await p.evaluate(async()=>{
    setTab('d3');
    await new Promise(r=>{ const t0=Date.now();
      (function w(){ try{ if(typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3) return r();
      }catch(_){}; if(Date.now()-t0>15000) return r(); setTimeout(w,200); })(); });
    let mem=null; T.group.traverse(o=>{ if(o.isMesh&&o.userData&&o.userData.polyIdx===0) mem=o; });
    if(!mem) return null;
    const pa=mem.geometry.attributes.position;
    let mx=-1e9; for(let i=0;i<pa.count;i++) mx=Math.max(mx,pa.getY(i));
    return +mx.toFixed(4);
  });
  ok(keep3d!=null&&Math.abs(keep3d-0.10)<0.005, '⑪ 開き直しても3Dが傾いたまま（最大+0.10m）', keep3d+'m');

  /* ---- ⑫ 勾配を外すと完全に元へ戻る ---- */
  await p.evaluate(()=>nnKbSet(0, 0));
  await p.waitForTimeout(500);
  const off=await p.evaluate(()=>{
    let mem=null; T.group.traverse(o=>{ if(o.isMesh&&o.userData&&o.userData.polyIdx===0) mem=o; });
    const pa=mem.geometry.attributes.position;
    let mx=-1e9; for(let i=0;i<pa.count;i++) mx=Math.max(mx,pa.getY(i));
    let tilted=0; T.group.traverse(o=>{ if(o.name==='nnFlatSeam'&&
      (Math.abs(o.rotation.x)>1e-6||Math.abs(o.rotation.z)>1e-6)) tilted++; });
    return {mx:+mx.toFixed(6), tilted, kbS:state.polys[0].kbS||0};
  });
  ok(off.mx===0&&off.tilted===0&&off.kbS===0, '⑫ 「なし」に戻すと平場も継目も完全に水平へ', JSON.stringify(off));

  ok(errs.length===0, 'JSエラーなし', errs.join('|')||'');
  console.log('===', file, ' ★NG', NG.length, NG.join(' / '));
  await b.close();
})();
