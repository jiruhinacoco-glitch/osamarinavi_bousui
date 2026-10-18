/* ★§733 図面作成：最初のメニュー（平面図作成・矩計図作成）の上に「3点 引いています／下書き」の帯を出さない
   本人「（メニューの上に）『3点 引いています 筆をおく』が重なって、躯体下地の木下地・ALC・デッキが押せない」
   ① 3点引いている間は帯が出る ② メニューを開くと帯が消える（引いている時／下書きの時とも）
   ③ メニューを閉じると帯が戻る ④ メニューの上で躯体下地「木下地」が帯にふさがれていない（いちばん上にあるのがその札）・pageerror 0
   直す前の版では ②④ が★NG。  使い方: node _check/draft_menu.js [zumen_sekisan.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctx.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(_){} });
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
try{
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{localStorage.removeItem('nn_zumen_v1');}catch(_){}}); await p.reload(); await p.waitForTimeout(900);
await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){} state.polys=[]; state.active=-1; setTool('draw'); drawPts=[{x:2,y:2},{x:8,y:2},{x:8,y:6}]; draw(); }); await p.waitForTimeout(400);
const on=()=>p.evaluate(()=>{ const e=document.getElementById('nnDraftBar'); return {on:!!(e&&e.classList.contains('on')&&e.offsetHeight>0), t:e?e.textContent.replace(/\s+/g,' ').slice(0,30):''}; });
const r1=await on(); ok(r1.on&&/引いています/.test(r1.t),'① 3点引いている間は帯が出る',r1);
await p.evaluate(()=>nnZMenuOpen()); await p.waitForTimeout(500);
const r2=await on();
const r4=await p.evaluate(()=>{ const c=[...document.querySelectorAll('#nnZMenu .zmCard')][0]; const k=c&&[...c.querySelectorAll('*')].find(e=>e.children.length===0&&/木下地/.test(e.textContent)&&e.getBoundingClientRect().width>0);
  if(!k) return {found:false}; const r=k.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, top=document.elementFromPoint(x,y);
  return {found:true, bar:!!(top&&top.closest&&top.closest('#nnDraftBar'))}; });
await p.screenshot({path:'/tmp/draft_menu.png'});
await p.evaluate(()=>{ nnZMenuClose(); }); await p.waitForTimeout(300);
await p.evaluate(()=>{ nnDraftPut&&nnDraftPut(true); }); await p.waitForTimeout(300);
const r2b0=await on();
await p.evaluate(()=>nnZMenuOpen()); await p.waitForTimeout(400); const r2b=await on();
ok(!r2.on&&!r2b.on,'② メニューを開くと帯が消える（引いている時・下書きの時）',{r2,r2b0,r2b});
await p.evaluate(()=>nnZMenuClose()); await p.waitForTimeout(400); const r3=await on();
ok(r3.on&&/下書き/.test(r3.t),'③ メニューを閉じると帯が戻る（下書き 3点）',r3);
ok(r4.found&&!r4.bar&&errs.length===0,'④ メニューの「木下地」が帯にふさがれていない・pageerror 0',{r4,errs});
}catch(e){ ok(false,'例外 '+e.message); }
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0); })();
