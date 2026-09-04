/* ★2026-08-28c 現況（躯体／既存防水／改修後防水）＝§231 の検証
   本人の指示「「躯体」「既存防水」「改修後防水」のどれかを選べるようにし、
   選択したものが表現される仕様に変更してほしい」。
   ・見た目が3通りに変わる（画素の指紋で見比べる）
   ・躯体では継目（はみ出しアス）を出さない／既存防水では残る
   ・躯体は下地（§140）に合わせて材質が変わる（RC＝コンクリート・W造＝木）
   ・★数量・見積は1円も変わらない（見た目だけの切り替え）
   ・保存して開き直しても残る／知らない値は捨てる／古い値（oldas・hogo）は読み替える
   使い方: node _check/genkyo.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:720}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{
    state.polys=[];state.parts=[];state.d3sol=[];state.scaleM=1;state.specCode='AS-T1';
    drawPts=[{x:0,y:0},{x:18,y:0},{x:18,y:11},{x:0,y:11}]; closePoly();
    const P=state.polys[0]; P.lv=2.5; P.name='屋根①'; P.kouzou='rc';
    P.edges.forEach(e=>{e.h=400;e.w=250;e.k='para';});
    P.holes=[{pts:[{x:7,y:4},{x:10,y:4},{x:10,y:7},{x:7,y:7}],
              edges:[0,1,2,3].map(()=>({h:400,w:250,k:'para'}))}];
    saveState(); recalc(); setTab('d3');
  });
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1600);
  await p.evaluate(()=>{ const bx=document.getElementById('nnRoofTbl'); if(bx)bx.style.display='none';
    T.tx=9;T.tz=5.5;T.r=22;T.theta=-Math.PI/2+0.5;T.phi=0.7;T.voX=0;T.voY=0;T.rev++; });
  await p.waitForTimeout(900);

  const snap=async(v)=>{
    await p.evaluate(v=>{ nnGenkyoSet(0,v); }, v);
    await p.waitForTimeout(1500);
    return await p.evaluate(()=>{
      /* 画素の指紋（絵が本当に変わったか）＝同じ場で描き直して読む（§183の作法） */
      const r=T.renderer, gl=r.getContext();
      r.render(T.scene,T.camera);
      const w=64,h=64,buf=new Uint8Array(w*h*4);
      const fw=gl.drawingBufferWidth, fh=gl.drawingBufferHeight;
      gl.readPixels((fw>>1)-32,(fh>>1)-32,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buf);
      let sum=0; for(let i=0;i<buf.length;i+=4) sum+=buf[i]*1+buf[i+1]*3+buf[i+2]*7;
      /* 継目（はみ出しアス）が見えているか＝描かれている棒・玉の数 */
      let beads=0;
      T.group.traverse(o=>{ if(!o.isMesh||!o.material||!o.visible)return;
        if(o.material.opacity===0)return;
        if(o.geometry&&(o.geometry.type==='CylinderGeometry'||o.geometry.type==='SphereGeometry')) beads++; });
      const q=quantities(state.polys[0],state.scaleM);
      return {fp:sum, beads,
              hira:Math.round(q.hira*10)/10, tachi:Math.round(q.tachi*10)/10,
              total:(document.getElementById('sekisan')||{}).innerText||''};
    });
  };

  const A=await snap('');       /* 改修後防水（既定） */
  const B=await snap('body');   /* 躯体 */
  const C=await snap('exist');  /* 既存防水 */

  ok('①3通りとも絵が変わる（改修後防水／躯体／既存防水）',
     new Set([A.fp,B.fp,C.fp]).size===3, [A.fp,B.fp,C.fp].join(' / '));
  ok('②改修後防水では継目（はみ出しアス）が出ている', A.beads>20, A.beads+'個');
  ok('②躯体では継目を出さない（まだ防水していない）', B.beads===0, B.beads+'個');
  ok('②既存防水では継目が残る（既存の重ね）', C.beads>20, C.beads+'個');
  /* ★お金と数量は1円も変わらない（見た目だけの切り替え） */
  const money=x=>((x.total.match(/¥[\d,]+/g)||[]).join(','));
  ok('③平場の数量が変わらない', A.hira===B.hira&&A.hira===C.hira, A.hira+'㎡');
  ok('③立上りの数量が変わらない', A.tachi===B.tachi&&A.tachi===C.tachi, A.tachi+'㎡');
  ok('③積算の金額が変わらない', money(A)===money(B)&&money(A)===money(C), money(A).slice(0,40));

  /* ④「躯体」は下地（§140）に合わせて材質が変わる（RC＝コンクリート／W造＝木） */
  const kz=await p.evaluate(async()=>{
    /* ★材質の色ではなく「実際に描かれた絵」で見比べる。
       下地の違いは色ではなく質感（map）で出るので、色を見ても差が出ない。 */
    const fp=()=>{ const r=T.renderer, gl=r.getContext();
      r.render(T.scene,T.camera);
      const w=64,h=64,buf=new Uint8Array(w*h*4);
      const fw=gl.drawingBufferWidth, fh=gl.drawingBufferHeight;
      gl.readPixels((fw>>1)-32,(fh>>1)-32,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buf);
      let s2=0; for(let i=0;i<buf.length;i+=4) s2+=buf[i]*1+buf[i+1]*3+buf[i+2]*7;
      return s2; };
    state.polys[0].kouzou='rc'; nnGenkyoSet(0,'body');
    await new Promise(r=>setTimeout(r,1000)); const rc=fp();
    state.polys[0].kouzou='w'; build3D();
    await new Promise(r=>setTimeout(r,1000)); const w=fp();
    state.polys[0].kouzou='rc'; build3D();
    await new Promise(r=>setTimeout(r,700));
    return {rc, w};
  });
  ok('④躯体は下地で材質が変わる（RC造とW造で絵が違う）', kz.rc!==kz.w, JSON.stringify(kz));

  /* ⑤保存して開き直しても残る（★2026-09-04i 工程は図面ぜんぶで1つ＝state.genkyo） */
  await p.evaluate(()=>{ nnStageSet('exist'); saveState(); });
  await p.waitForTimeout(300);
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const keep=await p.evaluate(()=>state.genkyo);
  ok('⑤保存して開き直しても残る', keep==='exist', String(keep));
  /* ⑥知らない値は捨てる／版2026-08-28bの古い値は「既存防水」に読み替える */
  const junk=await p.evaluate(()=>{
    const out={};
    state.polys[0].genkyo='でたらめ'; saveState(); loadState(); out.junk=state.polys[0].genkyo||'(なし)';
    state.polys[0].genkyo='oldas';   saveState(); loadState(); out.oldas=state.polys[0].genkyo||'(なし)';
    state.polys[0].genkyo='hogo';    saveState(); loadState(); out.hogo=state.polys[0].genkyo||'(なし)';
    return out;
  });
  ok('⑥知らない値は捨てられる', junk.junk==='(なし)', junk.junk);
  ok('⑥古い値（oldas・hogo）は「既存防水」に読み替える',
     junk.oldas==='exist'&&junk.hogo==='exist', JSON.stringify(junk));
  /* ⑦★2026-09-04i 屋根ごとの「現況」列は廃止。工程バー（下地／既存防水／施工後）が図面ぜんぶを切り替える */
  await p.evaluate(()=>{ setTab('zu'); try{ nnRoofFold(false); }catch(_){} });
  await p.waitForTimeout(600);
  const col=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl'), d=document.getElementById('nnStageBar');
    return {th:t?[...t.querySelectorAll('th')].map(x=>x.textContent.trim()).join('|'):'',
            bar:d?[...d.querySelectorAll('button')].map(b=>b.dataset.st).join(','):'(なし)',
            vis:d?getComputedStyle(d).display!=='none':false};
  });
  ok('⑦屋根の表に「現況」の列は無い（工程バーに一本化）', !/現況/.test(col.th), col.th);
  ok('⑦工程バーが3択（下地／既存防水／施工後）', col.bar==='body,exist,', col.bar);
  ok('⑦工程バーが見えている', col.vis===true);

  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log(R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
