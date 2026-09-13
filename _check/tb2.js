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
    /* --- PC：用途ごとに四角い大枠で区切り、まとまりを保って詰める（2026-09-13f） --- */
    const g=await p.evaluate(()=>{
      const r=id=>{ const e=document.getElementById(id); return e?e.getBoundingClientRect():null; };
      const ids=e=>[...e.querySelectorAll('.tbtn,.tsel')].map(x=>x.id);
      const groups=Object.fromEntries([...document.querySelectorAll('#toolbar .tbcluster')]
        .map(e=>[e.dataset.group,ids(e)]));
      const kept=[...document.querySelectorAll('#toolbar .tbcluster')].every(e=>{
        const b=[...e.querySelectorAll('.tbtn,.tsel')].filter(x=>x.offsetParent).map(x=>r(x.id));
        return !b.length || b.every(x=>Math.abs(x.top-b[0].top)<2);
      });
      const visible=[...document.querySelectorAll('#toolbar .tbtn,#toolbar .tsel')].filter(e=>e.offsetParent&&e.id!=='tl_night'&&e.id!=='tl_day');
      const clusters=[...document.querySelectorAll('#toolbar .tbcluster')].filter(e=>e.offsetParent);
      const framed=clusters.every(e=>{ const s=getComputedStyle(e);
        return parseFloat(s.borderTopWidth)>=1 && (e.dataset.group==='history'
          ? parseFloat(s.borderRadius)===0 : parseFloat(s.borderRadius)>=20)
          && s.backgroundColor!=='rgba(0, 0, 0, 0)' && s.backgroundColor!=='transparent'; });
      const hs=getComputedStyle(document.getElementById('tl_undo'));
      const rs=getComputedStyle(document.getElementById('tl_redo'));
      const historySquare=parseFloat(hs.borderRadius)===0 && parseFloat(rs.borderRadius)===0
        && parseFloat(rs.borderLeftWidth)>=1 && r('tl_undo').height>=48 && r('tl_redo').height>=48
        && document.querySelector('#tl_undo img.tbi').getBoundingClientRect().height>=30;
      /* 高さが違う大枠は同じflex行でも上端が2pxほど違うため、中心位置を近接統合して数える。 */
      const centers=clusters.map(e=>{const q=e.getBoundingClientRect();return (q.top+q.bottom)/2;}).sort((a,b)=>a-b);
      const tops=centers.reduce((a,y)=>{if(!a.length||y-a[a.length-1]>10)a.push(y);return a;},[]);
      const center=q=>(q.top+q.bottom)/2;
      const first=visible.filter(e=>Math.abs(center(r(e.id))-center(r('tl_undo')))<10).map(e=>e.id);
      return {c:r('tbgC'), rows:tops.length, first, groups, kept, framed, historySquare, vw:innerWidth};
    });
    ok('PCは空きを使って3行以内', g.rows<=3, g.rows+'行');
    ok('戻る／進む以外の各系統は横長の丸い大枠', g.framed);
    ok('戻る／進むは高さ48px・絵30pxの大きい四角い2区画', g.historySquare);
    ok('戻る／進む・描画系・表示系・選択系・削除系が別のまとまり',
       g.groups.history.join(',')==='tl_undo,tl_redo'
       && g.groups.draw.join(',')==='tl_draw,tl_box,tl_arc'
       && g.groups.display.join(',')==='tl_grid,tl_dims,tl_ang'
       && g.groups.selection.join(',')==='tl_sel_point,tl_sel_face,tl_sel,tl_rect'
       && g.groups.delete.join(',')==='tl_del,tl_rdel,tl_clear', JSON.stringify(g.groups));
    ok('1行目は参考画像どおり戻る→描画→表示→選択→削除の順',
       g.first.filter(x=>x!=='tl_rdel').slice(0,12).join(',')
       ==='tl_undo,tl_redo,tl_draw,tl_box,tl_arc,tl_grid,tl_dims,tl_ang,tl_sel_point,tl_sel_face,tl_sel,tl_rect', g.first.join(','));
    const menus=await p.evaluate(()=>{
      const tx=id=>document.getElementById(id)?.textContent.replace(/\s+/g,'').trim()||'';
      nnTbMenuToggle('nnMoreMenu'); const more=getComputedStyle(document.getElementById('nnMoreMenu')).display!=='none';
      nnTbMenuToggle('nnSetsubiMenu'); const set=getComputedStyle(document.getElementById('nnSetsubiMenu')).display!=='none';
      return {more,set,td:tx('tl_p_tatedrain'),yd:tx('tl_p_yokodrain'),eq:tx('tl_setsubi'),
        hand:[...document.querySelectorAll('#nnSetsubiMenu button')].some(b=>b.textContent.trim()==='手すり'),
        dim:!!document.querySelector('#nnMoreMenu #tl_wfdim'),kasagi:document.getElementById('tl_p_kasagi').getAttribute('onclick'),
        removed:!document.getElementById('tl_fit')&&!document.getElementById('tl_ksg')&&!document.getElementById('tl_tesuri')};
    });
    ok('全体・旧アルミ笠木・独立した手すりボタンを削除', menus.removed);
    ok('その他メニューに寸法表示を移動', menus.more&&menus.dim);
    ok('設備追加メニューに手すりを移動', menus.set&&menus.hand&&/設備追加/.test(menus.eq));
    ok('改修ドレンへ名称変更', /タテ改修ドレン/.test(menus.td)&&/ヨコ改修ドレン/.test(menus.yd));
    ok('笠木アイコンからアルミ笠木設定を開く', /nnKasagiPanel/.test(menus.kasagi));
    const pickModes=await p.evaluate(()=>{
      loadSample();
      const tap=(x,y)=>{const q=cv.getBoundingClientRect();cv.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,clientX:q.left+x,clientY:q.top+y}));};
      const poly=state.polys[0],pt=poly.pts[0];
      setTool('selpt',1); tap(gx2px(pt.x),gy2px(pt.y)); const point=rsel.length===1;
      const c=poly.pts.reduce((a,p)=>({x:a.x+p.x/poly.pts.length,y:a.y+p.y/poly.pts.length}),{x:0,y:0});
      setTool('selface',1); tap(gx2px(c.x),gy2px(c.y)); const face=state.active===0;
      const a=poly.pts[0],b=poly.pts[1]; setTool('sel',1); tap(gx2px((a.x+b.x)/2),gy2px((a.y+b.y)/2)); const edge=!!sel;
      return {point,face,edge};
    });
    ok('点選択・面選択・辺選択がそれぞれ働く', pickModes.point&&pickModes.face&&pickModes.edge, JSON.stringify(pickModes));
    ok('保存／開く・写真／下絵が別のまとまり',
       g.groups.files.join(',')==='tl_save,tl_open'
       && g.groups.trace.join(',')==='tl_photo,tl_uimg', JSON.stringify(g.groups));
    ok('画面幅が足りないときも関連ボタンの途中で折り返さない', g.kept);
    ok('C（夜・昼）は右上', g.c.right>g.vw-120 && g.c.top<80,
       'right='+Math.round(g.c.right)+' top='+Math.round(g.c.top));
    const ovx=await p.evaluate(()=>document.body.scrollWidth-innerWidth);
    ok('横はみ出しなし', ovx<=0, ovx+'px');
    /* §401：画像の1754px幅では保存系統が削除の右の空きに入る。 */
    await p.setViewportSize({width:1754,height:982});
    ok('右上の空きに保存・開くが収まる', await p.evaluate(()=>{
      const r=id=>document.getElementById(id).getBoundingClientRect();
      const a=r('tl_clear'), b=r('tl_save'), c=r('tl_open'), day=r('tl_day');
      return Math.abs((a.top+a.bottom-b.top-b.bottom)/2)<3 && b.left>a.right && c.right<day.left;
    }));
    await p.locator('#tl_more').click();
    ok('平面図のその他に寸法設定が見える（空の窓を出さない）',
      await p.locator('#nnMoreMenu #tl_wfdim').isVisible());
    await p.locator('#tl_more').click();
    await p.setViewportSize({width:1600,height:900});
  }else{
    /* --- スマホ（2026-08-16f）：⋯道具は廃止・全アイコン直置き・枠なし --- */
    const m=await p.evaluate(()=>{
      const vis=id=>{ const e=document.getElementById(id); return !!(e&&e.offsetParent); };
      const btns=[...document.querySelectorAll('#toolbar .tbtn.hasimg')].filter(e=>e.offsetParent);
      const bare=btns.every(e=>{ const s=getComputedStyle(e);
        return (s.backgroundColor==='rgba(0, 0, 0, 0)'||s.backgroundColor==='transparent'||e.classList.contains('on'))
            && (s.borderStyle==='none'||parseFloat(s.borderWidth)===0); });
      const lefts=btns.map(e=>e.getBoundingClientRect());
      const rows=new Set(lefts.map(r=>Math.round((r.top+r.bottom)/20))).size;
      const maxRight=Math.max(...lefts.map(r=>r.right));
      const toolbarH=document.getElementById('toolbar').getBoundingClientRect().height;
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
        n:btns.length, bare, rows, toolbarH, over:maxRight>innerWidth,
        onMark:/255, 232, 115/.test(onImg),
        scaleBtn:!!document.getElementById('tl_scale')};
    });
    ok('⋯道具メニューは無い（廃止）', !m.menu);
    ok('全ボタンが直接見えている', m.all && m.n>=20, m.n+'個');
    ok('★絵のボタンに白い枠が無い', m.bare);
    ok('折り返して全部画面内（横はみ出しなし・高さを増やさない）', !m.over && m.toolbarH<=135,
       m.rows+'段相当・高さ'+Math.round(m.toolbarH)+'px');
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
  ok('タテ改修ドレンのスタンプで図面に置ける', st.n===1&&st.nm==='タテ改修ドレン 75φ', JSON.stringify(st));
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
