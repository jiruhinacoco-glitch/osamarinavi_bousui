/* B4：編集画面の「この物件を削除」が「保存する」と同じ並び（.btns）に無く、保存ボタンから離れている。押すと確認が出て、やめれば消えない。
   使い方: node _check/delbtn.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const ph of [true,false]){
const ctx=await b.newContext(ph?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'}:{viewport:{width:1280,height:860},serviceWorkers:'block'});
await ctx.addInitScript(m=>{try{localStorage.setItem('nn_view_mode',m)}catch(_){}}, ph?'mobile':'ichiran');
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const T=ph?'スマホ ':'PC ';
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
await p.evaluate(()=>openModal(props[0].id)); await p.waitForTimeout(600);
const r=await p.evaluate(()=>{const d=document.getElementById('f_delBtn'); d.scrollIntoView({block:'center'});
  const s=[...document.querySelectorAll('#modalbg .btns button')].find(e=>e.textContent.trim()==='保存する'); const a=d.getBoundingClientRect(), c=s.getBoundingClientRect();
  const dx=Math.max(0,c.left-a.right,a.left-c.right), dy=Math.max(0,c.top-a.bottom,a.top-c.bottom);
  return {inBtns:!!d.closest('.btns'), vis:a.height>10, gap:Math.round(Math.hypot(dx,dy))};});
ok(T+'削除は保存ボタンの並びに無い', !r.inBtns&&r.vis, r);
ok(T+'削除と保存は40px以上離れている（直す前はとなり同士）', r.gap>=40, r);
let asked=null; p.once('dialog',d=>{asked=d.message(); d.dismiss();});
const n0=await p.evaluate(()=>props.length);
await p.evaluate(()=>document.getElementById('f_delBtn').click()); await p.waitForTimeout(400);
ok(T+'押すと確認が出て、やめれば消えない', /削除しますか/.test(asked||'')&&await p.evaluate(()=>props.length)===n0, asked);
ok(T+'JSエラーなし', errs.length===0, errs.slice(0,2)); await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
