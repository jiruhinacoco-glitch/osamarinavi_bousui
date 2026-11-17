/* 現場記録帳（スマホ縦）：一覧を下へスクロールしている途中で一覧が作り直されても（工法の絵が届いたときの描き直し等）、
   見ていた現場の位置が保たれるか（§1302）。直す前の版では 25件目を見ていたのに 6件目まで戻された（6000→1701px）。
   使い方: node _check/listkeep.js [ファイル名.html]   前提: python3 -m http.server 8899 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2500);
 await p.evaluate(()=>showView('list')); await p.waitForTimeout(3000);
 for(const Y of [3000,6000,12000]){
  const r=await p.evaluate(async(Y)=>{ const L=document.getElementById('list'); L.scrollTop=Y; await new Promise(r=>setTimeout(r,400));
   /* 検算はページの関数を使わず自分で：一番上に見えているカードの番号と、上端からの位置 */
   const top=()=>{ const lt=L.getBoundingClientRect().top; const c=[...L.querySelectorAll('.pcard[data-pid]')].find(c=>c.getBoundingClientRect().bottom>lt+2);
     return c?{id:c.dataset.pid,y:Math.round(c.getBoundingClientRect().top-lt)}:null; };
   const a=top(); render(); const seen=[]; const t0=performance.now();
   while(performance.now()-t0<1500){ await new Promise(r=>requestAnimationFrame(r)); seen.push(top()); }
   const z=top(); const moved=seen.filter(s=>!s||s.id!==a.id||Math.abs(s.y-a.y)>4).length;
   return {before:a, after:z, frames:seen.length, moved}; },Y);
  ok(r.after&&r.after.id===r.before.id&&Math.abs(r.after.y-r.before.y)<=4,'【'+Y+'px】作り直しのあとも同じ現場が同じ位置',{前:r.before,後:r.after});
  ok(r.moved<=2,'【'+Y+'px】作り直しの間も ほとんど動かない（ずれたコマ2つまで）',{ずれたコマ:r.moved,全コマ:r.frames});
 }
 /* いちばん上にいるときは今までどおり（14件→残り）で、位置は0のまま */
 const t=await p.evaluate(async()=>{ const L=document.getElementById('list'); L.scrollTop=0; await new Promise(r=>setTimeout(r,300)); render();
   await new Promise(r=>setTimeout(r,1200)); return {st:L.scrollTop,n:L.querySelectorAll('.pcard').length}; });
 ok(t.st===0&&t.n===100,'いちばん上なら位置0のまま・100件そろう',t);
 ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
 console.log(ng?'★NG '+ng+'件':'全部○'); await b.close(); process.exit(ng?1:0);
})();
