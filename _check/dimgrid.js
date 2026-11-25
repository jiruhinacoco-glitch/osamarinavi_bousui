/* §1433 ①寸法：別の窓と電卓をやめて、方眼紙の上でそのまま入れる。
   ・寸法の画面は方眼紙（#canvaswrap）とぴったり同じ場所・大きさで、画面からはみ出さない（「見切れている」の再発防止）
   ・電卓のボタンは見えない／数字の欄があり、キーボードで 12 Enter 8 Enter → 96㎡／「図面に置く」が見えていて、押すと屋根になる
   ・開いている間は道具の列を隠し、閉じると戻る。 PC 1500×900・PC 2000×1000（表示倍率あり）・スマホよこ。直す前の版は★NG。
   使い方: node _check/dimgrid.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
for(const c of [['PC 1500×900',{viewport:{width:1500,height:900}},0],['PC 2000×1000',{viewport:{width:2000,height:1000}},0],['スマホよこ',{viewport:{width:852,height:393},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'},1]]){
 const nm=c[0], p=await (await b.newContext(c[1])).newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
 await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
 await p.evaluate(()=>{ try{nnZMenuClose()}catch(_){} state.polys=[]; state.parts=[]; state.scaleM=1; setTab('zu'); draw(); nnDimInOpen(); }); await p.waitForTimeout(400);
 await p.evaluate(()=>document.querySelector('#nnDimIn [data-s="rect"]').click()); await p.waitForTimeout(200);
 const g=await p.evaluate(()=>{ const R=e=>{ const r=e.getBoundingClientRect(); return [r.left,r.top,r.right,r.bottom].map(Math.round); }, vis=e=>!!e&&e.getBoundingClientRect().height>0&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
   return {d:R(document.getElementById('nnDimIn')), c:R(document.getElementById('canvaswrap')), vw:document.documentElement.clientWidth, vh:document.documentElement.clientHeight,
     keys:vis(document.querySelector('#nnDimIn .dkeys')), inp:vis(document.getElementById('nnDimInp')), go:R(document.getElementById('nnDimGo')), tb:vis(document.getElementById('toolbar')), z:window.nnPZ||1}; });
 ck(g.d.every((v,i)=>Math.abs(v-g.c[i])<=2),nm+'：寸法の画面は方眼紙とぴったり同じ場所・大きさ（'+g.d+'／方眼紙 '+g.c+'・倍率 '+g.z+'）');
 ck(g.d[0]>=-1&&g.d[1]>=-1&&g.d[2]<=g.vw+1&&g.d[3]<=g.vh+1&&g.go[3]<=g.vh&&g.go[1]>=0&&g.go[2]<=g.vw,nm+'：画面からはみ出していない・「図面に置く」も画面の中（画面 '+g.vw+'×'+g.vh+'・置く '+g.go+'）');
 ck(!g.keys&&g.inp&&!g.tb,nm+'：電卓のボタンは出ない・数字の欄がある・道具の列は隠れている');
 if(!c[2]){ await p.keyboard.type('12'); await p.keyboard.press('Enter'); await p.keyboard.type('8'); await p.keyboard.press('Enter'); }
 else { for(const v of ['12','8']){ await p.evaluate(v=>{ const i=document.getElementById('nnDimInp'); i.value=v; i.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#nnDimIn .dnext').click(); },v); await p.waitForTimeout(60); await p.evaluate(()=>{ try{ nnNumpadClose(); }catch(_){} }); } }
 await p.waitForTimeout(200);
 const a=await p.evaluate(()=>document.getElementById('nnDimArea').textContent);
 await p.evaluate(()=>document.getElementById('nnDimGo').click()); await p.waitForTimeout(500);
 /* 手計算：12×8＝96㎡ */
 const r=await p.evaluate(()=>{ const s=state.scaleM, Q=(state.polys[0]||{}).pts||[]; let ar=0; for(let i=0;i<Q.length;i++){ const t=Q[(i+1)%Q.length]; ar+=Q[i].x*t.y-t.x*Q[i].y; }
   const tb=document.getElementById('toolbar'); return {n:state.polys.length, area:Math.abs(ar/2)*s*s, open:document.getElementById('nnDimIn').classList.contains('on'), tb:getComputedStyle(tb).visibility!=='hidden'}; });
 ck(a==='96.00㎡'&&r.n===1&&Math.abs(r.area-96)<0.01,nm+'：'+(c[2]?'数字の欄':'キーボード')+'で 12・8 → 96㎡、「図面に置く」で屋根になる（'+a+' '+JSON.stringify(r)+'）');
 ck(!r.open&&r.tb,nm+'：置いたら閉じて、道具の列が戻る');
 console.log(nm,'errors',errs.slice(0,3)); if(errs.length) NG++; await p.context().close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
