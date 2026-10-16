/* ★§706 写真台帳（PC）：左の欄と右の境界線をドラッグして左の欄の幅を自由に変える（本人「境界線にマウスを持ってきたら←→が出て左右に動かせるように」）
   画面 2000×1040（1.5倍）と 1440×900 で：
   ① 境界線にマウスを乗せると ←→（col-resize）のしるし
   ② 右へ 200px ドラッグ → 左の欄が画面上で 200px（±3）広がる（表示倍率でずれない・§61）
   ③ 開き直しても幅を覚えている
   ④ 左へ大きくドラッグしても 320px より細くならない・右へ大きくドラッグしても右の欄が 420px 残る
   ⑤ ダブルクリックで元の幅に戻る
   ⑥ スマホでは境界線を出さない
   ⑦ pageerror 0
   直す前の版では ①〜⑤ が★NG。  使い方: node _check/daicho_haba.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [W,H] of [[2000,1040],[1440,900]]){ const nm=W+'×'+H+'：';
  const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:W===2000?1.5:1}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>{ try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} }); await p.reload(); await p.waitForTimeout(1000);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(500); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(500); };
  await open();
  const sw=()=>p.evaluate(()=>{ const s=document.querySelector('#dbSide'), m=document.querySelector('#dbv .dbMain'); return {side:Math.round(s.getBoundingClientRect().width), main:Math.round(m.getBoundingClientRect().width), z:s.getBoundingClientRect().width/s.offsetWidth, off:s.offsetWidth}; });
  const sp=await p.evaluate(()=>{ const e=document.getElementById('dbSplit'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, w:r.width, cur:getComputedStyle(e).cursor}; });
  ok(nm+'① 境界線に ←→ のしるし', !!sp&&sp.w>=6&&sp.cur==='col-resize', sp);
  if(!sp){ await ctx.close(); continue; }
  const drag=async(dx)=>{ await p.mouse.move(sp.x,sp.y); await p.mouse.down(); await p.mouse.move(sp.x+dx/2,sp.y,{steps:4}); await p.mouse.move(sp.x+dx,sp.y,{steps:4}); await p.mouse.up(); await p.waitForTimeout(300); };
  const w0=await sw(); await drag(200); const w1=await sw();
  ok(nm+'② 右へ200pxドラッグ → 左の欄が200px広がる', Math.abs((w1.side-w0.side)-200)<=3, {w0,w1});
  await p.reload(); await p.waitForTimeout(1000); await open(); const w2=await sw();
  ok(nm+'③ 開き直しても幅を覚えている', Math.abs(w2.side-w1.side)<=2, {w1,w2});
  const sp2=await p.evaluate(()=>{ const r=document.getElementById('dbSplit').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }); sp.x=sp2.x; sp.y=sp2.y;
  await drag(-3000); const w3=await sw(); const sp3=await p.evaluate(()=>{ const r=document.getElementById('dbSplit').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }); sp.x=sp3.x;
  await drag(3000); const w4=await sw();
  ok(nm+'④ 細くても320px・広くても右に420px残る', Math.abs(w3.off-320)<=1&&w4.main/w4.z>=420-30, {w3,w4});
  await p.mouse.dblclick(sp.x+(await p.evaluate(()=>document.getElementById('dbSplit').getBoundingClientRect().left))-sp.x+6, sp.y); await p.waitForTimeout(300); const w5=await sw();
  ok(nm+'⑤ ダブルクリックで元の幅', Math.abs(w5.side-w0.side)<=2, {w0,w5});
  ok(nm+'⑦ pageerror 0', errs.length===0, errs); await ctx.close(); }
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage();
  await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(900); await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(500); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(500);
  const ph=await p.evaluate(()=>{ const e=document.getElementById('dbSplit'); return !!e&&e.getBoundingClientRect().width>0; });
  ok('⑥ スマホでは境界線を出さない', !ph, ph);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
