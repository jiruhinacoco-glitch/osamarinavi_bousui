/* ★§737 写真台帳：スマホ横画面の一覧と左の枠
   本人（横画面）「左の枠が見切れている。タップすると枠全体が動く」「一覧にむだな余白。検索枠が長すぎ。一覧で可能な限り見せたい」
   ① 一覧：［＋ 新しい写真台帳を作る］・件数・並び順・検索が1行（上の端がそろう）・検索の欄は 340px 以下
   ② 一覧は3列（7件で3行）・カードのすき間 8px 以下・7件が1画面に収まる
   ③ 作成画面の左の枠は横に動かない（overflow-x が clip／hidden・scrollLeft を入れても 0 に戻る）・pageerror 0
   直す前の版では ①②③ が★NG。  使い方: node _check/daicho_yoko_lib.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const W=932,H=430;
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([W,H])=>{Object.defineProperty(screen,'width',{get:()=>W});Object.defineProperty(screen,'height',{get:()=>H});localStorage.setItem('nn_view_mode','mobile');},[W,H]);
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(800);
  await p.evaluate(async()=>{ localStorage.setItem('nn_daicho_pref_v1','{}'); const old=await nnPhotos.load('nn_daicho_v1'); if(old) await nnPhotos.del('nn_daicho_v1',Object.keys(old));
    const names=['サン太平レジデンス 大規模修繕（屋上・バルコニー防水）','手稲前田ビル 屋上防水改修','琴似マンション 外壁改修','発寒倉庫 屋根防水','西野ハイツ バルコニー防水','山の手団地 屋上','宮の沢店舗 庇防水'];
    const c=document.createElement('canvas'); c.width=160; c.height=120; const g=c.getContext('2d'); const m={};
    names.forEach((n,i)=>{ g.fillStyle='hsl('+(i*50)+',40%,55%)'; g.fillRect(0,0,160,120); m['p'+i]={site:n,kind:'防水工事',date:'2026-10-1'+i,t:Date.now()-i*1000,d:c.toDataURL('image/jpeg',.7),raw:1}; });
    await nnPhotos.putMany('nn_daicho_v1',m); });
  await p.reload(); await p.waitForTimeout(900); await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(1200);
  const g=await p.evaluate(()=>{ const R=s=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {t:Math.round(r.top),b:Math.round(r.bottom),l:Math.round(r.left),w:Math.round(r.width)}; };
    const cards=[...document.querySelectorAll('#dbLibList .libCard')].map(e=>e.getBoundingClientRect()); const tops=[...new Set(cards.map(r=>Math.round(r.top)))];
    const gap=cards.length>1?Math.round(cards[1].left-cards[0].right):99, lib=document.getElementById('dbLib');
    return {lib:document.getElementById('dbv').classList.contains('lib'), nw:R('#dbLibNew'), h:R('.libH'), q:R('.libQ'), qi:R('#dbLibQ'), n:cards.length, rows:tops.length, gap, fit:lib.scrollHeight<=lib.clientHeight+1}; });
  ok('① 一覧：新しく作る・件数・並び順・検索が1行・検索の欄は 340px 以下', g.lib&&g.nw&&g.q&&Math.abs(g.nw.t+g.nw.b-g.q.t-g.q.b)<=8&&Math.abs(g.h.t+g.h.b-g.q.t-g.q.b)<=10&&g.q.w<=340, {nw:g.nw,h:g.h,q:g.q});
  ok('② 一覧は3列（7件で3行）・すき間 8px 以下・1画面に収まる', g.n===7&&g.rows===3&&g.gap<=8&&g.fit, {n:g.n,rows:g.rows,gap:g.gap,fit:g.fit});
  await p.locator('#dbLibNew').click(); await p.waitForTimeout(800);
  const s=await p.evaluate(()=>{ const sd=document.getElementById('dbSide'); const ox=getComputedStyle(sd).overflowX; sd.style.width='200px'; sd.scrollLeft=60; return new Promise(r=>setTimeout(()=>{ const sl=sd.scrollLeft; sd.style.width=''; r({ox,sl}); },300)); });
  ok('③ 作成画面の左の枠は横に動かない・pageerror 0', (s.ox==='clip'||s.ox==='hidden')&&s.sl===0&&errs.length===0, {s,errs});
 }catch(e){ console.log('★NG 例外 '+e.message); NG++; }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); process.exit(NG?1:0); })();
