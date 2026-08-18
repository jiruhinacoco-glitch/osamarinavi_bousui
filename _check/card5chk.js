/* 写真の label 方式／チップの大きさ／並び替え7種／提出書類4つ */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [mode,vp] of [['pc',{width:1600,height:900}],['phone',{width:393,height:852}]]){
  console.log('\n===== '+mode+' =====');
  const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);

  /* ① 写真：本物の input + label */
  const ph=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    /* ★2026-08-13k 帯だけでなく写真ぜんぶが label（.phfull）になった */
    const lb=c.querySelector('.pph label.phfull'), inp=c.querySelector('.pph input.phinp');
    return {isLabel:!!lb, htmlFor:lb&&lb.htmlFor, inpId:inp&&inp.id, type:inp&&inp.type,
      accept:inp&&inp.accept, hasOnchange:!!(inp&&inp.getAttribute('onchange'))};
  });
  ok(ph.isLabel && ph.inpId && ph.htmlFor===ph.inpId,'写真ぜんぶが label で input と結びついている', ph.htmlFor+'='+ph.inpId);
  ok(ph.type==='file' && /image/.test(ph.accept||''),'本物のファイル入力がカード内にある', ph.type+' '+ph.accept);
  ok(ph.hasOnchange,'選んだら差し替わる（onchange）');
  /* 実際にファイルを渡して差し替わるか */
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR4nGP8z8Dwn4GBgYGJAQIABIsBhSlnEG4AAAAASUVORK5CYII=';
  await p.setInputFiles('#list .pcard input.phinp', {name:'t.png', mimeType:'image/png',
    buffer:Buffer.from(png.split(',')[1],'base64')});
  await p.waitForTimeout(900);
  const saved=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const q=props.find(x=>x.id===+c.dataset.pid);
    const st=JSON.parse(localStorage.getItem('nn_kirokucho_photo_v1')||'{}');
    return {inStore:!!st[q.code], onScreen:/^data:/.test(c.querySelector('.pph img').getAttribute('src'))};
  });
  ok(saved.inStore && saved.onScreen,'選んだ写真が保存され画面にも出る', JSON.stringify(saved));

  /* ② チップの大きさ・見切れ */
  const ch=await p.evaluate(()=>{
    const Z=window.nnPZ||1;
    const cs=[...document.querySelectorAll('#chips .dfil .stchip')];
    const last=cs[cs.length-1].getBoundingClientRect();
    const lc=document.getElementById('nnLC').getBoundingClientRect();
    const box=document.getElementById('chips');
    return {fs:parseFloat(getComputedStyle(cs[0]).fontSize)/Z, n:cs.length,
      allFit: box.scrollWidth<=box.clientWidth+1,
      lastRight:Math.round(last.right/Z), lcLeft:Math.round(lc.left/Z)};
  });
  ok(ch.fs<=12,'チップの文字が小さくなった', ch.fs+'px');
  ok(ch.allFit,'チップ8個が帯に収まって見切れない', 'scroll不要='+ch.allFit);
  ok(ch.lastRight<=ch.lcLeft+1,'件数の札と重なっていない', ch.lastRight+' ≦ '+ch.lcLeft);

  /* ③ 並び替え */
  const so=await p.evaluate(()=>{
    lfOpen=null; buildChips();
    const w=document.querySelector('#chips .dfil[data-k="profit"]');
    return {label:w.querySelector('button').textContent.replace('▼','').trim(),
      rows:[...w.querySelectorAll('.dfmenu .dfrow .vn')].map(x=>x.textContent)};
  });
  ok(so.label==='並び替え','既定は「並び替え」表示', so.label);
  ok(so.rows.length===7,'並び替えが7種', so.rows.join(' / '));
  const sorted=await p.evaluate(()=>{
    filterState['profit']='受注金額が大きい順'; buildChips(); render();
    const a=filtered(); return {ok:a[0].order>=a[a.length-1].order,
      chip:document.querySelector('#chips .dfil[data-k="profit"] button').textContent.replace('▼','').trim()};
  });
  await p.waitForTimeout(500);
  ok(sorted.ok,'受注金額の大きい順に並ぶ');
  ok(/並び：/.test(sorted.chip),'いま何順かがチップに出る', sorted.chip);
  await p.evaluate(()=>{ delete filterState['profit']; buildChips(); render(); }); await p.waitForTimeout(400);

  /* ④ 提出書類 */
  const dc=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const d=c.querySelector('.pdocs');
    if(!d)return null;
    const card=c.getBoundingClientRect(), db=d.getBoundingClientRect();
    return {head:d.querySelector('.dh').textContent,
      btns:[...d.querySelectorAll('.doc span')].map(x=>x.textContent),
      inside: db.right<=card.right+1 && db.bottom<=card.bottom+1};
  });
  ok(dc && dc.head==='提出書類','提出書類の欄がある', dc&&dc.head);
  /* ★2026-08-13n 図面・写真台帳・施工要領書を足して7つになった */
  ok(dc && dc.btns.join(',')==='見積,報告書,比較表,他資料,図面,写真台帳,施工要領書','7つのアイコンがある', dc&&dc.btns.join(','));
  ok(dc && dc.inside,'カードの枠の中に収まっている');
  /* 他資料 → 保管資料タブへ */
  await p.evaluate(()=>nnDoc(props[0].id,'other')); await p.waitForTimeout(800);
  const tab=await p.evaluate(()=>curTab);
  ok(tab==='保管資料','「他資料」で保管資料タブが開く', tab);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(600);

  const of=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(of<=0,'横はみ出しなし', of);
  ok(errs.length===0,'JSエラーなし', errs.join('|').slice(0,180));
  await p.screenshot({path:'card5_'+mode+'.png'});
  await ctx.close();
}
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
