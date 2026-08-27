/* ★2026-08-27d アルミ笠木（パラペットの天端に乗せる）の検証
   ・天端幅から品番を自動で選ぶ（田島ルーフィング ライナーコービングSの寸法表）
   ・3Dは断面どおり（外壁側が高く、屋上側が低い＝雨を屋上へ流す）
   ・積算に「本体◯本・コーナー◯個」が出る
   ・保存して開き直しても残る（normE に書き足したか）
   使い方: node _check/kasagi.js  ／ スマホ: node _check/kasagi.js ph */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=PH? await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true})
            : await b.newPage({viewport:{width:1600,height:900}});
  if(PH) await p.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});
    Object.defineProperty(screen,'height',{get:()=>852});}catch(e){} });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1100);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

  /* ---- ① 品番の自動選定（寸法表どおりか） ---- */
  const pick=await p.evaluate(()=>{
    const f=w=>{ const r=nnCopingPick(w); return r?r.code:null; };
    return {a:f(250), b:f(100), c:f(240), d:f(241), e:f(266), f:f(430), g:f(60), h:f(600),
      w300:(nnCopingPick(250)||{}).w, t300:(nnCopingPick(250)||{}).t, l300:(nnCopingPick(250)||{}).len,
      l500:(nnCopingPick(430)||{}).len, n:NN_COPING_TBL.length};
  });
  ok('天端250mm → S300', pick.a==='300', pick.a);
  ok('天端100mm → S135（下限側）', pick.b==='135', pick.b);
  ok('境目が重ならない 240→S275 / 241→S300 / 266→S325',
     pick.c==='275'&&pick.d==='300'&&pick.e==='325', pick.c+'/'+pick.d+'/'+pick.e);
  ok('天端430mm → S500M', pick.f==='500M', pick.f);
  ok('表の範囲外（60mm・600mm）は選ばない', pick.g===null&&pick.h===null, pick.g+'/'+pick.h);
  ok('S300は 幅300・板厚2.0・L=4000', pick.w300===300&&pick.t300===2.0&&pick.l300===4000,
     JSON.stringify([pick.w300,pick.t300,pick.l300]));
  ok('S500Mは L=3000（長尺は3m）', pick.l500===3000, pick.l500);
  ok('品番は13種', pick.n===13, pick.n);

  /* ---- ② 屋根をかいて笠木を付ける ---- */
  await p.evaluate(()=>{
    state.scaleM=1;
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; saveState(); renderPolyList(); recalc(); draw();
  });
  await p.waitForTimeout(300);
  let st=await p.evaluate(()=>({on:nnKasagiOn(0), n:nnKasagiList().length}));
  ok('最初は笠木なし', st.on===false && st.n===0, JSON.stringify(st));

  await p.evaluate(()=>nnKasagiSet(0,true));
  await p.waitForTimeout(400);
  const on=await p.evaluate(()=>{
    const L=nnKasagiList(), g=nnKasagiAgg();
    return {on:nnKasagiOn(0), n:L.length, len:Math.round(L.reduce((a,t)=>a+t.lenM,0)*10)/10,
      code:L[0]&&L[0].pick.code, g:g['300']?{len:Math.round(g['300'].len*10)/10, corner:g['300'].corner,
        unit:g['300'].unit}:null};
  });
  ok('4辺すべてに笠木が付く', on.on===true && on.n===4, JSON.stringify({on:on.on,n:on.n}));
  ok('合計の長さ＝外周60m', Math.abs(on.len-60)<0.05, on.len);
  ok('品番はS300（天端250mm）', on.code==='300', on.code);
  ok('コーナーは4個（四角なので）', on.g&&on.g.corner===4, on.g&&on.g.corner);

  /* ---- ③ 積算 ---- */
  const rows=await p.evaluate(()=>{
    const r=nnKasagiRows();
    const tx=document.getElementById('sekisan')?document.getElementById('sekisan').innerText:'';
    return {rows:r, hit:tx.indexOf('ライナーコービングS300')>=0, cor:tx.indexOf('コーナー')>=0};
  });
  const r0=rows.rows[0]||[], r1=rows.rows[1]||[];
  ok('積算に本体の行（本数つき）', /ライナーコービングS300/.test(r0[0]||'') && /×15本/.test(r0[0]||''),
     r0[0]);
  ok('本体の数量＝60m・単価7500', Math.abs((r0[1]||0)-60)<0.05 && r0[3]===7500, r0[1]+'/'+r0[3]);
  ok('積算にコーナーの行（4個）', /コーナー/.test(r1[0]||'') && r1[1]===4 && r1[2]==='個',
     r1[0]+' '+r1[1]);
  ok('画面の積算表にも出ている', rows.hit && rows.cor, JSON.stringify({b:rows.hit,c:rows.cor}));

  /* ---- ④ 3Dの形（断面どおり：外壁側が高く、屋上側が低い） ---- */
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.scene; }catch(_){ return false; } },
    null,{timeout:20000});
  await p.waitForTimeout(900);
  const g3=await p.evaluate(()=>{
    let kg=null; T.scene.traverse(o=>{ if(o.name==='nnKasagi') kg=o; });
    if(!kg) return {no:1};
    const ms=kg.children.length;
    /* 1枚目の帯の頂点を読む（y=底/外側の上/内側の上） */
    const m=kg.children[0], a=m.geometry.attributes.position.array;
    const ys=[]; for(let i=0;i<8;i++) ys.push(Math.round(a[i*3+1]*1000)/1000);
    const yb=Math.min(...ys), yt=Math.max(...ys);
    /* 外側＝屋根の中心から遠いほう */
    const cx=10, cz=5;   /* 屋根の中心（m） */
    let dOut=-1,yOut=0,dIn=1e9,yIn=0;
    for(let i=4;i<8;i++){ const x=a[i*3],y=a[i*3+1],z=a[i*3+2];
      const d=Math.hypot(x-cx,z-cz); if(d>dOut){dOut=d;yOut=y;} if(d<dIn){dIn=d;yIn=y;} }
    const box=new THREE.Box3().setFromObject(kg);
    return {ms, yb, yt, yOut:Math.round(yOut*1000), yIn:Math.round(yIn*1000),
      bx:[box.min.x,box.max.x,box.min.z,box.max.z].map(v=>Math.round(v*1000)/1000)};
  });
  ok('3Dに笠木のまとまりがある（4辺ぶん）', g3.ms===4, JSON.stringify({ms:g3.ms}));
  ok('パラペットの天端（GL+0.3m）に乗る', Math.abs(g3.yb-0.3)<0.002, g3.yb);
  ok('★外壁側が高い（+72mm）', g3.yOut===372, g3.yOut);
  ok('★屋上側が低い（+60mm）＝雨は屋上へ流れる', g3.yIn===360, g3.yIn);
  ok('いちばん高いところは +72mm', Math.abs(g3.yt-0.372)<0.002, g3.yt);
  /* 笠木の幅300mm・壁厚250mm → 外へ25mm・内へ25mm出る */
  ok('屋根の外へ25mmだけ出る（笠木幅300−天端250)/2）',
     Math.abs(g3.bx[0]+0.025)<0.004 && Math.abs(g3.bx[1]-20.025)<0.004, JSON.stringify(g3.bx));

  /* ---- ⑤ 保存して開き直しても残る（normE） ---- */
  await p.evaluate(()=>{ setTab('zu'); saveState(); });
  await p.reload(); await p.waitForTimeout(1100);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const af=await p.evaluate(()=>({on:nnKasagiOn(0), n:nnKasagiList().length,
    rows:nnKasagiRows().length}));
  ok('★開き直しても笠木が残る', af.on===true && af.n===4 && af.rows===2, JSON.stringify(af));

  /* ---- ⑥ 外す ---- */
  await p.evaluate(()=>nnKasagiSet(0,false));
  await p.waitForTimeout(300);
  const off=await p.evaluate(()=>({on:nnKasagiOn(0), n:nnKasagiList().length, rows:nnKasagiRows().length}));
  ok('外すと3Dも積算も消える', off.on===false&&off.n===0&&off.rows===0, JSON.stringify(off));

  /* ---- ⑦ 小窓（場所と中身） ---- */
  await p.evaluate(()=>{ nnKasagiSet(0,true); nnKasagiPanel(); });
  await p.waitForTimeout(500);
  const bx=await p.evaluate(()=>{
    const z=(window.nnPZ||1);
    const d=document.getElementById('nnKsgBox'); if(!d) return {no:1};
    const r=d.getBoundingClientRect();
    const tb=document.getElementById('toolbar'), tr=tb?tb.getBoundingClientRect():null;
    const rt=document.getElementById('nnRoofTbl'), rr=(rt&&rt.offsetParent)?rt.getBoundingClientRect():null;
    const ov=(a,c)=>!c?0:Math.max(0,Math.min(a.right,c.right)-Math.max(a.left,c.left))
                        *Math.max(0,Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top));
    const w=document.getElementById('canvaswrap').getBoundingClientRect();
    return {open:d.classList.contains('on'), tx:d.innerText,
      ovTb:Math.round(ov(r,tr)), ovRt:Math.round(ov(r,rr)),
      inW:(r.left>=w.left-2 && r.right<=w.right+2 && r.bottom<=w.bottom+2)};
  });
  ok('小窓が開く', bx.open===true);
  ok('ツールバーと重ならない', bx.ovTb===0, bx.ovTb);
  ok('屋根の表と重ならない', bx.ovRt===0, bx.ovRt);
  ok('小窓が方眼紙の中に収まる', bx.inW===true);
  ok('小窓に品番と本数が出る', /S300/.test(bx.tx||'') && /15本/.test(bx.tx||''),
     (bx.tx||'').replace(/\n/g,'|').slice(0,110));

  /* ---- ⑧ 取り合いの小窓と場所が同じ → 開くと相手が閉じる ---- */
  const both=await p.evaluate(()=>{ nnTorPanel();
    const k=document.getElementById('nnKsgBox'), t=document.getElementById('nnTorBox');
    return {k:k.classList.contains('on'), t:t.classList.contains('on')}; });
  ok('取り合いを開くと笠木は閉じる（場所が同じ）', both.t===true&&both.k===false, JSON.stringify(both));

  /* ---- ⑨ 表の範囲外の天端幅では、はっきり知らせる ---- */
  await p.evaluate(()=>{ document.getElementById('nnTorBox').classList.remove('on');
    ringsOf(state.polys[0]).forEach(r=>r.edges.forEach(e=>{e.w=600;}));
    saveState(); recalc(); nnKasagiPanel(); nnKasagiPanel(); });
  await p.waitForTimeout(400);
  const oor=await p.evaluate(()=>({tx:document.getElementById('nnKsgBox').innerText,
    rows:nnKasagiRows().length}));
  ok('天端600mmは「範囲外」と知らせる', /範囲外/.test(oor.tx||''), (oor.tx||'').replace(/\n/g,'|').slice(0,90));
  ok('範囲外は積算に計上しない', oor.rows===0, oor.rows);

  /* ---- ⑩ 天端幅が辺ごとに違うとき、品番が分かれる ---- */
  const mix=await p.evaluate(()=>{
    state.scaleM=1;
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}],
      edges:[{h:300,w:250,k:'para'},{h:300,w:400,k:'para'},{h:300,w:250,k:'para'},{h:300,w:400,k:'para'}]}];
    state.active=0; saveState(); renderPolyList(); nnKasagiSet(0,true); recalc();
    const d=document.getElementById('nnKsgBox');
    if(!d.classList.contains('on')) nnKasagiPanel();
    return {rows:nnKasagiRows(), tx:d.innerText, g:nnKasagiAgg()};
  });
  await p.waitForTimeout(200);
  ok('天端250と400が混ざると品番が2つに分かれる',
     mix.rows.length===4 && /S300/.test(mix.rows[0][0]) && /S450/.test(mix.rows[2][0]),
     mix.rows.map(r=>r[0]).join(' / '));
  ok('S300は40m・S450は20m（辺ごとに正しく分かれる）',
     Math.abs(mix.g['300'].len-40)<0.05 && Math.abs(mix.g['450'].len-20)<0.05,
     JSON.stringify([mix.g['300'].len, mix.g['450'].len]));
  ok('コーナーも品番ごとに2個ずつ',
     mix.g['300'].corner===2 && mix.g['450'].corner===2,
     mix.g['300'].corner+'/'+mix.g['450'].corner);
  ok('小窓にも品番ごとの長さと本数が並ぶ',
     /S300/.test(mix.tx) && /S450/.test(mix.tx) && /分かれます/.test(mix.tx),
     mix.tx.replace(/\n/g,'|').slice(0,110));

  /* ---- ⑪ 御見積書（紙）にも出る（画面の積算だけに出て紙に出ないと金額が食い違う） ---- */
  const est=await p.evaluate(()=>{
    state.scaleM=1;
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; saveState(); renderPolyList(); nnKasagiSet(0,true); recalc();
    return nnEstimateData().rows.map(r=>({n:r.n,q:r.q,u:r.u,p:r.p}));
  });
  const eb=est.filter(r=>/ライナーコービング/.test(r.n)), ec=est.filter(r=>/コーナー/.test(r.n));
  ok('御見積書にも笠木の本体が出る（60m×7500）',
     eb.length===1 && Math.abs(eb[0].q-60)<0.05 && eb[0].p===7500, JSON.stringify(eb[0]||null));
  ok('御見積書にも笠木のコーナーが出る（4個）',
     ec.length===1 && ec[0].q===4 && ec[0].u==='個', JSON.stringify(ec[0]||null));
  ok('紙の数量はすべて小数1位まで（数量×単価が合う）',
     est.every(r=>Math.abs(r.q*10-Math.round(r.q*10))<1e-9));

  await p.evaluate(()=>{ state.polys=[]; state.active=-1; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log((PH?'【スマホ】':'【パソコン】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
