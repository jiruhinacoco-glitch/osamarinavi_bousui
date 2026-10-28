/* ★2026-10-29k 記録帳ダッシュボードの目次（.nn-dnav）の横スクロールバー（スマホ・自前の棒 .nn-dnav-sb）の検証
   本人「紫の太いフチはいらない。そこには横スクロールバーがあるはず。つけて」
   ①バーが目次の枠の中の下に出る・棒は左端 ②右端まで送ると棒も右端 ③溝を押すとその位置へ送る（通常表示の横向き・スマホ表示の縦向き）
   使い方: node _check/dnavsb.js（http://localhost:8899 で配信しておくこと）。直す前の版はバーが無いので落ちる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)NG++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [vm,vp] of [['ichiran',{width:852,height:393}],['mobile',{width:393,height:852}]]){
const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(v=>{try{localStorage.setItem('nn_view_mode',v)}catch(_){}},vm);
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
const st=()=>p.evaluate(()=>{const n=document.querySelector('#dashboard .nn-dnav'), t=document.querySelector('#dashboard .nn-dnav-sb'), i=t.firstChild, tr=t.getBoundingClientRect(), ir=i.getBoundingClientRect(), nr=n.getBoundingClientRect();
 return {sl:Math.round(n.scrollLeft), max:n.scrollWidth-n.clientWidth, thL:Math.round(ir.left-tr.left), thR:Math.round(tr.right-ir.right), thW:Math.round(ir.width), trW:Math.round(tr.width), inBox:tr.top>nr.top&&tr.bottom<=nr.bottom, vis:getComputedStyle(t).display!=='none'};});
let a=await st(); ok(vm+' ①バーが出る・目次の枠の中の下・棒は左端・長さ＝見えている割合', a.vis&&a.inBox&&a.thL===0&&a.thW<a.trW, a);
await p.evaluate(()=>{const n=document.querySelector('#dashboard .nn-dnav'); n.scrollLeft=n.scrollWidth;}); await p.waitForTimeout(200);
a=await st(); ok(vm+' ②右端まで送ると棒も右端', a.sl===a.max&&Math.abs(a.thR)<=1, a);
const tr=await p.evaluate(()=>{const r=document.querySelector('#dashboard .nn-dnav-sb').getBoundingClientRect(); return {x:r.left+3,y:r.top+r.height/2};});
await p.mouse.click(tr.x,tr.y); await p.waitForTimeout(200);
a=await st(); ok(vm+' ③溝の左端を押すと左端へ送る', a.sl===0&&a.thL===0, a);
ok(vm+' JSエラーなし', errs.length===0, errs.slice(0,2));
await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
