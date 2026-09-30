/* ★2026-09-30p 仕様・材料：一覧と詳細の境目（#resizer）をドラッグしても、つかんだ瞬間に幅が飛ばない（§569）
   使い方: node _check/zresize.js [zairyo_toroku.html]
   ○/★NG（PC 1860×910・1400×900）：①つかんで1pxも動かさない＝幅が変わらない（±2px） ②右へ100px＝一覧が100px広がる（±3px）
          ③左へ100px＝もとに戻る（±3px） ④JSエラーなし */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'zairyo_toroku.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for(const vp of [{width:1860,height:910},{width:1400,height:900}]){
  const p=await (await b.newContext({viewport:vp})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
  const W=()=>p.evaluate(()=>Math.round(document.getElementById('list').getBoundingClientRect().width));
  const r=await p.evaluate(()=>{ const q=document.getElementById('resizer').getBoundingClientRect(); return {x:q.left+q.width/2, y:q.top+q.height/2}; });
  const L=vp.width+'×'+vp.height, w0=await W();
  await p.mouse.move(r.x,r.y); await p.mouse.down(); await p.mouse.move(r.x+1,r.y); await p.mouse.move(r.x,r.y);
  const w1=await W(); ok(L+' ①つかんだだけでは幅が変わらない', Math.abs(w1-w0)<=2, w0+'→'+w1);
  await p.mouse.move(r.x+100,r.y,{steps:5}); const w2=await W(); ok(L+' ②右へ100px＝100px広がる', Math.abs(w2-w0-100)<=3, w0+'→'+w2);
  await p.mouse.move(r.x,r.y,{steps:5}); const w3=await W(); await p.mouse.up();
  ok(L+' ③左へ戻す＝もとの幅', Math.abs(w3-w0)<=3, w0+'→'+w3);
  ok(L+' ④JSエラーなし', errs.length===0, errs.join(' / ').slice(0,200));
  await p.context().close();
 }
 await b.close(); console.log(R.join('\n'));
})();
