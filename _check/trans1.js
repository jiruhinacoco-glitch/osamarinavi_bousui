/* ★2026-10-27i 画面切り替えの演出（nn_trans.js）の検証
   本人「よくあるスマホゲームみたいに、切り替わるまでを進行中のように見せる。必要なら『つうしん中』で安心させる」
   ①押した瞬間に幕が閉じ始める（0.1秒以内に .close）・閉じきる前には移動しない（0.2秒）
   ②次のページは幕が閉じた状態（shut）で始まる＝白い画面が見えない
   ③次のページが出来上がったら幕が開いて消える（最後に幕が残らない）
   ④読み込みが遅いとき（1.2秒）は右下に「通信中」が出る・画面の中に収まる
   ⑤全11ページに入っている（nnTransGo がある・幕なしで普通に開ける）
   使い方: node _check/trans1.js（http://localhost:8899 で配信しておくこと）
   スクショ: SHOT=出力.png で「閉じた幕＋つうしん中」の画面写しを書き出す */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):'')); if(!c)NG++;};
const U='http://localhost:8899/';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});   /* 待たせる設定（route）を効かせるため */
 /* 着いたページで、いちばん最初に幕がどうなっているかを記録する */
 await ctx.addInitScript(()=>{ document.addEventListener('DOMContentLoaded',()=>{ const c=document.getElementById('nnTrans'); window.__trFirst=c?c.className:'(なし)'; }); });
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'index.html'); await p.waitForTimeout(1500);
 /* ① */
 const s1=await p.evaluate(()=>new Promise(res=>{ const t0=performance.now(); navGo('kiroku','現場記録帳');
   requestAnimationFrame(()=>{ const c=document.getElementById('nnTrans'); res({cls:c&&c.className, ms:Math.round(performance.now()-t0), still:location.pathname}); }); }));
 ok('①押した瞬間に幕が閉じ始める（0.1秒以内）・まだ移動していない', s1.cls==='close'&&s1.ms<100&&/index/.test(s1.still), s1);
 await p.waitForURL(/kirokucho_demo/,{timeout:8000});
 /* ② */
 await p.waitForFunction(()=>window.__trFirst!==undefined,null,{timeout:8000});
 const first=await p.evaluate(()=>window.__trFirst);
 ok('②次のページは幕が閉じた状態で始まる（白い画面が見えない）', /shut/.test(first), first);
 /* ③ */
 await p.waitForFunction(()=>!document.getElementById('nnTrans'),null,{timeout:9000}).catch(()=>{});
 ok('③出来上がったら幕が開いて消える（幕が残らない）', await p.evaluate(()=>!document.getElementById('nnTrans')));
 /* ④ 遅い読み込み：次のページを1.2秒待たせる。移動の途中は外から中身を読めないので、ページ自身に0.75秒後の様子を書かせて、着いた先で読む */
 await ctx.route('**/hacchu.html*', async r=>{ await new Promise(z=>setTimeout(z,1200)); await r.continue(); });
 await p.evaluate(()=>{ navGo('hacchu','発注'); setTimeout(()=>{ const c=document.getElementById('nnTrans'), bd=c&&c.querySelector('.bd'); let o=null;
   if(bd){ const r=bd.getBoundingClientRect(), cw=document.documentElement.clientWidth, ch=document.documentElement.clientHeight;
     o={cls:c.className, op:getComputedStyle(bd).opacity, txt:bd.textContent, in:r.right<=cw+1&&r.bottom<=ch&&r.left>=0, still:location.pathname}; }
   sessionStorage.setItem('__tr4',JSON.stringify(o)); },750); });
 await p.waitForURL(/hacchu/,{timeout:8000}); await p.waitForFunction(()=>!document.getElementById('nnTrans'),null,{timeout:9000}).catch(()=>{});
 const s4=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('__tr4')||'null'));
 ok('④遅いときは右下に「通信中」が出る・画面に収まる（0.75秒・まだ前のページ）', s4&&/bdg/.test(s4.cls)&&+s4.op>0.9&&s4.txt==='通信中'&&s4.in&&/kirokucho/.test(s4.still), s4);
 ok('④遅くても着いたら幕が消える', await p.evaluate(()=>!document.getElementById('nnTrans')));
 /* ⑤ */
 const pages=['index','kirokucho_demo','genba_map_v36','hacchu','kokkosho','camera','library','zumen_sekisan','shiyo_toroku','yougo','zairyo_toroku'];
 const bad=[];
 for(const pg of pages){ const q=await ctx.newPage(); q.on('pageerror',e=>errs.push(pg+': '+e.message)); await q.goto(U+pg+'.html'); await q.waitForTimeout(500);
   const r=await q.evaluate(()=>({go:typeof nnTransGo, cur:!!document.getElementById('nnTrans')})); if(r.go!=='function'||r.cur) bad.push(pg+JSON.stringify(r)); await q.close(); }
 ok('⑤全11ページに入っている・普通に開いたときは幕が出ない', bad.length===0, bad);
 ok('JSエラーなし', errs.length===0, errs.slice(0,3));
 console.log(NG?('★NG '+NG+'件'):'全部○');
 await b.close();
})();
