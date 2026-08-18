/* ★2026-08-08 「直前の点から真下・真横にまっすぐ引けない」の修正を確認する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1200);

  /* ---------- ① nnSnapPt そのものの確認 ---------- */
  const u=await p.evaluate(()=>{
    tool='draw';
    drawPts=[{x:0,y:0},{x:2.4,y:1}];          /* 直前の点は交差点の上にない */
    const r={};
    r.down   = nnSnapPt(2.42, 4.10);          /* ほぼ真下を狙う */
    r.down2  = nnSnapPt(2.30, 4.10);          /* すこしズレても真下 */
    r.grid   = nnSnapPt(2.05, 4.10);          /* 交差点のほうが近い → 交差点 */
    r.side   = nnSnapPt(5.10, 1.02);          /* ほぼ真横 */
    r.diag   = nnSnapPt(5.10, 4.10);          /* 斜めは自由なまま */
    r.up     = nnSnapPt(2.44, -2.10);         /* 真上 */
    drawPts=[];
    return r;
  });
  console.log(JSON.stringify(u));
  ok('真下：xが直前の点(2.4)にそろう', u.down.x===2.4 && u.down.y>1, JSON.stringify(u.down));
  ok('少しズレても真下になる',        u.down2.x===2.4 && u.down2.y>1, JSON.stringify(u.down2));
  ok('交差点寄りの狙いは5度きざみで斜めに', Math.abs(u.grid.x-2.4)>0.05,  JSON.stringify(u.grid));
  ok('真横：yが直前の点(1)にそろう',  u.side.y===1,  JSON.stringify(u.side));
  ok('斜めは今までどおり自由',        u.diag.x!==2.4 && u.diag.y!==1,  JSON.stringify(u.diag));
  ok('真上も同じように引ける',        u.up.x===2.4   && u.up.y<1,   JSON.stringify(u.up));

  /* ---------- ② 実際にクリックして打ってみる ---------- */
  const setup=await p.evaluate(()=>{
    tool='draw'; drawPts=[{x:0,y:0},{x:2.4,y:1}]; draw();
    const r=cv.getBoundingClientRect();
    const kx=r.width?(cv.width/devicePixelRatio)/r.width:1;
    const ky=r.height?(cv.height/devicePixelRatio)/r.height:1;
    /* 目標：直前の点(2.4,1) のほぼ真下 (2.46, 4.05) */
    const gx=2.46, gy=7.05;   /* ★2026-08-16a ツールバーが3段になった分、下を狙う */
    return {cx:r.left+(ox+gx*cellPx)/kx, cy:r.top+(oy+gy*cellPx)/ky, cell:cellPx};
  });
  await p.mouse.click(setup.cx, setup.cy);
  await p.waitForTimeout(250);
  const got=await p.evaluate(()=>drawPts.map(q=>({x:q.x,y:q.y})));
  console.log('打点後:',JSON.stringify(got));
  const last=got[got.length-1];
  ok('クリックでも完全な垂直線になる（x が 2.4 のまま）', got.length===3 && last.x===2.4, JSON.stringify(last));

  /* ---------- ③ 交差点だけで描く従来の動きが壊れていないか ---------- */
  await p.evaluate(()=>{ drawPts=[]; state.polys=[]; state.active=-1; draw(); });
  const gc=async(gx,gy)=>{const c=await p.evaluate(({gx,gy})=>{const r=cv.getBoundingClientRect();
    const kx=r.width?(cv.width/devicePixelRatio)/r.width:1, ky=r.height?(cv.height/devicePixelRatio)/r.height:1;
    return {x:r.left+(ox+gx*cellPx)/kx, y:r.top+(oy+gy*cellPx)/ky};},{gx,gy});
    await p.mouse.click(c.x,c.y); await p.waitForTimeout(140);};
  for(const [gx,gy] of [[7,6],[11,6],[11,9],[7,9],[7,6]]) await gc(gx,gy);
  await p.waitForTimeout(300);
  const t=await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
  ok('方眼だけで描く長方形は今までどおり', /作成しました/.test(t), t);
  /* ※長方形の厳密な確認は ang5.js（方眼の交差点をクリック）で行う */

  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
