/* ★2026-10-11a 仕様・材料：一覧と詳細の境目（#resizer）をつかんで横幅を変える（本人の動画・§628）
   ①つかんで動かすと、境目がマウスの位置にぴったりついてくる（ふつうの画面・表示倍率1.6の大きい画面）
   ②離したあとは、マウスを動かしても境目は動かない
   ③ボタンを離した合図が届かなかったとき（画面の外で離した等）も、ボタンを押していない動きで境目は動かない
   使い方: node _check/specsplit.js [shiyo_toroku.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'shiyo_toroku.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
 for(const vp of [[1440,900],[2536,1312]]){
  const p=await b.newPage({viewport:{width:vp[0],height:vp[1]}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
  const T=vp.join('x')+' ';
  const at=()=>p.evaluate(()=>Math.round(document.getElementById('resizer').getBoundingClientRect().left+document.getElementById('resizer').getBoundingClientRect().width/2));
  const r=await p.evaluate(()=>{ const b=document.getElementById('resizer').getBoundingClientRect(); return [b.left+b.width/2,b.top+b.height/2]; });
  await p.mouse.move(r[0],r[1]); await p.mouse.down();
  const dev=[]; for(const x of [r[0]-120,r[0]+150,r[0]+60]){ await p.mouse.move(x,r[1],{steps:5}); dev.push(Math.abs((await at())-Math.round(x))); }
  await p.mouse.up();
  ok(T+'①つかんで動かすと境目がマウスにぴったりついてくる（ずれ5px以内）', dev.every(d=>d<=5), dev);
  const a0=await at(); await p.mouse.move(r[0]-200,r[1]+40,{steps:5}); const a1=await at();
  ok(T+'②離したあとはマウスを動かしても境目は動かない', a0===a1, [a0,a1]);
  /* ③ 離した合図が届かない：押す → 動かす → （mouseup なしで）ボタンを押していない動き */
  const r2=await p.evaluate(()=>{ const b=document.getElementById('resizer').getBoundingClientRect(); return [b.left+b.width/2,b.top+b.height/2]; });
  await p.mouse.move(r2[0],r2[1]); await p.mouse.down(); await p.mouse.move(r2[0]+40,r2[1],{steps:3});
  const c0=await at();
  await p.evaluate(([x,y])=>{ const o={bubbles:true,clientX:x,clientY:y,buttons:0,pointerType:'mouse',pointerId:1};
    document.getElementById('resizer').dispatchEvent(new PointerEvent('pointermove',o)); window.dispatchEvent(new MouseEvent('mousemove',o)); },[r2[0]-250,r2[1]]);
  const c1=await at(); await p.mouse.up();
  ok(T+'③離した合図が届かなくても、ボタンを押していない動きで境目は動かない', c0===c1, [c0,c1]);
  ok(T+'JSエラーなし', !errs.length, errs.slice(0,2));
  await p.close(); }
 }catch(e){ ok('実行エラー '+e.message.slice(0,150), false); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
