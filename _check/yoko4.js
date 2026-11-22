/* PCの横長4段カード（.yon＝nnYoNew §1345）の検査
   使い方：node _check/yoko4.js [ファイル名]   （http://localhost:8899 が要る）
   ①幅1920：横長のカードが出ている・1画面にまるごと4枚・100枚とも同じ高さ
   ②幅1920：100枚ぜんぶで字のはみ出し 0（実測）
   ③幅1920：写真・番号の札・資料6つ・「詳細」がカードの中に見えている／前の部品（.pbd）は見えない
   ④幅1920：ステータスを押すと選ぶ箱が出る・「詳細」で詳細が開く
   ⑤幅1400：横長にならない（前のカードのまま）／ ?pcy=0：前の2列のまま ／ スマホ：横長を作らない
   ⑥幅1920：屋根1つのカードに写真2〜6の帯（5マス＋他）が出る・屋根2つ以上には出ない・空きマスを押すと写真を選ぶ窓が開く
   ★「直す前の版」では①が★NGになる（.yon が無い） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html', URL='http://localhost:8899/'+FILE;
let ng=0; const ok=(c,t,x)=>{ if(c) console.log('○',t,x||''); else { ng++; console.log('★NG',t,x||''); } };
async function open(b,vw,vh,q,phone){
  const c=await b.newContext(phone?{viewport:{width:vw,height:vh},screen:{width:vw,height:vh},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:vw,height:vh},screen:{width:vw,height:vh}});
  const p=await c.newPage(); p._errs=[]; p.on('pageerror',e=>p._errs.push(e.message));
  await p.goto(URL+(q||''),{waitUntil:'load'});
  await p.waitForFunction(()=>typeof showView==='function');
  await p.evaluate(()=>showView('list'));
  await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=50,null,{timeout:15000});
  await p.waitForTimeout(600);
  return [c,p];
}
const vis=`e=>{ if(!e) return false; const q=e.getBoundingClientRect(); return q.width>2&&q.height>2&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none'; }`;
(async()=>{
  const b=await chromium.launch();
  { const [c,p]=await open(b,1920,1080);
    const r=await p.evaluate((visS)=>{ const vis=eval(visS);
      const l=document.getElementById('list'), L=l.getBoundingClientRect(), cs=[...l.querySelectorAll('.pcard')];
      cs.forEach(c=>c.classList.remove('nnoff'));
      const full=cs.filter(c=>{ const q=c.getBoundingClientRect(); return q.top>=L.top-1&&q.bottom<=L.bottom+1; }).length;
      const hs=cs.map(c=>c.offsetHeight), ws=cs.map(c=>c.offsetWidth);
      const ov=[]; cs.forEach(c=>c.querySelectorAll(':scope > .yon .yt>.v, :scope > .yon .yrc .m, :scope > .yon .yl5>.ysp').forEach(e=>{ if(e.scrollWidth>e.clientWidth+1) ov.push(c.dataset.pid+':'+e.className+':'+e.textContent.slice(0,12)); }));
      const c0=cs[0], cb=c0.getBoundingClientRect(), inside=e=>{ if(!vis(e)) return false; const q=e.getBoundingClientRect(); return q.left>=cb.left-1&&q.right<=cb.right+1&&q.top>=cb.top-1&&q.bottom<=cb.bottom+1; };
      return {on:document.documentElement.getAttribute('data-pcy'), yon:vis(c0.querySelector(':scope > .yon')), full, hmin:Math.min(...hs), hmax:Math.max(...hs), wmin:Math.min(...ws), lw:l.clientWidth, ov,
        ph:inside(c0.querySelector('.pph')), no:inside(c0.querySelector('.pno')), docs:[...c0.querySelectorAll('.yon .ydocs>button')].filter(inside).length, go:inside(c0.querySelector('.yon .ygo')),
        old:[...c0.querySelectorAll('.pbd,.pexist,.pexn,.psub')].filter(vis).length+cs.reduce((n,c)=>n+[...c.children].filter(e=>!e.matches('.yon,.pno,.pcol')&&getComputedStyle(e).display!=='none').length+[...c.querySelectorAll(':scope > .pcol > *')].filter(e=>!e.matches('.pph')&&getComputedStyle(e).display!=='none').length,0),
        drow:new Set([...c0.querySelectorAll('.yon .ydocs>button')].map(e=>Math.round(e.getBoundingClientRect().top))).size, hd:[...c0.querySelectorAll('.yon .ycon .yt>i')].map(e=>e.textContent).join(',')};
    },vis);
    ok(r.on==='1'&&r.yon,'①横長のカードが出ている',JSON.stringify({on:r.on,yon:r.yon}));
    ok(r.full===4,'①1画面にまるごと4枚',r.full+'枚');
    ok(r.hmin===r.hmax&&r.hmin>=132&&r.hmin<=240,'①100枚とも同じ高さ（132〜240px）',r.hmin+'〜'+r.hmax);
    ok(r.wmin>=r.lw*0.95,'①カードは一覧の幅いっぱい（1列）',r.wmin+'/'+r.lw);
    ok(r.ov.length===0,'②字のはみ出し 0',r.ov.length+'件 '+r.ov.slice(0,6).join(' | '));
    ok(r.ph&&r.no&&r.docs===6&&r.go,'③写真・番号の札・資料6つ・詳細がカードの中',JSON.stringify({ph:r.ph,no:r.no,docs:r.docs,go:r.go}));
    ok(r.old===0,'③前の部品は見えない（100枚・display が none でないものも数える＝§1349 の謎の線）',r.old+'個');
    ok(r.drow===2,'③資料は3つ×2段',r.drow+'段');
    ok(r.hd==='請負種別,元請名,請負体制,協力業者,請負単価,請負金額,予定利益額,率,屋根数,計画日数,完成日,残り日数,計画人工,現在人工'||/完成予定日/.test(r.hd),'③見出し14個',r.hd);
    await p.click('#list .pcard:first-child > .yon .status');
    const sel=await p.waitForFunction(()=>!!document.querySelector('#list .pcard select, .nnpick, .edpop, [class*="pick"]'),null,{timeout:3000}).then(()=>true).catch(()=>false);
    ok(sel,'④ステータスを押すと選ぶ箱が出る');
    await p.keyboard.press('Escape');
    await p.click('#list .pcard:nth-child(2) > .yon .ygo');
    const det=await p.waitForFunction(()=>{ const m=document.getElementById('mainview'); return m&&m.classList.contains('show-detail'); },null,{timeout:5000}).then(()=>true).catch(()=>false);
    ok(det,'④「詳細」で詳細が開く');
    ok(p._errs.length===0,'エラーなし',p._errs.slice(0,2).join(' / '));
    await c.close(); }
  { const [c,p]=await open(b,1920,1080);
    const r=await p.evaluate(()=>{ const cs=[...document.querySelectorAll('#list .pcard')]; cs.forEach(c=>c.classList.remove('nnoff'));
      let bad1=0, badN=0, n1=0; cs.forEach(c=>{ const n=c.querySelectorAll(':scope > .yon .yrc').length, more=!!c.querySelector(':scope > .yon .ymore'), sh=c.querySelectorAll(':scope > .yon .yshots .ysh').length, m=c.querySelectorAll(':scope > .yon .yshm').length;
        if(n<=1&&!more){ n1++; if(sh!==5||m!==1) bad1++; const e=c.querySelector(':scope > .yon .ysh'); if(e&&(e.offsetWidth<40||e.offsetHeight<40)) bad1++; } else if(sh||m) badN++; });
      return {n1,bad1,badN}; });
    ok(r.n1>0&&r.bad1===0,'⑥屋根1つのカードに写真2〜6の帯（5マス＋他・1マス40px以上）',JSON.stringify(r));
    ok(r.badN===0,'⑥屋根2つ以上には帯を出さない',r.badN+'枚');
    const fc=p.waitForEvent('filechooser',{timeout:4000}).then(()=>true).catch(()=>false);
    await p.click('#list .pcard > .yon .ysh:not(.has)');
    ok(await fc,'⑥空きマスを押すと写真を選ぶ窓が開く');
    await c.close(); }
  { const [c,p]=await open(b,1400,900);
    const r=await p.evaluate(()=>({on:document.documentElement.getAttribute('data-pcy'), n:document.querySelectorAll('#list .pcard > .yon').length}));
    ok(r.on==null&&r.n===0,'⑤幅1400：横長にならない',JSON.stringify(r)); await c.close(); }
  { const [c,p]=await open(b,1920,1080,'?pcy=0');
    const r=await p.evaluate(()=>({on:document.documentElement.getAttribute('data-pcy'), n:document.querySelectorAll('#list .pcard > .yon').length, w:document.querySelector('#list .pcard').offsetWidth, lw:document.getElementById('list').clientWidth}));
    ok(r.on==null&&r.n===0&&r.w<r.lw*0.6,'⑤?pcy=0：前の2列のまま',JSON.stringify(r)); await c.close(); }
  { const [c,p]=await open(b,390,844,'',true);
    const r=await p.evaluate(()=>({on:document.documentElement.getAttribute('data-pcy'), n:document.querySelectorAll('#list .pcard > .yon').length}));
    ok(r.on==null&&r.n===0,'⑤スマホ：横長を作らない',JSON.stringify(r)); await c.close(); }
  await b.close();
  console.log(ng?('★NG '+ng):'○ ぜんぶ通過');
  process.exit(ng?1:0);
})();
