/* §1439 御見積書の2枚目「工事のご提案」（たたき台）。見本の図面（AS-T1・平場 1,275.0㎡＝数量根拠書の合計と同じ値）で出して確かめる。
   3枚（御見積書／工事のご提案／数量根拠書）・図と3Dの絵が入る・仕様 AS-T1 と工程4つ（国交省の仕様の工程数）・施工面積・書きこめる空欄。直す前の版は★NG。
   使い方: node _check/teian.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const ctx=await b.newContext({viewport:{width:1500,height:900}}); const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ localStorage.removeItem('nn_specs_v1'); const x=document.getElementById('tl_sample'); if(x)x.click(); }); await p.waitForTimeout(900);
await p.evaluate(()=>{ setTab('d3'); }); await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,null,{timeout:20000}).catch(()=>{}); await p.waitForTimeout(800);
await p.evaluate(()=>{ setTab('zu'); nnFitView(); nnMitsuOpen(); }); await p.waitForTimeout(500);
const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>document.getElementById('nm_go').click())]);
await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(800);
const r=await pop.evaluate(()=>{ const ps=[...document.querySelectorAll('.paper')], t=ps[1]||document.createElement('div'); const tb=[...t.querySelectorAll('table')];
  const stepT=tb.find(x=>/工程/.test(x.rows[0]?x.rows[0].textContent:''));
  return {n:ps.length, h:ps.map(x=>(x.querySelector('h1')||{}).textContent||''), imgs:[...t.querySelectorAll('img')].filter(i=>i.naturalWidth>50).length, txt:t.textContent, steps:stepT?stepT.rows.length-1:0, ed:t.querySelectorAll('[contenteditable]').length}; });
ck(r.n===3&&/御見積書/.test(r.h[0].replace(/\s/g,''))&&r.h[1]==='工事のご提案'&&r.h[2]==='数量根拠書','3枚：御見積書／工事のご提案／数量根拠書（'+r.h.join('｜')+'）');
ck(r.imgs===2,'屋上の図と完成イメージ（3D）の絵が2枚入っている（'+r.imgs+'）');
ck(/AS-T1/.test(r.txt)&&r.steps===4,'ご提案の仕様 AS-T1 と、施工の手順4工程（'+r.steps+'）');
ck(/平場 1275\.0 ㎡/.test(r.txt),'施工面積 平場 1275.0㎡（数量根拠書の合計と同じ）');
ck(r.ed>=5,'工期・保証などは書きこめる空欄（'+r.ed+'か所）');
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
