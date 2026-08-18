/* ★2026-08-16v 一覧カードの手直し4件
   使い方: node card6.js            （パソコン）
           node card6.js ph         （スマホたて）
           node card6.js land       （スマホよこ＝ノッチ59px入りのコピー _land.html） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'pc';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const vp = M==='pc' ? {viewport:{width:2000,height:1010}}
           : M==='land'? {viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true}
                       : {viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true};
  const p=await b.newPage(vp);
  if(M!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});
    Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+(M==='land'?'_land.html':'kirokucho_demo.html'));
  await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1000);

  const d=await p.evaluate(()=>{
    const Z=window.nnPZ||1;                       /* ★倍率で割ってCSSのpxにそろえる（§61） */
    const g=e=>{const b=e.getBoundingClientRect();
      return {l:b.left/Z, r:b.right/Z, t:b.top/Z, b:b.bottom/Z, w:b.width/Z, h:b.height/Z};};
    const out={cards:[]};
    const cs=[...document.querySelectorAll('#list .pcard')].slice(0,8);
    cs.forEach(c=>{
      const q=s=>c.querySelector(s);
      const head=q('.rhead');
      const kids=[...head.children].map(e=>({cls:e.className.split(' ')[0], ...g(e)}));
      /* ★「1行か」は tops の数では見ない（部品ごとに高さが違うので中央そろえでは
         top がバラバラになる）。**いちばん背の高い部品と行の高さを比べる**のが正しい。 */
      const maxKid=Math.max(...kids.map(k=>k.h));
      const hs=getComputedStyle(head);
      const pad=parseFloat(hs.paddingTop||0)+parseFloat(hs.paddingBottom||0);
      const sh=q('.pmain > .pshots'), dc=q('.pdocs');
      const memo=q('.pmemo'), tag=q('.rtag');
      const chips=[...c.querySelectorAll('.rtag .defchip')].map(g);
      out.cards.push({
        name:(q('.ebox.ttl')||{}).textContent,
        headLines: (g(head).h - pad) <= maxKid+3 ? 1 : 2, headH:g(head).h, maxKid:maxKid,
        headRight:Math.max(...kids.map(k=>k.r)), headBoxR:g(head).r,
        hasOrder:!!q('.r2 .horder'), orderTx:(q('.r2 .horder')||{}).textContent||'',
        orderFirst: q('.r2') && q('.r2').firstElementChild && q('.r2').firstElementChild.classList.contains('horder'),
        progW: q('.rprog .pprog')?g(q('.rprog .pprog')).w:0,   /* ★17a：住所の行の下 */
        goInBot: !!q('.pmid > .pgo'), goTx:(q('.pgo')||{}).textContent||'',
        memoRow: memo? (memo.parentElement.className.indexOf('rbot')>=0) : null,
        memoIsLast: memo? (memo.closest('.prow')===[...c.querySelectorAll('.pbd > .prow')].pop()) : null,
        goRight: q('.pmid > .pgo')? g(q('.pmid > .pgo')).r >= g(c.querySelector('.pmid')).r-40 : null,
        /* ★部品どうしが重なっていないか（バーが請負金額に重なった実例あり） */
        headOverlap:(()=>{const es=[...head.children].map(g);let n=0;
          for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++)
            if(es[i].l<es[j].r-0.5&&es[j].l<es[i].r-0.5)n++;
          const bar=head.querySelector('.pprog .prog'), od=head.querySelector('.horder');
          if(bar&&od&&g(bar).r>g(od).l+0.5)n+=100;      /* バーが請負金額へはみ出したら100 */
          return n;})(),
        r1HasOrder: !!c.querySelector('.r1 [data-f="order"]'),
        matLbl: (c.querySelector('[data-f="mat"] i')||{}).textContent||'',
        sh: sh?g(sh):null, dc: dc?g(dc):null,
        memo: memo?g(memo):null, tag: tag?g(tag):null,
        memoSameRowAsChips: (memo&&chips.length)? Math.abs(g(memo).t-chips[0].t)<14 : null,
        memoOverChip: (memo&&chips.length)? chips.some(k=>g(memo).l < k.r-1 && k.l < g(memo).r-1
                        && g(memo).t < k.b-1 && k.t < g(memo).b-1) : false,
      });
    });
    const c0=document.querySelector('#list .pcard');
    out.cardH=c0.getBoundingClientRect().height/Z;
    out.overX=document.querySelector('#list').scrollWidth-document.querySelector('#list').clientWidth;
    /* ★メイン写真は写真候補5枚と同じ 4:3 か */
    const c1=document.querySelector('#list .pcard');
    const ph=c1.querySelector('.pph'), sh1=c1.querySelector('.psh');
    out.phRatio = ph? (ph.getBoundingClientRect().width/ph.getBoundingClientRect().height) : 0;
    out.shRatio = sh1? (sh1.getBoundingClientRect().width/sh1.getBoundingClientRect().height) : 0;
    /* ★画面に近いカードが「灰色の空白」で残っていないか（後回し＝.nnoff が画面内に無いこと） */
    const L=document.querySelector('#list'), lb=L.getBoundingClientRect();
    out.blankOnScreen=[...document.querySelectorAll('#list .pcard.nnoff')].filter(c=>{
      const b=c.getBoundingClientRect(); return b.bottom>lb.top-50 && b.top<lb.bottom+50;}).length;
    out.offAll=document.querySelectorAll('#list .pcard.nnoff').length;
    /* ★空き枠に文字が残っていないか（iPhoneで見え隠れした） */
    out.emptyText=[...document.querySelectorAll('#list .psh:not(.has)')].filter(e=>e.textContent.trim()).length;
    return out;
  });

  const C=d.cards;
  ok('現場名の行は必ず1行（8件とも）', C.every(c=>c.headLines===1), C.map(c=>c.headLines).join(','));
  ok('現場名の行が枠からはみ出さない', C.every(c=>c.headRight<=c.headBoxR+1),
     C.map(c=>Math.round(c.headRight-c.headBoxR)).join(','));
  ok('現場名の行の部品どうしが重ならない（バーのはみ出しも見る）',
     C.every(c=>c.headOverlap===0), C.map(c=>c.headOverlap).join(','));
  ok('進捗バーは住所の行の下（330/220px）', C.every(c=>Math.abs(c.progW-(M==='pc'?330:220))<4), C[0].progW.toFixed(0)+'px');
  ok('「詳細」ボタンは本文の右側（利益予定額の下）', C.every(c=>c.goInBot&&c.goRight), C[0].goTx);
  ok('ボタンの文字は「詳細」', C.every(c=>c.goTx.trim()==='詳細'), C[0].goTx);
  ok('請負金額は3行目の先頭（16z）', C.every(c=>c.hasOrder&&c.orderFirst&&/請負金額/.test(c.orderTx)), C[0].orderTx);
  ok('請負金額は1か所だけ（r1に重複なし）', C.every(c=>!c.r1HasOrder));
  ok('「材料代」になっている', C.every(c=>c.matLbl==='材料代'), C[0].matLbl);
  ok('横のはみ出しなし', d.overX<=1, d.overX+'px');
  ok('メイン写真が写真候補と同じ 4:3', Math.abs(d.phRatio-4/3)<0.06,
     '写真 '+d.phRatio.toFixed(2)+' ／ 候補 '+d.shRatio.toFixed(2));
  ok('画面に見えている場所に「灰色の空白」が残らない', d.blankOnScreen===0,
     '空白 '+d.blankOnScreen+'件／後回し '+d.offAll+'件');
  ok('空き枠に文字が残っていない（見え隠れの元）', M==='pc'||d.emptyText===0, d.emptyText+'件');
  ok('JSエラーなし', errs.length===0, errs.join(' / '));

  if(M==='pc'){
    ok('パソコンは今までどおり（写真は左の枠の中・提出書類は右端）', C.every(c=>!c.sh));
  }else{
    ok('写真の帯と提出書類が重ならない',
       C.every(c=>!c.sh||!c.dc|| c.sh.r <= c.dc.l+0.5),
       C.map(c=>c.sh&&c.dc?Math.round(c.dc.l-c.sh.r):'-').join(','));
    ok('写真の帯と提出書類は同じ行（二段にしない）',
       C.every(c=>!c.sh||!c.dc|| Math.abs(c.sh.t-c.dc.t)<16),
       C.map(c=>c.sh&&c.dc?Math.round(c.dc.t-c.sh.t):'-').join(','));
    ok('メモはいちばん下の行', C.every(c=>c.memoRow&&c.memoIsLast));
    ok('カードの高さ（参考）', true, d.cardH.toFixed(0)+'px');
  }
  console.log('['+M+']');
  console.log(R.join('\n'));
  await b.close();
})();
