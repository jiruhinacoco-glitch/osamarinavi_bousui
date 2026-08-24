/* 一覧の「2段組み立て」の取りこぼし。
   一覧は「まず14件→残りは次のコマ」で組み立てるので、
   続きが足される前にもう一度組み立てが始まると、
   **古い続きが新しい一覧に足されて、条件に合わない物件まで並ぶ**。
   絞り込みを続けて押す／検索欄を速く打つ、で起きる。
   使い方： node _check/relist.js                                    */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;
const ok=(t,c,x)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1500,height:950}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));

await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
await p.waitForTimeout(1200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);

/* ① 絞り込みを続けて切り替える
   ★この取りこぼしは「続きが足される直前にもう一度組み立てが始まる」ときだけ起きる。
     速い機械では十数ミリ秒しかない窓なので、
     **次のコマ（requestAnimationFrame）をわざと足止めして**必ず再現させる。
     遅い端末（スマホ）では、足止めしなくてもふつうに起きる。 */
const r1=await p.evaluate(async()=>{
  const q=[]; const raf=window.requestAnimationFrame;
  window.requestAnimationFrame=function(f){ q.push(f); return 0; };   /* 足止め開始 */
  listFil['kizon'].add('不明'); buildChips(); render();   /* 100件（＝続きが86件ある） */
  await new Promise(r=>setTimeout(r,60));      /* 続き（setTimeout）は走り、次のコマ待ちで止まる */
  listFil['kizon'].clear(); listFil['kingaku'].add('100〜300万円'); buildChips(); render();  /* 11件（続きは無い） */
  await new Promise(r=>setTimeout(r,60));
  window.requestAnimationFrame=raf;
  q.forEach(fn=>{ try{ fn(performance.now()); }catch(_){} });   /* 足止めしていた続きを流す */
  await new Promise(r=>raf(()=>setTimeout(r,400)));
  const g=LIST_FIL.find(x=>x.key==='kingaku');
  const want=props.filter(z=>(g.val(z)||'—')==='100〜300万円').length;
  const got=document.querySelectorAll('#list .pcard').length;
  const kizon=[...document.querySelectorAll('#list .pcard')]
    .filter(c=>{ const pr=props.find(z=>z.id==c.dataset.pid); return pr && (g.val(pr)||'—')!=='100〜300万円'; }).length;
  listFil['kingaku'].clear(); buildChips(); render();
  return {want, got, 条件外:kizon};
});
ok('古い組み立ての続きが新しい一覧に足されない', r1.want===r1.got && r1.条件外===0, r1);

/* ② 検索欄を速く打つ */
await p.waitForTimeout(700);
const r2=await p.evaluate(async()=>{
  const s=document.getElementById('q')||document.querySelector('.search input')||document.querySelector('#toolbar input');
  if(!s) return {skip:1};
  for(const t of ['札','札幌','札幌市','旭','旭川']){
    s.value=t; s.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,70));
  }
  await new Promise(r=>setTimeout(r,1200));
  const got=document.querySelectorAll('#list .pcard').length;
  const want=document.querySelectorAll('#list .pcard').length;
  /* 画面の件数の札と実際に並んだ数が合っているか */
  const lc=(document.getElementById('nnLC')||{textContent:''}).textContent.replace(/\s/g,'');
  const m=lc.match(/表示(\d+)件/);
  s.value=''; s.dispatchEvent(new Event('input',{bubbles:true}));
  return {got, hyo:m?+m[1]:null};
});
if(r2.skip) ok('検索欄が見つからない（検査を直すこと）', false, r2);
else ok('検索欄を速く打っても「表示◯件」と並んだ数が合う', r2.hyo!==null && r2.hyo===r2.got, r2);

/* ③ 同じ物件が二重に並んでいない */
await p.waitForTimeout(900);
const r3=await p.evaluate(()=>{
  const ids=[...document.querySelectorAll('#list .pcard')].map(c=>c.dataset.pid);
  return {n:ids.length, uniq:new Set(ids).size};
});
ok('同じ物件が二重に並んでいない', r3.n===r3.uniq && r3.n>0, r3);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
await b.close();
console.log('★NG'+NG);
})();
