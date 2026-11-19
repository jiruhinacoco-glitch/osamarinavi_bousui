/* §1344 作り方の入口：作り方が未登録でも3Dに札が出て、仕様・材料へ飛び、登録して戻ると工程ごとに見られる（端から端まで・スマホ）。直す前の版は★NG。
   使い方: node _check/mkgo.js [zumen_sekisan.html] [shiyo_toroku.html]   （先に python3 -m http.server 8899） */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const ZF=process.argv[2]||'zumen_sekisan.html', SF=process.argv[3]||'shiyo_toroku.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({...devices['iPhone 14 Pro Max']});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.route('**/shiyo_toroku.html*', r=>{ const u=new URL(r.request().url()); if(SF!=='shiyo_toroku.html'){ u.pathname='/'+SF; return r.continue({url:u.toString()}); } r.continue(); });
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const vis=sel=>p.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return false; const r=e.getBoundingClientRect(); if(!r.width) return false; const x=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return !!x&&(x===e||e.contains(x)); },sel);
const open3d=async()=>{ await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
  await p.evaluate(()=>{ state.specCode='AS-T1'; state.scaleM=1; state.polys=[]; const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); state.active=0; recalc(); setTab('d3'); });
  await p.waitForTimeout(2500); };
await p.goto('http://localhost:8899/'+ZF,{waitUntil:'load'}); await p.evaluate(()=>{ localStorage.removeItem('nn_specs_v1'); sessionStorage.clear(); }); await p.reload({waitUntil:'load'}); await p.waitForTimeout(1600);
await open3d();
ck(await vis('#nnMkQty .go'),'① 作り方が未登録でも、3Dに「作り方を登録する」の札が見えて押せる');
await p.locator('#nnMkQty .go').click().catch(()=>{});
await p.waitForURL(/shiyo_toroku\.html\?spec=AS-T1/,{timeout:8000}).catch(()=>{}); await p.waitForTimeout(2500);
ck(/shiyo_toroku\.html\?spec=AS-T1/.test(p.url()),'② 押すと 仕様・材料（?spec=AS-T1）へ');
ck(await p.evaluate(()=>!document.body.classList.contains('nn-pick')&&/AS-T1/.test((document.querySelector('#detail')||{}).innerText||'')),'③ 入口を飛ばして AS-T1 の仕様が開いている');
const btn=p.locator('#detail button',{hasText:'マイ仕様に登録'}).first();
if(await btn.count()) { await btn.click(); await p.waitForTimeout(1200); }
ck(await vis('#detail .mkpanel h4')||await p.evaluate(()=>{ const e=document.querySelector('#detail .mkpanel'); if(!e) return false; const r=e.getBoundingClientRect(); return r.top<document.documentElement.clientHeight&&r.bottom>0; }),'④ マイ仕様に登録すると、作り方の欄まで送られる');
await p.evaluate(()=>nnMkFill()); await p.waitForTimeout(500);
const n=await p.evaluate(()=>{ const sp=curSpec(); return sp?sp.steps.filter(s=>s.mk&&s.mk.how).length:0; }); ck(n>=3,'⑤ 工程名から仮に入れる で作り方が入る（'+n+'工程）');
await p.goto('http://localhost:8899/'+ZF,{waitUntil:'load'}); await p.waitForTimeout(1600); await open3d();
ck(await vis('#nnMkQty .op:not(.go)'),'⑥ 図面・積算に戻ると「作り方（AS-T1）を工程ごとに見る」の札');
await p.locator('#nnMkQty .op').click(); await p.waitForTimeout(1500);
ck(await p.evaluate(()=>+state.d3mk===0&&!!document.querySelector('#nnMkQty table')),'⑦ 押すと工程ごとの表');
console.log('errors',errs.slice(0,4)); console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
