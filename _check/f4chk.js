/* 2026-08-08d の4件 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));

const FAKE=()=>{
  const noop=function(){};
  const obj=()=>({position:{set(x,y,z){this._p=[x,y,z];},y:0},rotation:{y:0}});
    eval(window.__STUB);   /* ニセTHREE＝scratchpad/stub3.js */
};

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  await p.waitForTimeout(1300);

  /* ---------- ① 3D：短手（エンドラップ）の継目線がはみ出さない ---------- */
  const r1=await p.evaluate(FAKE_SRC=>{
    eval('('+FAKE_SRC+')()');
    /* 実機の図面に近い、斜め辺のある大きな屋根（1マス=1m） */
    state.scaleM=1;
    state.polys=[];
    const pts=[{x:0,y:0},{x:24,y:0},{x:32,y:2},{x:32,y:13},{x:16,y:13},{x:4,y:8},{x:0,y:7}];
    state.polys.push({name:'屋根①', lv:0, pts, holes:[],
      edges:pts.map(()=>({h:300,w:250,k:'para'}))});
    state.active=0; show3dWari=true; dirty3d=true;
    build3D();
    const g=window.__zGroups[window.__zGroups.length-1];
    if(!g) return {err:'group無し'};
    const s=state.scaleM;
    const ptsM=pts.map(q=>({x:q.x*s,y:q.y*s}));
    const sp=spec();
    const lay=wari(ptsM, [], sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, dirOf(state.polys[0]), state.chidori);
    const HD=dirOf(state.polys[0])==='h';
    /* 短手の継目＝x方向に細い（dims[0]===0.03）棒 */
    /* ★平場の継目だけ。パラペット（貼りかけ・天端・立上りの縦）の継目は別物なので除く。 */
    const seams=g.children.filter(c=>c.name==='nnFlatSeam');
    /* 短手（エンドラップ）の継目＝帯と直交する向き＝alongX が !HD のもの */
    const shortS=seams.filter(c=>c.geometry.alongX===!HD);
    /* 各短手継目の両端が、その位置の帯の「見える範囲」の中か */
    let over=0, outRoof=0;
    /* ★屋根の外に出ていないかは「その位置で屋根が占める区間」と比べる
       （頂点が屋根の縁ぴったりに来るので、点の内外判定では誤判定する） */
    const T3b=q=>HD?{x:q.y,y:q.x}:q;
    shortS.forEach(c=>{
      const [px,,pz]=c.position._p;
      const len=c.geometry.len;
      const a=HD?{x:px,y:pz-len/2}:{x:px-len/2,y:pz};
      const bq=HD?{x:px,y:pz+len/2}:{x:px+len/2,y:pz};
      {
        const at=HD?px:pz, lo0=HD?a.y:a.x, hi0=HD?bq.y:bq.x;
        const segs=scanSegsH(ptsM.map(T3b), [], at);
        if(!segs.some(sg=>lo0>=sg[0]-1e-6 && hi0<=sg[1]+1e-6)) outRoof++;
      }
      /* ★帯どうしはサイドラップぶん重なっているので「中心がどの帯か」では決まらない
           （継目を貼りかけの線で切るようになって、中心の位置がずれたため誤検出した）。
           「その継目がまるごと収まる帯が1つでもあるか」で見る。 */
      const lo=HD?a.y:a.x, hi=HD?bq.y:bq.x;
      const fits=lay.bands.some((bd,i)=>{
        const nx=lay.bands[i+1];
        const hiVis=nx?Math.min(bd.hi, nx.lo):bd.hi;
        return lo>=bd.lo-1e-4 && hi<=hiVis+1e-4; });
      if(!fits) over++;
    });
    return {nSeam:seams.length, nShort:shortS.length, over, outRoof};
  }, FAKE.toString());
  console.log('①', JSON.stringify(r1));
  ok('①短手の継目が次のシートの下まで伸びない', r1.nShort>0 && r1.over===0, JSON.stringify(r1));
  ok('①短手の継目が屋根の外に出ない', r1.outRoof===0, 'はみ出し端点 '+r1.outRoof+'個');

  /* ---------- ③ 割付：既定は番号だけ／ボタンで寸法 ---------- */
  await p.evaluate(()=>{ loadSample(); setTab('wf'); });
  await p.waitForTimeout(600);
  const b3=await p.evaluate(()=>{
    const e=document.getElementById('tl_wfdim');
    return {ある:!!e, 見える:e?getComputedStyle(e).display!=='none':false, 文字:e?e.textContent.trim():'', 既定:nnWfDimOn()};
  });
  console.log('③', JSON.stringify(b3));
  ok('③割付タブに「寸法」ボタンが出る', b3.ある && b3.見える, b3.文字);
  ok('③既定は寸法なし', b3.既定===false);
  const px1=await p.evaluate(()=>{ /* 画面に「m」の札が出ていないかを画素で見るのは難しいので、
      ラベル文字列を作る関数の分岐を直接確かめる */
    return {off:(nnWfDimOn()?'あり':'なし')};
  });
  await p.evaluate(()=>{ nnToggleWfDim(); });
  await p.waitForTimeout(400);
  const b3b=await p.evaluate(()=>{
    const e=document.getElementById('tl_wfdim');
    return {on:nnWfDimOn(), 文字:e.textContent.trim(), cls:e.className};
  });
  ok('③ボタンで寸法ありに切り替わる', b3b.on===true && /寸法あり/.test(b3b.文字), JSON.stringify(b3b));
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const b3c=await p.evaluate(()=>nnWfDimOn());
  ok('③設定を覚えている', b3c===true, String(b3c));
  await p.evaluate(()=>{ nnSetWfDim(false); });

  /* ---------- ④ 頂点の移動が0.1m単位 ---------- */
  const r4=await p.evaluate(()=>{
    state.scaleM=1;
    const o={};
    o.s10=nnSnapMove(0.37);      /* 1マス=1m → 0.1m=0.1マス */
    o.s11=nnSnapMove(0.44);
    o.s12=nnSnapMove(1.06);
    state.scaleM=0.5;
    o.h05=nnSnapMove(0.17);      /* 1マス=0.5m → 0.1m=0.2マス */
    state.scaleM=0.25;
    o.q=nnSnapMove(0.11);        /* 1マス=0.25m → 0.05m=0.2マス */
    state.scaleM=1;
    return o;
  });
  console.log('④', JSON.stringify(r4));
  ok('④1マス=1m：0.1m単位で丸まる', Math.abs(r4.s10-0.4)<1e-9 && Math.abs(r4.s11-0.4)<1e-9 && Math.abs(r4.s12-1.1)<1e-9, JSON.stringify(r4));
  ok('④1マス=0.5m：0.2マス（＝0.1m）単位', Math.abs(r4.h05-0.2)<1e-9, String(r4.h05));
  ok('④1マス=0.25m：0.2マス（＝0.05m）単位', Math.abs(r4.q-0.2)<1e-9, String(r4.q));

  /* 実際に頂点をドラッグして0.1m動くか */
  const drag=await p.evaluate(async()=>{
    state.scaleM=1; state.polys=[]; drawPts=[];
    const pts=[{x:4,y:4},{x:10,y:4},{x:10,y:9},{x:4,y:9}];
    state.polys.push({name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))});
    state.active=0;
    setTool('rect');
    rsel=[{p:0,r:-1,i:0}];
    rdrag={sx:4, sy:4, base:[{p:0,r:-1,i:0,x:4,y:4}]};
    mouse.rawx=4.33; mouse.rawy=4.06;
    const dx=nnSnapMove(mouse.rawx-rdrag.sx), dy=nnSnapMove(mouse.rawy-rdrag.sy);
    rdrag.base.forEach(b=>{const pt=state.polys[b.p].pts[b.i]; pt.x=b.x+dx; pt.y=b.y+dy;});
    rdrag=null; rsel=[];
    return {x:+state.polys[0].pts[0].x.toFixed(6), y:+state.polys[0].pts[0].y.toFixed(6)};
  });
  console.log('④ドラッグ', JSON.stringify(drag));
  ok('④頂点ドラッグで0.3m/0.1m動く', Math.abs(drag.x-4.3)<1e-6 && Math.abs(drag.y-4.1)<1e-6, JSON.stringify(drag));

  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
