/* B9：PCの入力画面は Esc で閉じる。編集で変えていたら確認が出て、やめれば閉じない。新規は下書きに残して閉じる。
   ほかの小窓が上にあるときは閉じない。PCの「＋新規作成」はオレンジ。使い方: node _check/escmodal.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1280,height:860},serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','ichiran')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
const open=()=>p.evaluate(()=>document.getElementById('modalbg').classList.contains('open'));
await p.evaluate(()=>openModal(props[0].id)); await p.waitForTimeout(500);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok('編集・変更なし：Escで閉じる', !(await open()));
await p.evaluate(()=>openModal(props[0].id)); await p.waitForTimeout(500);
await p.fill('#f_addr','検査で書きかえた住所'); await p.locator('#modalTitle').click();
let asked=null; p.once('dialog',d=>{asked=d.message(); d.dismiss();});
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok('編集・変更あり：確認が出て、やめれば閉じない', /保存せずに閉じ/.test(asked||'')&&await open(), asked);
p.once('dialog',d=>d.accept()); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok('確認でOKなら閉じ、変更は物件に入らない', !(await open())&&await p.evaluate(()=>props[0].addr)!=='検査で書きかえた住所');
await p.evaluate(()=>openModal()); await p.waitForTimeout(500);
await p.fill('#f_name','検査 Escの下書き'); await p.waitForTimeout(600);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok('新規：Escで閉じ、下書きに残る', !(await open())&&/検査 Escの下書き/.test(await p.evaluate(()=>localStorage.getItem('nn_kirokucho_draft_v1')||'')));
/* 上に別の小窓（確認）があるときは閉じない */
await p.evaluate(()=>openModal(props[0].id)); await p.waitForTimeout(500);
await p.evaluate(()=>{const d=document.createElement('div'); d.id='nnTestCover'; d.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.2)'; document.body.appendChild(d);});
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok('上に別の小窓があるときは閉じない', await open());
await p.evaluate(()=>{document.getElementById('nnTestCover').remove(); closeModal();});
const bg=await p.evaluate(()=>getComputedStyle(document.querySelector('header button.newbig')).backgroundImage);
ok('PCの「＋新規作成」はオレンジ', /255, 145, 36/.test(bg), bg.slice(0,60));
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
