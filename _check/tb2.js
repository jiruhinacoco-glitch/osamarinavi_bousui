/* ★2026-08-16a 図面・積算 ツールバー刷新（モック準拠）の検証
   使い方: node tb2.js（PC） / node tb2.js ph（スマホたて） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                           :{viewport:{width:1600,height:900}});
  if(PH)await p.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});
    Object.defineProperty(screen,'height',{get:()=>852});}catch(e){} });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

  /* --- 共通：新ボタンの有無 --- */
  const ids=['tl_wari_h','tl_wari_v','tl_p_hikomi','tl_p_oshidashi','tl_p_kasagi',
             'tl_p_dakki','tl_p_tatedrain','tl_p_yokodrain','tl_night','tl_day'];
  const has=await p.evaluate(ids=>ids.map(id=>!!document.getElementById(id)), ids);
  ok('新ボタン10個がある', has.every(Boolean), has.map((v,i)=>v?'':ids[i]).join(''));
  ok('旧ダークモードボタン（tl_theme）は無い',
     await p.evaluate(()=>!document.getElementById('tl_theme')));

  if(!PH){
    /* --- PC：3つのかたまり --- */
    const g=await p.evaluate(()=>{
      const r=id=>{ const e=document.getElementById(id); return e?e.getBoundingClientRect():null; };
      const rows=[...document.querySelectorAll('#tbgA .tbrow')].length;
      return {a:r('tbgA'), b:r('tbgB'), c:r('tbgC'), rowsA:rows,
        order:[...document.querySelectorAll('#tbgA .tbrow')[0].children].map(x=>x.id)};
    });
    ok('AとBが横に並ぶ（Bが下に落ちない）',
       g.a.left<g.b.left && Math.abs(g.a.top-g.b.top)<5,
       'A('+Math.round(g.a.left)+','+Math.round(g.a.top)+') B('+Math.round(g.b.left)+','+Math.round(g.b.top)+')');
    ok('C（夜・昼）は右上', g.c.right>g.b.right && g.c.top<g.a.top+10,
       'right='+Math.round(g.c.right)+' top='+Math.round(g.c.top));
    ok('BがCの下に潜らない', g.b.right<=g.c.left+2,
       Math.round(g.b.right)+' ≦ '+Math.round(g.c.left));
    ok('Aは3行', g.rowsA===3, g.rowsA+'行');
    /* ★2026-08-26a ▭長方形が「描画」の右に増えた */
    ok('A1行目の並び＝戻る/進む/描画/長方形/削除/寸法表示/範囲選択',
       g.order.slice(0,7).join(',')==='tl_undo,tl_redo,tl_draw,tl_box,tl_del,tl_dims,tl_rect', g.order.join(','));
    const ovx=await p.evaluate(()=>document.body.scrollWidth-innerWidth);
    ok('横はみ出しなし', ovx<=0, ovx+'px');
  }else{
    /* --- スマホ（2026-08-16f）：⋯道具は廃止・全アイコン直置き・枠なし --- */
    const m=await p.evaluate(()=>{
      const vis=id=>{ const e=document.getElementById(id); return !!(e&&e.offsetParent); };
      const btns=[...document.querySelectorAll('#toolbar .tbtn.hasimg')].filter(e=>e.offsetParent);
      const bare=btns.every(e=>{ const s=getComputedStyle(e);
        return (s.backgroundColor==='rgba(0, 0, 0, 0)'||s.backgroundColor==='transparent'||e.classList.contains('on'))
            && (s.borderStyle==='none'||parseFloat(s.borderWidth)===0); });
      const lefts=btns.map(e=>e.getBoundingClientRect());
      const rows=new Set(lefts.map(r=>Math.round(r.top/10))).size;
      const maxRight=Math.max(...lefts.map(r=>r.right));
      const onBtn=btns.find(e=>e.classList.contains('on'));
      const onBg=onBtn?getComputedStyle(onBtn).backgroundColor:'';
      /* ★2026-08-23v 夜/昼・ヨコ/タテ割付は「動いている方だけ」表示（対のボタン）。
         両方見えている前提は古い。どちらか一方が見えていればよい。 */
      const either=(a,b)=>vis(a)||vis(b);
      /* ★2026-08-25a 選択中は「薄い緑」→「黄色＋緑の外リング」に変わった（本人の指摘で視認性を上げた） */
      const onImg=onBtn?getComputedStyle(onBtn).backgroundImage:'';
      return {menu:!!document.getElementById('tbMenu'),
        all:['tl_p_dakki','tl_p_tatedrain','tl_pan','tl_sample'].every(vis)
            && either('tl_night','tl_day') && either('tl_wari_h','tl_wari_v'),
        n:btns.length, bare, rows, over:maxRight>innerWidth,
        onMark:/255, 232, 115/.test(onImg),
        scaleBtn:!!document.getElementById('tl_scale')};
    });
    ok('⋯道具メニューは無い（廃止）', !m.menu);
    ok('全ボタンが直接見えている', m.all && m.n>=20, m.n+'個');
    ok('★絵のボタンに白い枠が無い', m.bare);
    ok('折り返して全部画面内（横はみ出しなし）', !m.over && m.rows<=4, m.rows+'段');
    ok('選択中のツールは黄色ではっきり分かる', m.onMark);
    ok('「1マス＝」ボタンがある', m.scaleBtn);
  }

  /* --- ヨコ割付／タテ割付：向きが変わり、割付タブへ --- */
  const w=await p.evaluate(()=>{ nnWariDir('v');
    return {tab, dir:state.dir, on:document.getElementById('tl_wari_v').classList.contains('on')}; });
  ok('タテ割付 → 縦流し＋割付タブ＋ボタン点灯', w.tab==='wf'&&w.dir==='v'&&w.on, JSON.stringify(w));
  const w2=await p.evaluate(()=>{ nnWariDir('h'); return {dir:state.dir,
    on:document.getElementById('tl_wari_h').classList.contains('on'),
    off:!document.getElementById('tl_wari_v').classList.contains('on')}; });
  ok('ヨコ割付 → 横流しに戻る', w2.dir==='h'&&w2.on&&w2.off, JSON.stringify(w2));
  ok('右パネルの横流し・縦流しは非表示（ダブり削除）／短手は残る',
     await p.evaluate(()=>{ const s=id=>getComputedStyle(document.getElementById(id)).display;
       return s('dir_h')==='none'&&s('dir_v')==='none'&&s('dir_s')!=='none'; }));

  /* --- 部材スタンプ：押す→図面をタップ→置かれる --- */
  await p.evaluate(()=>{ setTab('zu'); nnStamp('tatedrain'); });
  const cv=await p.$('#cv'); const bb=await cv.boundingBox();
  await p.mouse.click(bb.x+bb.width*0.5, bb.y+bb.height*0.6);
  await p.waitForTimeout(300);
  const st=await p.evaluate(()=>({n:(state.parts||[]).length,
    nm:(nnPartsLib().find(x=>x.id===(state.parts||[{}])[0].p)||{}).name}));
  ok('タテドレンのスタンプで図面に置ける', st.n===1&&st.nm==='たて型ドレン 75φ', JSON.stringify(st));
  await p.evaluate(()=>{ nnStamp('dakki'); });
  await p.mouse.click(bb.x+bb.width*0.3, bb.y+bb.height*0.4);
  await p.waitForTimeout(200);
  const st2=await p.evaluate(()=>({n:(state.parts||[]).length,
    lib:nnPartsLib().some(x=>x.name==='脱気筒')}));
  ok('脱気筒も置ける（登録が自動でできる）', st2.n===2&&st2.lib, JSON.stringify(st2));

  /* --- 夜画面／昼画面 --- */
  const th=await p.evaluate(()=>{ document.getElementById('tl_night').click();
    return {t:document.documentElement.getAttribute('data-nntheme'),
      on:document.getElementById('tl_night').classList.contains('on')}; });
  ok('夜画面 → ダーク＋点灯', th.t==='dark'&&th.on, JSON.stringify(th));
  const th2=await p.evaluate(()=>{ document.getElementById('tl_day').click();
    return {t:document.documentElement.getAttribute('data-nntheme'),
      on:document.getElementById('tl_day').classList.contains('on')}; });
  ok('昼画面 → 通常に戻る＋点灯', th2.t==='light'&&th2.on, JSON.stringify(th2));

  /* --- マス表示の切替で文字が更新される（アイコンの包みを壊さない） --- */
  const gr=await p.evaluate(()=>{ nnToggleGrid();
    const b=document.getElementById('tl_grid'); const t=b.textContent; nnToggleGrid();
    return {off:t.includes('マス表示'), back:b.textContent.includes('マス表示')}; });
  ok('マス表示の切替で文字が保たれる', gr.off&&gr.back, JSON.stringify(gr));

  /* 後片付け（置いた役物を消す） */
  await p.evaluate(()=>{ state.parts=[]; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
