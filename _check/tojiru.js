/* 図面・積算：大きい図面でも「始点をクリックすれば必ず閉じる」（2026-09-13p）
   ------------------------------------------------------------------
   打点は「角度5度きざみ・長さ10cmきざみ」に丸めるので、始点を狙っても
   丸めたあとの座標が始点から離れて閉じられないことがある（§2026-08-23q・本人の指摘）。
   そのため nnResolvePoint は「丸める前の狙い（生の座標）」でも始点判定する。
   ★この検査は**出来上がり**を見る（§384）。実際にマウスで4点打って、
     屋根が1つできたか・4点の形になったかを測る。
   使い方: node _check/tojiru.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:1400,height:900}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,110)));
  await p.addInitScript(()=>{try{localStorage.removeItem('nn_zumen_v1');}catch(e){}});
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p.waitForSelector('.zmGoB[data-go="zu"]',{timeout:20000});
  await p.click('.zmGoB[data-go="zu"]');
  await p.waitForFunction(()=>typeof nnResolvePoint==='function'&&typeof draw==='function');

  /* ① 受け口が「生の座標」を受け取れる形になっているか（引数を落としていないか） */
  const api=await p.evaluate(()=>({len:window.nnResolvePoint.length}));
  ok(api.len>=4, '打点の判定が「丸める前の狙い」も受け取れる（引数4つ）', api);

  /* ② 生の座標だけが始点に近いとき、閉じると判定されるか（数値で直接） */
  const r=await p.evaluate(()=>{
    state.polys=[]; state.active=-1; cellPx=34;
    drawPts=[{x:4,y:4},{x:14,y:4},{x:14,y:10}];
    const far=nnResolvePoint(4.6,4.6);                 /* 丸めた座標だけ＝遠い */
    const raw=nnResolvePoint(4.6,4.6, 4.02,4.02);      /* 生は始点のすぐそば */
    return {far:far.close, raw:raw.close, g:raw.g};
  });
  ok(r.raw===true, '生の座標が始点のそばなら「閉じる」と判定する', r);
  ok(r.g && r.g.x===4 && r.g.y===4, '閉じるときは始点ぴったりに合わせる', r.g);

  /* ③ 出来上がりで確かめる：実際にマウスで4点打って屋根ができるか（§384） */
  await p.evaluate(()=>{ state.polys=[]; state.active=-1; drawPts=[]; saveState();
    /* ★setTool('draw',1) は「同じ道具をもう一度押した＝やめる」になるので使わない
       （はじめから描画が選ばれているため）。 */
    cellPx=34; ox=80; oy=220; setTool('draw'); draw(); });
  /* 画面上の位置だけは product の座標変換を使う（測っているのは「出来上がりの形」なので可） */
  const at=async(gx,gy)=>p.evaluate(([x,y])=>{
    const cv=document.getElementById('cv'); const R=cv.getBoundingClientRect();
    return {x:R.left+gx2px(x), y:R.top+gy2px(y)};},[gx,gy]);
  for(const [gx,gy] of [[2,2],[18,2],[18,11]]){
    const q=await at(gx,gy); await p.mouse.move(q.x,q.y); await p.mouse.click(q.x,q.y);
    await p.waitForTimeout(80);
  }
  /* 最後は始点の「すぐ横」を狙う（丸めると始点から離れる位置） */
  const q0=await at(2,2);
  await p.mouse.move(q0.x+2,q0.y+2); await p.mouse.click(q0.x+2,q0.y+2);
  await p.waitForFunction(()=>state.polys.length>0||drawPts.length!==3,{timeout:4000}).catch(()=>{});
  const made=await p.evaluate(()=>{const pl=state.polys[0];
    return {n:state.polys.length, pts:pl?pl.pts.length:0,
      shape:pl?pl.pts.map(v=>v.x+','+v.y).join(' / '):null, left:drawPts.length};});
  ok(made.n===1, '3点を打って始点のすぐ横をクリックすると屋根が1つできる', made);
  ok(made.pts===3 && made.shape==='2,2 / 18,2 / 18,11',
     '打った3点がそのままの形になっている（始点は増えない）', made.shape);
  ok(made.left===0, 'かきかけ（打った点）が残っていない', made.left);
  ok(errs.length===0, 'JSエラーなし', errs);
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
  process.exit(0);
})();
