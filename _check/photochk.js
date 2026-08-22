/* 写真取り込みモード：射影変換の正しさと、図面への取り込みまで */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));

  ok('ボタンがある', await p.evaluate(()=>!!document.getElementById('tl_photo')));
  await p.evaluate(()=>nnPhotoOpen()); await p.waitForTimeout(400);
  ok('画面が開く', await p.evaluate(()=>document.getElementById('nnPhoto').classList.contains('on')));
  // 写真の代わりにダミー画像
  await p.evaluate(()=>nnPhotoTestLoad(1200,800)); await p.waitForTimeout(500);
  ok('写真が入る', await p.evaluate(()=>nnPhotoState().hasImg));

  // ★斜めから撮った台形を四隅に指定（手前が広く、奥が狭い＝よくある構図）
  await p.evaluate(()=>{ nnPhotoTestTap(400,250); nnPhotoTestTap(800,250); nnPhotoTestTap(1000,650); nnPhotoTestTap(200,650); });
  await p.waitForTimeout(300);
  ok('四隅が4点', await p.evaluate(()=>nnPhotoState().corners===4));
  ok('実寸を設定できる（12m×9m）', await p.evaluate(()=>nnPhotoTestSize(12,9)));

  // 変換の正しさ：四隅が (0,0)(12,0)(12,9)(0,9) に戻るか
  const chk = await p.evaluate(()=>{
    const H=nnPhotoH();
    const ap=(M,p)=>{const d=M[6]*p.x+M[7]*p.y+M[8];return{x:(M[0]*p.x+M[1]*p.y+M[2])/d,y:(M[3]*p.x+M[4]*p.y+M[5])/d};};
    const c=[[400,250],[800,250],[1000,650],[200,650]].map(([x,y])=>ap(H,{x,y}));
    const want=[[0,0],[12,0],[12,9],[0,9]];
    const err=c.map((q,i)=>Math.hypot(q.x-want[i][0], q.y-want[i][1]));
    // 台形の中点＝長方形の中点になるか（射影変換が効いている証拠）
    const mid=ap(H,{x:(400+800+1000+200)/4, y:(250+250+650+650)/4});
    return { maxErr:+Math.max(...err).toFixed(6), mid:[+mid.x.toFixed(2),+mid.y.toFixed(2)] };
  });
  ok('四隅がぴたり長方形に戻る', chk.maxErr<1e-6, '最大誤差 '+chk.maxErr+'m');
  ok('台形の重心は長方形の中心と一致しない（＝遠近が効いている）',
     Math.abs(chk.mid[0]-6)<0.001 && chk.mid[1]!==4.5, '重心→'+JSON.stringify(chk.mid));

  // 輪郭をなぞる（四隅と同じ四角形＝12m×9m になるはず）
  await p.evaluate(()=>{ nnPhotoTestTap(400,250); nnPhotoTestTap(800,250); nnPhotoTestTap(1000,650); nnPhotoTestTap(200,650); nnPhotoTestTap(400,250); });
  await p.waitForTimeout(300);
  const st = await p.evaluate(()=>nnPhotoState());
  ok('なぞって閉じられる', st.closed && st.trace===4, JSON.stringify(st));

  // 図面に取り込む
  const before = await p.evaluate(()=>state.polys.length);
  await p.evaluate(()=>nnPhotoTestDone()); await p.waitForTimeout(700);
  const after = await p.evaluate(()=>({
    n:state.polys.length,
    closed:!document.getElementById('nnPhoto').classList.contains('on'),
    area:+polyAreaM(state.polys[state.polys.length-1].pts, state.scaleM).toFixed(1),
    name:state.polys[state.polys.length-1].name,
    tab:document.getElementById('ht_zu').classList.contains('on')
  }));
  ok('部位が1つ増える', after.n===before+1, before+'→'+after.n);
  ok('面積が 12m×9m＝108㎡ になる', Math.abs(after.area-108)<1.5, after.area+'㎡');
  ok('取り込むと画面が閉じて図面タブへ', after.closed && after.tab);
  ok('名前が分かる', /写真から起こした/.test(after.name), after.name);
  // 3Dでも使える（ニセTHREEで build3D）
  const d3 = await p.evaluate(()=>{
    const noop=function(){};
    const obj=()=>({position:{set(x,y,z){this._p=[x,y,z];},y:0},rotation:{y:0}});
        eval(window.__STUB);   /* ニセTHREE＝scratchpad/stub3.js */
    dirty3d=true; build3D();
    const g=window.__g[window.__g.length-1];
    return g?g.children.length:0;
  });
  ok('3Dビューにも出る', d3>0, '部品 '+d3+'個');
  await p.evaluate(()=>nnPhotoOpen()); await p.waitForTimeout(400);
  await p.screenshot({path:'photo1.png'});
  console.log(R.join('\n'));
  console.log(errs.length?'JSエラー:\n'+errs.join('\n'):'JSエラーなし');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
