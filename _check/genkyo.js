/* ★2026-08-28b 現況（仕上がりの見た目）＝§230 の検証
   本人の質問「新築施工前の躯体コンクリートや、改修前の劣化した露出アスファルト防水や、
   保護コンクリート仕上げにすることもできる？」→ 屋根ごとに選べるようにしたもの。
   ・見た目が4通りに変わる（画素の指紋で見比べる）
   ・躯体／保護コンクリートでは継目（はみ出しアス）を出さない
   ・保護コンクリートは3mごとの伸縮目地が入る（屋根の形からはみ出さない・穴には入らない）
   ・★数量・見積は1円も変わらない（見た目だけの切り替え）
   ・保存して開き直しても残る／知らない値は捨てる
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
    const P=state.polys[0]; P.lv=2.5; P.name='屋根①';
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
      /* 継目（はみ出しアス）が見えているか＝透明でない bead の数 */
      let beads=0;
      T.group.traverse(o=>{ if(!o.isMesh||!o.material)return;
        if(o.material.opacity===0)return;
        if(o.geometry&&(o.geometry.type==='CylinderGeometry'||o.geometry.type==='SphereGeometry')) beads++; });
      let joints=0, out=0, inHole=0;
      const poly=state.polys[0], sM=state.scaleM;
      T.scene.traverse(o=>{ if(o.parent&&o.parent.name==='nnGenkyo'){ joints++;
        const bb=new THREE.Box3().setFromObject(o);
        const cx=(bb.min.x+bb.max.x)/2/sM, cz=(bb.min.z+bb.max.z)/2/sM;
        if(!pointInPoly(poly.pts,cx,cz)) out++;
        (poly.holes||[]).forEach(hh=>{ if(pointInPoly(hh.pts,cx,cz)) inHole++; });
      } });
      const q=quantities(state.polys[0],state.scaleM);
      return {fp:sum, beads, joints, out, inHole,
              hira:Math.round(q.hira*10)/10, tachi:Math.round(q.tachi*10)/10,
              total:(document.getElementById('sekisan')||{}).innerText||''};
    });
  };

  const A=await snap('');       /* 新規防水（いままでどおり） */
  const B=await snap('body');   /* 躯体コンクリート */
  const C=await snap('oldas');  /* 劣化した露出アス */
  const D=await snap('hogo');   /* 保護コンクリート */

  ok('①4通りとも絵が変わる（新規／躯体／劣化アス／保護コン）',
     new Set([A.fp,B.fp,C.fp,D.fp]).size===4, [A.fp,B.fp,C.fp,D.fp].join(' / '));
  ok('②新規防水では継目（はみ出しアス）が出ている', A.beads>20, A.beads+'個');
  ok('②躯体コンクリートでは継目を出さない', B.beads===0, B.beads+'個');
  ok('②保護コンクリートでも継目を出さない', D.beads===0, D.beads+'個');
  ok('②劣化した露出アスでは継目が残る（既存の重ね）', C.beads>20, C.beads+'個');
  ok('③保護コンクリートに伸縮目地が入る', D.joints>=8, D.joints+'本');
  ok('③目地は屋根の外へはみ出さない', D.out===0, D.out+'本');
  ok('③目地は中抜き（穴）の中に入らない', D.inHole===0, D.inHole+'本');
  ok('③ほかの現況では目地を出さない', A.joints===0&&B.joints===0&&C.joints===0,
     [A.joints,B.joints,C.joints].join('/'));
  /* ★お金と数量は1円も変わらない（見た目だけの切り替え） */
  const money=x=>((x.total.match(/¥[\d,]+/g)||[]).join(','));
  ok('④平場の数量が変わらない', A.hira===B.hira&&A.hira===C.hira&&A.hira===D.hira, A.hira+'㎡');
  ok('④立上りの数量が変わらない', A.tachi===B.tachi&&A.tachi===C.tachi&&A.tachi===D.tachi, A.tachi+'㎡');
  ok('④積算の金額が変わらない', money(A)===money(B)&&money(A)===money(C)&&money(A)===money(D),
     money(A).slice(0,40));

  /* ⑤保存して開き直しても残る */
  await p.evaluate(()=>{ nnGenkyoSet(0,'hogo'); saveState(); });
  await p.waitForTimeout(300);
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const keep=await p.evaluate(()=>state.polys[0]&&state.polys[0].genkyo);
  ok('⑤保存して開き直しても残る', keep==='hogo', String(keep));
  /* ⑥知らない値は捨てて「新規防水」に戻る（壊れた保存への守り・§199） */
  const junk=await p.evaluate(()=>{
    state.polys[0].genkyo='でたらめ'; saveState(); loadState();
    return state.polys[0].genkyo||'(なし)';
  });
  ok('⑥知らない値は捨てられる', junk==='(なし)', junk);
  /* ⑦屋根の表に「現況」の列がある */
  await p.evaluate(()=>{ setTab('zu'); try{ nnRoofFold(false); }catch(_){} });
  await p.waitForFunction(()=>{ const t=document.getElementById('nnRoofTbl');
    return !!(t&&t.querySelector('select.rgk')); },{timeout:8000}).catch(()=>{});
  const col=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    const th=t?[...t.querySelectorAll('th')].map(x=>x.textContent.trim()):[];
    const sel=t?t.querySelector('select.rgk'):null;
    return {th:th.join('|'), rows:t?t.querySelectorAll('tr.rrow').length:-1,
            opts:sel?[...sel.options].map(o=>o.value).join(','):''};
  });
  ok('⑦屋根の表に「現況」の列がある', /現況/.test(col.th), col.th);
  ok('⑦4通りから選べる', col.opts===',body,oldas,hogo', col.opts);

  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log(R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
