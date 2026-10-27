/* ★2026-10-27k 画面切り替えの「進んでいる感じ」（nn_trans.js）の検証
   本人「開くまで遅すぎ。謎の横断幕で閉めなくて良い。進んでいる状況が人の感覚的にわかるように」
   ①押した瞬間に右下へ「通信中」＋％＋棒が出る・幕は無い・移動はすぐ始まる（待たせない＝0.06秒以内に次のページを取りに行く）
   ②遅い読み込みでも％が伸び続ける（0.3秒→0.75秒で増える・92％より先へは勝手に行かない）
   ③着いたページは隠れない（画面の真ん中を押すとページの部品に当たる）・前の続きの％から始まる
   ④読み込みが終わったら100％にして消える
   ⑤全11ページに入っている・普通に開いたときは出ない
   使い方: node _check/trans1.js（http://localhost:8899 で配信しておくこと）
   ★移動の途中は外から page.evaluate できない（Execution context was destroyed）ので、ページ自身に sessionStorage へ書かせて着いた先で読む */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,240):'')); if(!c)NG++;};
const U='http://localhost:8899/';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});   /* 待たせる設定（route）を効かせるため */
 /* 着いたページで、いちばん最初の帯の様子と、隠れていないかを記録する */
 await ctx.addInitScript(()=>{ addEventListener('load',()=>{ window.__ld=performance.now(); });
   document.addEventListener('DOMContentLoaded',()=>{ const c=document.getElementById('nnTrans');
   new MutationObserver(()=>{ if(window.__trFirst&&window.__trFirst.has&&!document.getElementById('nnTrans')&&!window.__gone) window.__gone=performance.now(); }).observe(document.documentElement,{childList:true});
   const e=document.elementFromPoint(document.documentElement.clientWidth/2, document.documentElement.clientHeight/2);
   window.__trFirst={has:!!c, pct:c?parseInt(c.querySelector('em').textContent):null, hit:e?(e.closest('#nnTrans')?'帯':'ページ'):'なし'}; }); });
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'index.html'); await p.waitForTimeout(1500);
 /* ① ② 次のページ（記録帳）を1.2秒待たせて、押した直後・0.3秒・0.75秒の様子をページ自身に書かせる */
 let reqAt=0; p.on('request',r=>{ if(r.isNavigationRequest()&&/kirokucho/.test(r.url())) reqAt=Date.now(); });
 await ctx.route('**/kirokucho_demo.html*', async r=>{ await new Promise(z=>setTimeout(z,1200)); await r.continue(); });
 const tapAt=Date.now();
 await p.evaluate(()=>{ const rec=k=>{ const c=document.getElementById('nnTrans'); const o=c?{txt:c.querySelector('.rw').textContent.replace(/\d+%/,''), pct:parseInt(c.querySelector('em').textContent),
     bar:parseFloat(c.querySelector('.bar i').style.width), sh:!!document.querySelector('#nnTrans .sh'), op:getComputedStyle(c).opacity}:null; sessionStorage.setItem('__tr'+k,JSON.stringify(o)); };
   navGo('kiroku','現場記録帳'); rec(0); setTimeout(()=>rec(1),300); setTimeout(()=>rec(2),750); setTimeout(()=>rec(3),1100); });
 await p.waitForURL(/kirokucho_demo/,{timeout:8000});
 const R=await p.evaluate(()=>[0,1,2,3].map(k=>JSON.parse(sessionStorage.getItem('__tr'+k)||'null')));
 ok('①押した瞬間に「通信中」＋％＋棒が出る・幕は無い', R[0]&&R[0].txt==='通信中'&&R[0].pct===0&&!R[0].sh&&+R[0].op>0.9, R[0]);
 ok('①移動はすぐ始まる（待たせない）', reqAt>0&&reqAt-tapAt<250, {ms:reqAt-tapAt});
 ok('②遅い読み込みでも％が伸び続ける（0.3秒→0.75秒→1.1秒で増える・92％まで）', R[1]&&R[2]&&R[3]&&R[1].pct>0&&R[2].pct>R[1].pct&&R[3].pct>R[2].pct&&R[3].pct<=92&&Math.abs(R[2].bar-R[2].pct)<1.5, R.slice(1).map(x=>x&&x.pct));
 /* ③ */
 await p.waitForFunction(()=>window.__trFirst!==undefined,null,{timeout:8000});
 const f=await p.evaluate(()=>window.__trFirst);
 ok('③着いたページは隠れない（真ん中を押すとページに当たる）・前の続きの％から始まる', f.has&&f.hit==='ページ'&&f.pct>=R[3].pct-1, {...f, prev:R[3].pct});
 /* ④ */
 const gone=await p.waitForFunction(()=>!document.getElementById('nnTrans'),null,{timeout:9000}).then(()=>true).catch(()=>false);
 ok('④読み込みが終わったら消える', gone);
 const qk=await p.evaluate(()=>({ld:Math.round(window.__ld||-1), gone:Math.round(window.__gone||-1)}));
 ok('④消えるのは読み込み完了から0.5秒以内（待たせない）', qk.ld>0&&qk.gone>=qk.ld&&qk.gone-qk.ld<500, {...qk, 差:qk.gone-qk.ld});
 /* ⑤ */
 const pages=['index','kirokucho_demo','genba_map_v36','hacchu','kokkosho','camera','library','zumen_sekisan','shiyo_toroku','yougo','zairyo_toroku'];
 const bad=[];
 for(const pg of pages){ const q=await ctx.newPage(); q.on('pageerror',e=>errs.push(pg+': '+e.message)); await q.goto(U+pg+'.html'); await q.waitForTimeout(500);
   const r=await q.evaluate(()=>({go:typeof nnTransGo, cur:!!document.getElementById('nnTrans')})); if(r.go!=='function'||r.cur) bad.push(pg+JSON.stringify(r)); await q.close(); }
 ok('⑤全11ページに入っている・普通に開いたときは出ない', bad.length===0, bad);
 ok('JSエラーなし', errs.length===0, errs.slice(0,3));
 console.log(NG?('★NG '+NG+'件'):'全部○');
 await b.close();
})();
