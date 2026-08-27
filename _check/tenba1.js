/* ★2026-08-27a 図面(2D)の天端の帯：角の納まり（留め継ぎ）の検証
   以前は辺の両端をWぶん伸ばしてつなげていたため、
   ・角の四角い部分が2つの帯で「二重に塗られて濃い」
   ・塗りと線が角の外にブロック状に飛び出す
   状態だった（本人の指摘「なぜ4隅の外側が飛び出している？」）。
   いまは外側の線どうしの交点で突き合わせる。画素を読んで確かめる。
   使い方: node _check/tenba1.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1200);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const mk=(freeLeft)=>({
    name:'屋根①', lv:0,
    pts:[{x:4,y:4},{x:14,y:4},{x:14,y:9},{x:4,y:9}],
    edges:[0,1,2,3].map(i=>((freeLeft&&i===3)?{h:0,w:0,k:'free'}:{h:300,w:500,k:'para'}))
  });
  /* ★帯は屋根の「内側」に描かれる（ringNormal は内向き）。
     キャンバスは透明地なので「その場所の不透明度(α)」で判定する。
     地の塗り＋帯1枚＝約150。角が二重塗りだと約175、飛び出し（図形の外のタブ）は約51。
     見本の点は 寸法の札・H札・部位名・頂点の丸に当たらない場所を選ぶ。 */
  const px=await p.evaluate((poly)=>{
    state.polys=[poly]; state.active=0; state.scaleM=0.5;
    cellPx=34; ox=100; oy=140;
    draw();
    const c2=cv.getContext('2d'), d=devicePixelRatio;
    const g=(gx,gy)=>{ const x=Math.round((ox+gx*cellPx)*d), y=Math.round((oy+gy*cellPx)*d);
      return c2.getImageData(x,y,1,1).data[3]; };   /* α */
    return { corner:g(4.5,4.5), mid:g(6.2,4.5), tabUp:g(4.5,3.5), tabLeft:g(3.5,4.5) };
  }, mk(false));
  ok('角の四角と辺の帯が同じ濃さ（二重塗りが無い）',
     px.mid>120 && Math.abs(px.corner-px.mid)<12, JSON.stringify(px));
  ok('図形の外へのタブ（飛び出し）が無い', px.tabUp<8 && px.tabLeft<8, JSON.stringify(px));

  const px2=await p.evaluate((poly)=>{
    state.polys=[poly]; draw();
    const c2=cv.getContext('2d'), d=devicePixelRatio;
    const g=(gx,gy)=>{ const x=Math.round((ox+gx*cellPx)*d), y=Math.round((oy+gy*cellPx)*d);
      return c2.getImageData(x,y,1,1).data[3]; };
    return { corner:g(4.5,4.5), mid:g(6.2,4.5), tabLeft:g(3.5,4.5) };
  }, mk(true));
  ok('隣の辺に帯が無いときは角で止まる（外にタブが出ない）',
     px2.tabLeft<8 && px2.mid>120 && Math.abs(px2.corner-px2.mid)<12, JSON.stringify(px2));
  await p.evaluate(()=>{ state.polys=[]; state.active=-1; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
