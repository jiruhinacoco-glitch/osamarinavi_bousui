/* ★2026-08-14c ①検索・絞り込みの帯が消えない ②進捗バー ③写真を小さく
   使い方: node kai3chk.js        （パソコン 1600px）
           node kai3chk.js ph     （スマホたて） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);

  /* ① 詳細を開いて戻っても、検索・絞り込みの帯が残るか */
  const tb=async()=>p.evaluate(()=>({
    disp:getComputedStyle(document.getElementById('toolbar')).display,
    body:document.body.className.indexOf('nn-detail')>=0,
    q:!!document.getElementById('q'), chips:document.querySelectorAll('#chips .dfil').length}));
  const t0=await tb();
  ok('最初から検索の帯が出ている', t0.disp==='flex' && t0.q, JSON.stringify(t0));
  ok('絞り込みチップがある', t0.chips>=6, String(t0.chips));
  await p.evaluate(()=>{ selectedId=props[1].id; openDetailFull(); }); await p.waitForTimeout(600);
  const t1=await tb();
  ok('詳細を開いている間は帯を隠す（今までどおり）', t1.disp==='none', t1.disp);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(600);
  const t2=await tb();
  ok('★一覧に戻ると帯が戻る', t2.disp==='flex' && t2.body===false, JSON.stringify(t2));
  /* ダッシュボード経由でも戻るか */
  await p.evaluate(()=>{ selectedId=props[2].id; openDetailFull(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>showView('dash')); await p.waitForTimeout(500);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(600);
  const t3=await tb();
  ok('ダッシュボード経由でも帯が戻る', t3.disp==='flex', JSON.stringify(t3));

  /* ② 進捗バー */
  const pg=await p.evaluate(()=>{
    const Z=window.nnPZ||1;
    const c=document.querySelector('#list .pcard');
    /* ★2026-08-16y 進捗バーは現場名の行から「そのすぐ下の行（.rsub）」へ移した */
    /* ★2026-08-17a 進行度は住所の行の下（.rprog）へ */
    const bar=c.querySelector('.rprog .pprog'); if(!bar)return null;
    const r=bar.getBoundingClientRect(), i=bar.querySelector('.prog i');
    const track=bar.querySelector('.prog');
    const cs=getComputedStyle(track), ics=getComputedStyle(i);
    const pid=+c.dataset.pid, pr=props.find(x=>x.id===pid);
    return {w:Math.round(r.width/Z), h:Math.round(r.height/Z), txt:bar.querySelector('.pv').textContent,
      pct:i.style.width, prog:pr.prog, st:pr.stRaw,
      bg:cs.backgroundImage.slice(0,30), fill:ics.backgroundImage.slice(0,30),
      inHead:!!bar.closest('.rprog'),
      afterIcon:bar===bar.parentElement.firstElementChild};   /* ★行の先頭＝バー・その右にタグ */
  });
  console.log('② 進捗バー', JSON.stringify(pg));
  ok('進捗バーがある', !!pg, pg?'':'なし');
  ok('住所の行の下（.rprog）の先頭にある', !!pg && pg.inHead && pg.afterIcon);
  ok('完成済は100%', !!pg && pg.st==='kan' && pg.txt==='100%' && pg.pct==='100%', pg&&pg.txt+' / '+pg.pct);
  ok('ダッシュボードと同じ見た目（黒い筒＋グラデ）', !!pg && /gradient/.test(pg.bg) && /gradient/.test(pg.fill), pg&&pg.bg);
  const all=await p.evaluate(()=>{
    const n=document.querySelectorAll('#list .pcard .pprog').length;
    const kou=props.find(x=>x.stRaw==='kou');
    const card=[...document.querySelectorAll('#list .pcard')].find(c=>+c.dataset.pid===kou.id);
    return {n, kouProg:kou.prog, shown:card?card.querySelector('.pprog .pv').textContent:null};
  });
  ok('全カードに出る', all.n>=10, all.n+'枚');
  ok('施工中は実際の進捗が出る', all.shown===null||all.shown===all.kouProg+'%', JSON.stringify(all));

  /* ③ 写真の大きさ・カードの高さ */
  const sz=await p.evaluate(()=>{
    const Z=window.nnPZ||1, R2=e=>e.getBoundingClientRect();
    const c=document.querySelector('#list .pcard');
    const ph=R2(c.querySelector('.pph')), psh=c.querySelector('.psh');
    const list=R2(document.getElementById('list'));
    return {card:Math.round(R2(c).height/Z),
      photo:[Math.round(ph.width/Z), Math.round(ph.height/Z)],
      cell:psh?[Math.round(R2(psh).width/Z), Math.round(R2(psh).height/Z)]:null,
      perScreen:+(list.height/R2(c).height).toFixed(1),
      r1rows:Math.round(R2(c.querySelector('.r1')).height/Z/24)};
  });
  console.log('③ 大きさ', JSON.stringify(sz));
  if(PH){
    /* ★2026-08-16j 保管写真10枚が加わったぶん高くなった（本人の指示） */
    ok('スマホのカードは 440px 以内', sz.card<=440, sz.card+'px');
  }else{
    /* ★2026-08-14e たてを0.8倍に（338→270前後）。写真の比率は 4:3 のまま。 */
    ok('カードは 345px 以内', sz.card<=345, sz.card+'px');
    ok('メインの写真は 200x150（4:3）', sz.photo[0]===200 && sz.photo[1]===150, JSON.stringify(sz.photo));
    ok('保管写真も同じ 4:3', Math.abs(sz.cell[0]/sz.cell[1]-4/3)<0.06, JSON.stringify(sz.cell));
    ok('メインと保管写真の比率が同じ',
       Math.abs(sz.photo[0]/sz.photo[1]-sz.cell[0]/sz.cell[1])<0.05,
       (sz.photo[0]/sz.photo[1]).toFixed(3)+' / '+(sz.cell[0]/sz.cell[1]).toFixed(3));
    ok('1画面に2件以上見える', sz.perScreen>=2, String(sz.perScreen));
    ok('1行目が折り返さない', sz.r1rows<=1, String(sz.r1rows));
  }
  const over=await p.evaluate(()=>{
    let n=0; document.querySelectorAll('#list .pcard').forEach(c=>{ if(c.scrollWidth>c.clientWidth+2)n++; });
    return {n, body:document.body.scrollWidth-document.body.clientWidth};
  });
  ok('横はみ出し0', over.n===0 && over.body<=0, JSON.stringify(over));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン 1600px】'));
  console.log(R.join('\n'));
  await b.close();
})();
