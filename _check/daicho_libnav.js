/* ★§711 写真台帳の一覧（PC）：左のメニュー（ホーム・現場記録帳…）が見えたまま
   ① 一覧を開いても左のメニューが見えている（メニューの真ん中を指すと、メニューの部品が一番上）・一覧は左のメニューの右から（重ならない）
   ② 「新しい写真台帳を作る」で作る画面に入ると、これまでどおり画面いっぱい
   ③ スマホでは今までどおり（一覧は画面いっぱい）
   ④ pageerror 0
   直す前の版では ① が★NG。  使い方: node _check/daicho_libnav.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [W,H,sc] of [[2000,1040,1.5],[1440,900,1]]){ const nm=W+'×'+H+'：';
  const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:sc}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>localStorage.setItem('nn_daicho_pref_v1',JSON.stringify({books:{'一覧の現場':{t:Date.now(),c:Date.now()}}}))); await p.reload(); await p.waitForTimeout(1000);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(700);
  const g=await p.evaluate(()=>{ const nv=document.getElementById('nav').getBoundingClientRect(), dv=document.getElementById('dbv'), d=dv.getBoundingClientRect(), lib=dv.classList.contains('lib');
    const e=document.elementFromPoint(nv.left+nv.width/2, nv.top+nv.height*0.3); return {lib, navTop:!!e&&!!e.closest('#nav'), dl:Math.round(d.left), nr:Math.round(nv.right)}; });
  ok(nm+'① 一覧でも左のメニューが見える・一覧はメニューの右から', g.lib&&g.navTop&&Math.abs(g.dl-g.nr)<=2, g);
  await p.locator('#dbLibNew').click(); await p.waitForTimeout(600);
  const g2=await p.evaluate(()=>{ const dv=document.getElementById('dbv'), d=dv.getBoundingClientRect(); return {lib:dv.classList.contains('lib'), l:Math.round(d.left), w:Math.round(d.width), vw:document.documentElement.clientWidth}; });
  ok(nm+'② 作る画面はこれまでどおり画面いっぱい', !g2.lib&&g2.l===0, g2);
  ok(nm+'④ pageerror 0', errs.length===0, errs); await ctx.close(); }
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage();
  await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); });
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>localStorage.setItem('nn_daicho_pref_v1',JSON.stringify({books:{'一覧の現場':{t:Date.now(),c:Date.now()}}}))); await p.reload(); await p.waitForTimeout(1000);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(700);
  const g3=await p.evaluate(()=>{ const d=document.getElementById('dbv').getBoundingClientRect(); return {l:Math.round(d.left), w:Math.round(d.width)}; });
  ok('③ スマホは今までどおり一覧は画面いっぱい', g3.l===0&&g3.w>=390, g3);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
