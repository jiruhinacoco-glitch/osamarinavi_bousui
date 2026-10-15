/* ★2026-10-13zm 写真台帳（スマホ縦）：たたむ・タグの枠・選んだタグ・右にもある印（本人の付箋・§678）
   ① たたむと中身（現場名の欄・記録帳から引用・黒板設定）は隠れる・要約の文字と何も重ならない
   ② 「まとめて付ける」の枠は「現場登録」の枠の中（工種・撮影日の下・黒板設定の上）・たたんでも見えている
   ③ タグを押すとオレンジ（その1つだけ）・入力欄にその言葉／別のタグで移る／入力欄に打った言葉と同じタグも光る／もう一度押すと外れる
   ④ 右にもタグがあるとき右端に ▶（押せる＝いちばん上にある）・押すと右へ動く・端まで行くと ▶ は消える
   ⑤ 最初に出たとき、タグの列が一度だけ少し右へ動いて戻る
   ⑥ pageerror 0
   直す前の版では ①〜⑤ が★NG。  使い方: node _check/daicho_tag.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const SITE='タグ試験の現場 大規模修繕（屋上・バルコニー防水）';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){}
    window._pk=0; document.addEventListener('scroll',e=>{ const t=e.target; if(t&&t.id==='dbParts'&&t.scrollLeft>window._pk) window._pk=t.scrollLeft; },true); });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  const clean=()=>p.evaluate(async(S)=>{ const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===S)); },SITE);
  await clean();
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(500);
  await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(300);
  const c=await p.evaluate(()=>{ const cv=document.createElement('canvas'); cv.width=800; cv.height=600; const g=cv.getContext('2d'); g.fillStyle='#3060c0'; g.fillRect(0,0,800,600); return cv.toDataURL('image/png'); });
  await p.setInputFiles('#dbPickIn',[1,2].map(i=>({name:'t'+i+'.png',mimeType:'image/png',buffer:Buffer.from(c.split(',')[1],'base64')})));
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===2,null,{timeout:15000}); }catch(e){}
  await p.waitForTimeout(2600);
  /* ⑤ */
  const pk=await p.evaluate(()=>({max:window._pk, now:document.getElementById('dbParts').scrollLeft}));
  ok('⑤ 最初に出たとき、タグの列が一度だけ少し右へ動いて戻る', pk.max>=30&&pk.now<=1, pk);
  /* ① ② たたんだ状態（写真を入れると自動でたたむ） */
  await p.evaluate(()=>{ const s=document.getElementById('dbSide'); if(!s.classList.contains('closed')) document.getElementById('dbFold').click(); }); await p.waitForTimeout(300);
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;
  const t1=await p.evaluate(()=>{ const q=s=>document.querySelector(s), v=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0&&e.getBoundingClientRect().width>0;
    const fs=q('#dbFold .fs').getBoundingClientRect(); const hit=[...document.querySelectorAll('#dbSide button,#dbSide input,#dbSide select')].filter(v).filter(e=>{ if(e.id==='dbFold') return false; const r=e.getBoundingClientRect(); return Math.min(r.right,fs.right)-Math.max(r.left,fs.left)>1&&Math.min(r.bottom,fs.bottom)-Math.max(r.top,fs.top)>1; }).map(e=>e.id||e.className);
    const b=q('#dbBatch'), side=q('#dbSide'), sr=side.getBoundingClientRect(), br=b.getBoundingClientRect();
    return {closed:side.classList.contains('closed'), site:v(q('#dbSite')), bk:v(q('#dbFromBk')), bh:v(q('#dbSideIn > .bh'))||v(q('#dbBoardOn')), hit, inSide:side.contains(b), batchVis:v(b), within:br.top>=sr.top&&br.bottom<=sr.bottom+1}; });
  ok('① たたむと中身（現場名の欄・引用・黒板設定）は隠れる・要約と何も重ならない', t1.closed&&!t1.site&&!t1.bk&&!t1.bh&&t1.hit.length===0, t1);
  await p.click('#dbFold .fv'); await p.waitForTimeout(300);   /* ★§693 見出しの行の真ん中には保存ボタンがあるので ▼ を押す */
  const t2=await p.evaluate(()=>{ const q=s=>document.querySelector(s), R=e=>e.getBoundingClientRect(); return {open:!q('#dbSide').classList.contains('closed'), inSide:q('#dbSide').contains(q('#dbBatch')), b:Math.round(R(q('#dbBatch')).top), date:Math.round(R(q('#dbDate')).bottom), bh:Math.round(R(q('.bh.bhk')).top)}; });   /* ★§693 黒板設定は別の枠 */
  ok('② まとめて付ける枠は現場登録の枠の中（工種・撮影日の下・黒板設定の上）・たたんでも見えている', t1.inSide&&t1.batchVis&&t1.within&&t2.open&&t2.inSide&&t2.b>=t2.date&&t2.b<t2.bh, {t1:{inSide:t1.inSide,vis:t1.batchVis,within:t1.within},t2});
  /* ③ */
  const st=()=>p.evaluate(()=>{ const on=[...document.querySelectorAll('#dbParts button.on')]; const b=on[0]; let col=null; if(b){ const cv=document.createElement('canvas'); col=getComputedStyle(b).backgroundImage+'|'+getComputedStyle(b).borderTopColor; } return {on:on.map(e=>e.textContent), v:document.getElementById('dbBPart').value, col}; });
  await p.locator('#dbParts button',{hasText:'屋上'}).click(); await p.waitForTimeout(150); const s1=await st();
  await p.locator('#dbParts button',{hasText:'廊下'}).click(); await p.waitForTimeout(150); const s2=await st();
  await p.fill('#dbBPart','階段'); await p.waitForTimeout(150); const s3=await st();
  await p.locator('#dbParts button',{hasText:'階段'}).click(); await p.waitForTimeout(150); const s4=await st();
  const orange=s=>!!s.col&&/255, 157, 30/.test(s.col)&&/224, 120, 0/.test(s.col)&&/rgb\(179, 95, 0\)/.test(s.col);
  ok('③ 押したタグはオレンジ（1つだけ）・入力欄に入る／移る／打った言葉と同じタグも光る／もう一度で外れる', s1.on.join()==='屋上'&&s1.v==='屋上'&&orange(s1)&&s2.on.join()==='廊下'&&s2.v==='廊下'&&s3.on.join()==='階段'&&s4.on.length===0&&s4.v==='', {s1,s2,s3,s4});
  /* ④ */
  const n0=await p.evaluate(()=>{ const e=document.getElementById('dbParts'), x=e.querySelector('.nx'); if(!x) return {nx:false}; const r=x.getBoundingClientRect(), er=e.getBoundingClientRect(); const top=document.elementFromPoint(r.left+r.width-8,r.top+r.height/2);
    return {nx:true, vis:getComputedStyle(x).display!=='none'&&getComputedStyle(x).opacity>0.5, atRight:Math.abs(r.right-er.right)<=2, top:!!top&&!!top.closest('.nx'), sl:e.scrollLeft, over:e.scrollWidth>e.clientWidth}; });
  if(n0.nx) await p.click('#dbParts .nx'); await p.waitForTimeout(700);
  const n1=await p.evaluate(()=>document.getElementById('dbParts').scrollLeft);
  await p.evaluate(()=>{ const e=document.getElementById('dbParts'); e.scrollLeft=e.scrollWidth; }); await p.waitForTimeout(300);
  const n2=await p.evaluate(()=>{ const x=document.querySelector('#dbParts .nx'); return {op:x?+getComputedStyle(x).opacity:1, pe:x?getComputedStyle(x).pointerEvents:''}; });
  ok('④ 右にもタグがあるとき右端に ▶（いちばん上で押せる）・押すと右へ・端まで行くと消える', n0.nx&&n0.over&&n0.vis&&n0.atRight&&n0.top&&n1>n0.sl+40&&n2.op===0&&n2.pe==='none', {n0,n1,n2});
  await clean();
  ok('⑥ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
