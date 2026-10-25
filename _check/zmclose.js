/* 図面：入口メニューの「▶ はじめる」でメニューが消えるか（2026-10-25i）
   本人のスクショ：はじめるを押したあと、メニュー（構造体・既存防水…）が残り、その上に道具ボタンが重なっていた。
   原因＝#nnZMenu[data-pick]{display:flex !important} が「開いているとき」の条件なしだった。
   ①はじめる→メニューが見えない（display:none）②道具の位置を押すと道具ボタンが当たる ③メニューを開き直すとまた見える ④JSエラーなし
   使い方: node _check/zmclose.js [ファイル名.html]（直す前の版では①が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof nnZMenuOpen==='function'&&document.querySelector('#nnZMenu .zmCard[data-card="zu"]'));
  await p.waitForTimeout(800);
  /* 平面図作成の看板を押す（設定の画面へ） */
  await p.evaluate(()=>{ const c=document.querySelector('#nnZMenu .zmPk[data-pick="zu"], #nnZMenu [data-pk="zu"], #nnZMenu .zmPk'); if(c) c.click(); });
  await p.waitForSelector('.zmGoB[data-go="zu"]',{state:'visible',timeout:5000}).catch(()=>{});
  await p.tap('.zmGoB[data-go="zu"]');
  await p.waitForFunction(()=>!document.body.classList.contains('nn-zmenu'),null,{timeout:3000}).catch(()=>{});
  await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{ const m=document.getElementById('nnZMenu'), d=getComputedStyle(m).display;
    const t=document.getElementById('tl_draw').getBoundingClientRect(), hit=document.elementFromPoint(t.left+t.width/2,t.top+t.height/2);
    return {menu:d, hit:hit?(hit.closest('[id]')||{}).id:null, inMenu:!!(hit&&hit.closest('#nnZMenu'))}; });
  ok(r.menu==='none','①「▶ はじめる」でメニューが消える',r.menu);
  ok(!r.inMenu,'②道具ボタンの位置を押すと、メニューではなく道具ボタンに当たる',r.hit);
  await p.screenshot({path:process.env.SHOT||'/tmp/zmclose.png'});
  await p.evaluate(()=>nnZMenuOpen()); await p.waitForTimeout(300);
  const d2=await p.evaluate(()=>getComputedStyle(document.getElementById('nnZMenu')).display);
  ok(d2!=='none','③メニューを開き直すとまた見える',d2);
  ok(!errs.length,'④JSエラーなし',errs.slice(0,2));
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');
})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
