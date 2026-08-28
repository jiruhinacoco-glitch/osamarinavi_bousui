/* ★2026-08-28e 弧（§232）をかいた図面で、元請に出す書類がちゃんと読めるか。
   弧は16本の折れ線でできているので、なにも手当てしないと
   ①寸法が16個並ぶ ②通り芯が16本立って丸囲みが重なる、で図面が読めなくなる。
   使い方: node _check/arcdoc.js  ／  node _check/arcdoc.js before */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BEFORE=process.argv[2]==='before';
const FILE=BEFORE? '_before.html' : 'zumen_sekisan.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  if(BEFORE) require('./mkbefore')();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:820}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1300);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const setup=await p.evaluate(()=>{
    try{
      state.scaleM=1;
      state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
        edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
      state.active=0; sel={p:0,r:-1,e:0}; saveState(); recalc();
      nnEdgeArc(2500); sel=null; saveState(); recalc();
      window.open=function(){ return {document:{write(h){window.__last=h;},close(){}},
        focus(){}, print(){}, closed:false, location:{}, addEventListener(){} }; };
      return state.polys[0].pts.length;
    }catch(e){ return -1; }
  });
  ok('弧をかける（頂点が19点になる）', setup===19, setup+'点');

  const doc=async fn=>p.evaluate(async(fn)=>{
    window.__last=null;
    try{ window[fn](); }catch(e){ return {err:String(e.message||e)}; }
    await new Promise(r=>setTimeout(r,700));
    const h=window.__last||'';
    /* SVGの <text> を全部取り出して数える */
    const t=[...h.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]);
    return {len:h.length, nan:/NaN|undefined|Infinity/.test(h),
      texts:t, m13:t.filter(x=>/^1\.[0-9] m$/.test(x)).length,
      rlab:t.filter(x=>/^R[0-9]/.test(x)).length,
      axes:t.filter(x=>/^[XY][0-9]+$/.test(x)).length };
  }, fn);

  const A=await doc('nnPlanPDF');
  ok('平面図：紙が作られる', (A.len||0)>8000, (A.len||0)+'文字 '+(A.err||''));
  ok('平面図：NaN・undefined が出ない', A.nan===false);
  ok('平面図：弧の辺ごとの寸法（1.◯m）が並ばない', (A.m13||0)===0, (A.m13||0)+'個');
  ok('平面図：半径の札（R◯◯m）が1つだけ出る', (A.rlab||0)===1, (A.rlab||0)+'個');
  ok('平面図：通り芯が増えすぎない（8本以内）', (A.axes||0)<=8, (A.axes||0)+'本');

  /* 通り芯の丸囲みどうしが重なっていないか（実際に描いた座標で見る） */
  const ov=await p.evaluate(()=>{
    const h=window.__last||'';
    const c=[...h.matchAll(/<circle cx="([-0-9.]+)" cy="([-0-9.]+)" r="([0-9.]+)"/g)]
      .map(m=>({x:+m[1],y:+m[2],r:+m[3]})).filter(o=>o.r>2&&o.r<5);   /* 通り芯の丸 */
    let bad=0;
    for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++){
      if(Math.hypot(c[i].x-c[j].x, c[i].y-c[j].y) < (c[i].r+c[j].r)*0.9) bad++; }
    return {n:c.length, bad};
  });
  ok('平面図：通り芯の丸囲みが重なっていない', ov.bad===0, ov.n+'個中 重なり'+ov.bad);

  for(const [nm,fn] of [['割付図','nnWariPDF'],['断面詳細図','nnSectionPDF'],
                        ['施工層構成図','nnIsoPDF'],['御見積書','nnMitsuPDF']]){
    const D=await doc(fn);
    ok(nm+'：紙が作られる', (D.len||0)>5000, (D.len||0)+'文字 '+(D.err||''));
    ok(nm+'：NaN・undefined が出ない', D.nan===false);
  }
  /* 弧をかいた図面でも数量が合う（弓形のぶんだけ増える） */
  const q=await p.evaluate(()=>{ const x=quantities(state.polys[0],1); return +x.hira.toFixed(1); });
  /* 弦20m・矢2.5m の弓形＝33.8㎡（理論値）。240＋33.8＝273.8㎡ */
  ok('弧をかいても数量が合う（240＋弓形33.8＝273.8㎡）', Math.abs(q-273.8)<0.5, q+'㎡');

  /* ── 弧にしても、その辺の設定（笠木・壁の厚み・アゴ・取り合い）が消えないか ── */
  const K=await p.evaluate(()=>{
    try{
      state.scaleM=1;
      state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
        edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
      state.active=0; saveState();
      nnKasagiSet(0,true);
      const e0=state.polys[0].edges[0];
      e0.wall=300; e0.ago=1; e0.agoD=120; e0.tor='mikiri';
      sel={p:0,r:-1,e:0}; nnEdgeArc(1500);
      const es=state.polys[0].edges.filter(e=>e&&e.arc!=null);
      const N=state.polys[0].pts.length;
      sel={p:0,r:-1,e:N-1}; nnEdgeArc(1000);
      const ids=new Set(state.polys[0].edges.filter(e=>e&&e.arc!=null).map(e=>e.arc));
      const a0=quantities(state.polys[0],1).hira;
      if(window.nnPolyDup) nnPolyDup(0);
      const dup= state.polys[1] ? Math.abs(quantities(state.polys[1],1).hira-a0)<0.01 : false;
      let ops='ok';
      try{ sel={p:0,r:-1,e:2}; nnEdgeSplitRange(0.3,0.4);
           sel={p:0,r:-1,e:2}; if(window.nnEdgeOffset) nnEdgeOffset(0.5);
           draw(); recalc(); }catch(e){ ops='ERR '+e.message; }
      return {n:es.length, kasagi:es.filter(e=>e.kasagi).length,
        wall:es.filter(e=>e.wall===300).length, ago:es.filter(e=>e.ago).length,
        tor:es.filter(e=>e.tor==='mikiri').length, h:es.filter(e=>e.h===300).length,
        ids:[...ids].length, dup, ops};
    }catch(e){ return {n:0,kasagi:0,wall:0,ago:0,tor:0,h:0,ids:0,dup:false,ops:'ERR '+e.message}; }
  });
  ok('弧にしてもアルミ笠木が外れない', K.kasagi===K.n && K.n>0, K.kasagi+'/'+K.n);
  ok('弧にしても壁の厚みが残る', K.wall===K.n, K.wall+'/'+K.n);
  ok('弧にしても水切りアゴが残る', K.ago===K.n, K.ago+'/'+K.n);
  ok('弧にしても取り合いの納まりが残る', K.tor===K.n, K.tor+'/'+K.n);
  ok('弧にしても立上りの高さが残る', K.h===K.n, K.h+'/'+K.n);
  ok('同じ部位で2本目を弧にしても番号がぶつからない', K.ids===2, K.ids+'種');
  ok('弧のある部位を複製できる（形が同じ）', K.dup===true);
  ok('弧の辺に「範囲で分ける」「押出し」をしても落ちない', K.ops==='ok', K.ops);

  await p.evaluate(()=>{ state.polys=[]; state.active=-1; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((BEFORE?'【直す前 _before.html】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
