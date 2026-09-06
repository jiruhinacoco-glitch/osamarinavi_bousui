/* ★2026-09-06d 帯の見出し「平面図モード／断面図モード」＋切替ボタン＋表示のスライドスイッチ（§296）
   使い方: node _check/hdmode.js  ／  node _check/hdmode.js ph（スマホ）*/
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                            :{viewport:{width:1600,height:900}});
  if(PH) await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1400);
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){} state.scaleM=1;
    const pts=[{x:0,y:0},{x:19,y:0},{x:19,y:9},{x:0,y:9}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.kubun='shinchiku'; state.genkyo='body'; delete state.mode; saveState(); });
  /* ① 入口メニューの「平面図作成 → はじめる」でモードが決まる */
  await p.evaluate(()=>{ try{nnZMenuOpen&&nnZMenuOpen();}catch(_){} });
  await p.waitForTimeout(600);
  const started=await p.evaluate(async()=>{ const c=[...document.querySelectorAll('#nnZMenu .zmCard')][0];
    const go=c.querySelector('.zmGoB'); if(go) go.click(); await new Promise(r=>setTimeout(r,700));
    return {mode:state.mode, tab, menu:document.body.classList.contains('nn-zmenu')}; });
  ok(started.mode==='plan'&&started.tab==='zu'&&!started.menu,'「平面図作成」で始めると 平面図モード',started);
  const a=await p.evaluate(()=>({md:document.getElementById('hdMode').textContent.trim(),
    sw:document.getElementById('hdSwap').textContent.trim(),
    tabs:getComputedStyle(document.getElementById('hdTabs')).display,
    h:Math.round(document.querySelector('header').getBoundingClientRect().height)}));
  ok(/平面図モード/.test(a.md),'帯に「平面図モード」の見出しが出る',a.md);
  ok(/3D投影へ/.test(a.sw),'ボタンは「3D投影へ」',a.sw);
  ok(a.tabs==='none','①②③のタブは出さない（setTab のために要素は残す）',a.tabs);
  ok(a.h<=(PH?40:50),'帯は厚くならない（1段のまま）',a.h);   /* 変更前と同じ実測値：スマホ38・よこ43・PC48 */
  /* ② 3D投影へ → 見出しと文言が入れ替わる */
  await p.evaluate(()=>document.getElementById('hdSwap').click()); await p.waitForTimeout(1200);
  const c3=await p.evaluate(()=>({md:document.getElementById('hdMode').textContent.trim(), sw:document.getElementById('hdSwap').textContent.trim(), tab}));
  ok(c3.tab==='d3'&&/3D投影/.test(c3.md)&&/平面図作成へ/.test(c3.sw),'押すと3D投影＝見出しは「3D投影」・ボタンは「平面図作成へ」',c3);
  await p.evaluate(()=>document.getElementById('hdSwap').click()); await p.waitForTimeout(900);
  ok(await p.evaluate(()=>tab)==='zu','もう一度押すと平面図に戻る');
  /* ③ 表示＝スライドスイッチ（つまみが動く・同じところを押すととなりへ） */
  const s1=await p.evaluate(()=>{ const sb=document.getElementById('nnStageBar');
    return {n:sb.querySelectorAll('button[data-st]').length, kn:!!sb.querySelector('.kn'),
      left:sb.querySelector('.kn').style.left, on:sb.querySelector('button.on').textContent.trim(), st:nnStageGet()}; });
  ok(s1.kn&&s1.n===2,'新築＝2つのスイッチ（下地／施工後）・つまみがある',s1);
  ok(s1.st==='body'&&/下地/.test(s1.on),'いまは「下地」',s1);
  await p.evaluate(()=>document.querySelector('#nnStageBar button.on').click()); await p.waitForTimeout(600);
  const s2=await p.evaluate(()=>{ const sb=document.getElementById('nnStageBar');
    return {left:sb.querySelector('.kn').style.left, on:sb.querySelector('button.on').textContent.trim(), st:nnStageGet()}; });
  ok(s2.st===''&&/施工後/.test(s2.on),'同じところをもう一度押すと「施工後」へ移る',s2);
  ok(parseFloat(s2.left)>parseFloat(s1.left),'つまみが右へ動く',{before:s1.left,after:s2.left});
  await p.evaluate(()=>document.querySelector('#nnStageBar button.on').click()); await p.waitForTimeout(600);
  const s3=await p.evaluate(()=>({st:nnStageGet(), left:document.getElementById('nnStageBar').querySelector('.kn').style.left}));
  ok(s3.st==='body'&&parseFloat(s3.left)<parseFloat(s2.left),'もう一度で左へ戻る（右・左と行き来できる）',s3);
  /* 改修なら3つ */
  await p.evaluate(()=>{ state.kubun='kaishu'; saveState(); nnStageBar(); }); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>document.getElementById('nnStageBar').querySelectorAll('button[data-st]').length)===3,'改修は3つ（下地・既存防水・施工後）');
  /* ④ 断面図モード */
  await p.evaluate(async()=>{ state.mode='sect'; saveState(); setTab('sec'); await new Promise(r=>setTimeout(r,300)); nnHdMode(); });
  await p.waitForTimeout(700);
  const sc=await p.evaluate(()=>({md:document.getElementById('hdMode').textContent.trim(), sw:document.getElementById('hdSwap').textContent.trim()}));
  ok(/断面図モード/.test(sc.md)&&/3D投影へ/.test(sc.sw),'断面図で始めると「断面図モード」',sc);
  await p.evaluate(()=>document.getElementById('hdSwap').click()); await p.waitForTimeout(1200);
  const sc2=await p.evaluate(()=>({sw:document.getElementById('hdSwap').textContent.trim(), tab}));
  ok(sc2.tab==='d3'&&/断面図作成へ/.test(sc2.sw),'断面図モードの3Dでは「断面図作成へ」',sc2);
  /* ⑤ 開き直してもモードが残る */
  await p.evaluate(()=>saveState()); await p.reload({waitUntil:'load'}); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(400);
  ok(/断面図モード|3D投影/.test(await p.evaluate(()=>document.getElementById('hdMode').textContent)),'開き直してもモードが残る');
  /* ⑥ 入口メニューでは出さない */
  await p.evaluate(()=>{try{nnZMenuOpen&&nnZMenuOpen();}catch(_){}}); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('hdMode')).display)==='none','入口メニューを開いている間は見出しを出さない');
  /* ⑦ ★2026-09-06m 見出し・切替・操作方法を大きく／会社名は出さない（本人の指示・§314） */
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(400);
  const big=await p.evaluate(()=>{
    const Z=window.nnPZ||1, g=id=>document.getElementById(id);
    const hh=e=>e?+(e.getBoundingClientRect().height/Z).toFixed(1):0;
    const md=g('hdMode'), mi=md&&md.querySelector('img');
    return {fs:parseFloat(getComputedStyle(md).fontSize),
      frame:hh(md), img:hh(mi),
      swap:hh(g('hdSwap')&&g('hdSwap').querySelector('img')),
      help:hh(g('hdHelp')&&g('hdHelp').querySelector('img.hi')),
      co:/株式会社/.test(document.querySelector('header').textContent),
      band:hh(document.querySelector('header'))};
  });
  ok(big.fs>=(PH?13:18),'⑦ 見出しの文字が大きい',big.fs);
  ok(big.img>big.frame,'⑦ 絵がフレームから少しはみ出す',{img:big.img,frame:big.frame});
  ok(big.swap>=(PH?22:30),'⑦ 切替ボタンの絵が大きい',big.swap);
  ok(big.help>=(PH?20:28),'⑦ 操作方法の絵が大きい',big.help);
  ok(big.co===false,'⑦ 帯に会社名を出さない（ホーム以外）');
  ok(big.band<=(PH?46:52),'⑦ 帯は厚くならない',big.band);
  ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
  await b.close();
  console.log(ng?('★NG '+ng+'件'):'すべて○');
})().catch(e=>{ console.error(e); process.exit(1); });
