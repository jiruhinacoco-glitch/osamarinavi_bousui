/* ★2026-08-17b 絞り込みタグの拡充（12種＋不具合＋並び替え） */
try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'pc';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const vp=M==='pc'?{viewport:{width:2000,height:1010}}
      :M==='ph'?{viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true}
               :{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true};
  const p=await b.newPage(vp);
  if(M!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+(M==='land'?'_land.html':'kirokucho_demo.html'));
  await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1000);

  const d=await p.evaluate(()=>{
    const w=document.getElementById('chips');
    const chips=[...w.querySelectorAll('.dfil')].map(e=>({k:e.dataset.k,
      tx:e.querySelector('button').textContent.replace(/[▼\d]/g,'').trim()}));
    const tb=document.getElementById('toolbar');
    const cs=getComputedStyle(w);
    return {order:chips.map(c=>c.k).join(','), labels:chips.map(c=>c.tx).join(','),
      n:chips.length, wrap:cs.flexWrap, ovx:cs.overflowX,
      /* ★.dfmenu（チップごとの隠れメニュー）は固定14個で§123tの対象外。
         見るべきは「チップの帯そのもの」がスクロール箱でないこと */
      scrollBoxes:[...document.querySelectorAll('#toolbar *')].filter(e=>{const s2=getComputedStyle(e);
        return !e.classList.contains('dfmenu') && /auto|scroll/.test(s2.overflowX+s2.overflowY);}).length,
      tbH:Math.round(tb.getBoundingClientRect().height/(window.nnPZ||1)),
      overX:tb.scrollWidth-tb.clientWidth,
      hidden:chips.filter(c2=>{const e=w.querySelector('.dfil[data-k="'+c2.k+'"]');
        const r=e.getBoundingClientRect(), rw=w.getBoundingClientRect();
        return r.right>rw.right+2||r.left<rw.left-2;}).length};
  });
  ok('タグは14個（絞り込み12＋不具合＋並び替え）', d.n===14, d.n+'個: '+d.labels);
  ok('並び順＝ステータス・工法・メーカー・元請・地域・年度・既存・区分・構造・契約・金額・数量・不具合・並び替え',
     d.order==='status,hou,maker,moto,area,nendo,kizon,kind,kouzou,kbn,kingaku,qty,defect,profit', d.order);
  ok('並び替えチップはいちばん右端', /profit$/.test(d.order));
  ok('隠れているタグが無い（横スクロールで探さなくてよい）', d.hidden===0, d.hidden+'個');
  ok('横のはみ出しなし', d.overX<=1, d.overX+'px');
  if(M!=='pc') ok('チップの帯はスクロール箱ではない（横送りで隠れない）', d.scrollBoxes===0, d.scrollBoxes+'個');
  ok('帯の高さ（参考）', true, d.tbH+'px');

  /* 新しいタグ4種＋金額・数量で、実際に絞り込めるか */
  for(const [k,v,exp] of [['kizon','不明',null],['kind','改修',null],['kouzou','RC',null],
                          ['kbn','材工',null],['kingaku','100〜300万円',null],['qty','100〜300㎡',null]]){
    const r=await p.evaluate(async([k2,v2])=>{
      listFil[k2].add(v2); buildChips(); render();
      /* ★一覧は「最初の14件→残りは次のコマ」の2段組み立て（§95）。待ってから数える */
      await new Promise(r2=>setTimeout(r2,700));
      const f=LIST_FIL.find(x=>x.key===k2);
      const n=props.filter(p2=>(f.val(p2)||'—')===v2).length;
      const shown=document.querySelectorAll('#list .pcard').length;
      listFil[k2].clear(); buildChips(); render();
      return {n, shown};
    },[k,v]);
    ok(`「${k}=${v}」で絞り込める（件数一致）`, r.n===r.shown && r.n>0, r.shown+'/'+r.n+'件');
    await p.waitForTimeout(150);
  }
  /* 金額メニューの並びが「小→大」か */
  const kin=await p.evaluate(()=>{ lfCounts(); return lfVals['kingaku'].map(e=>e[0]).join(','); });
  ok('金額の選択肢が小→大の順', kin.indexOf('100万円未満')===0 && kin.indexOf('1000万円以上')>kin.indexOf('500〜1000万円'), kin);
  /* メニューが画面内に開くか（最後のタグ＝数量で確認） */
  await p.evaluate(()=>{const b2=document.querySelector('#chips .dfil[data-k="qty"] button');
    b2.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
  await p.waitForTimeout(400);
  const menu=await p.evaluate(()=>{
    const m=document.querySelector('#nnPortal.dfmenu, #nnPortal .dfmenu, .dfmenu.open');
    if(!m)return null; const r=m.getBoundingClientRect();
    return {t:Math.round(r.top),b:Math.round(r.bottom),l:Math.round(r.left),r:Math.round(r.right),
      iw:innerWidth, ih:innerHeight, vis:r.width>10&&r.height>10};
  });
  ok('メニューが画面内に開く', !!menu && menu.vis && menu.l>=-2 && menu.r<=menu.iw+2 && menu.t>=-2,
     JSON.stringify(menu));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('['+M+']'); console.log(R.join('\n'));
  await b.close();
})();
