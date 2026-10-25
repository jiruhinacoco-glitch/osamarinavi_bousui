/* 現場記録帳「現場一覧→表一覧」：表の上の「表示項目」「並び・幅を戻す」ボタンと説明文を出さない（2026-10-25j・本人「スペースがもったいない」）
   ①2つのボタンが見えない ②「見出しをドラッグ…」の説明が見えない ③「左へ／右へ」は残る ④帯の高さ40px以下 ⑤JSエラーなし
   使い方: node _check/rectools.js [ファイル名.html]（直す前の版では①②④が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{const b=await chromium.launch();
for(const [lbl,vp,ph] of [['スマホ',{width:393,height:852},1],['PC',{width:1440,height:900},0]]){
  const p=await b.newPage({viewport:vp,deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph}); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  if(ph) await p.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const t=[...document.querySelectorAll('button,div,a')].find(e=>e.textContent.trim()==='現場一覧'&&e.offsetParent); t&&t.click(); }); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const t=[...document.querySelectorAll('button')].find(e=>/表一覧/.test(e.textContent)&&e.offsetParent); t&&t.click(); });
  await p.waitForSelector('#recordTable',{timeout:5000}).catch(()=>{});
  const r=await p.evaluate(()=>{ const vis=id=>{const e=document.getElementById(id); return !!(e&&e.offsetParent);}; const tl=document.querySelector('#list .record-tools');
    return {btn:vis('recordFieldsToggle')||vis('recordOrderReset'), help:tl?/見出しをドラッグ/.test(tl.innerText):null,
      lr:!!(tl&&[...tl.querySelectorAll('.nnrt-lr button')].filter(e=>e.offsetParent).length===2), h:tl?Math.round(tl.getBoundingClientRect().height):null}; });
  ok(r.btn===false,lbl+' ①「表示項目」「並び・幅を戻す」が見えない',r.btn);
  ok(r.help===false,lbl+' ②「見出しをドラッグ…」の説明が見えない',r.help);
  ok(r.lr,lbl+' ③「左へ／右へ」は残る',r.lr);
  ok(r.h!=null&&r.h<=40,lbl+' ④表の上の帯は40px以下',r.h);
  ok(!errs.length,lbl+' ⑤JSエラーなし',errs.slice(0,2));
  await p.close(); }
await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
