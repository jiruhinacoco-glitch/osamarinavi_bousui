/* ★2026-09-30r 屋根の表「GL高さ」と立上り（GL高さ＋mm）・3Dで方角ガイドに埋もれない（本人の指示）
   ①3Dで屋根の表が方角ガイド（#nnAxisGiz）の裏に隠れない／触ったほうが手前／方角ガイドは「✥ 移動」ですぐ動く
   ②列名は「GL高さ」「立上り GL高さ＋mm」。GL高さを変えると屋根まるごと上下（立上り＋300は＋300のまま）
   ③辺ごとに違うときは入力欄ではなく「辺ごと ＋300〜＋2500」の札→辺ごとの一覧でその辺だけ直せる
   ④パラペットの足元が平場とずれている屋根でも、表の数字は「平場から＋mm」
   node _check/rtblgl.js [file] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{console.log((c?'○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(800);
await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){} localStorage.removeItem('nn_zumen_rtblpos'); localStorage.removeItem('nn_float3d_v1'); });
await p.reload(); await p.waitForTimeout(800);
await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){}
  const E=n=>Array.from({length:n},()=>({h:300,w:250,k:'para'}));
  state.polys=[{name:'屋根①',lv:0,pts:[{x:2,y:2},{x:12,y:2},{x:12,y:10},{x:2,y:10}],edges:E(4)}];
  state.active=0; state.scaleM=1; saveState(); renderPolyList(); recalc(); draw(); setTab('d3'); });
await p.waitForFunction(()=>{const g=document.getElementById('nnAxisGiz');return g&&g.classList.contains('on')&&typeof T!=='undefined'&&T&&T.group&&T.group.children.length>2;},null,{timeout:15000});
await p.waitForTimeout(900);
/* ① 重ならない */
const R=()=>p.evaluate(()=>{const f=id=>{const r=document.getElementById(id).getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom};};return {t:f('nnRoofTbl'),g:f('nnAxisGiz')};});
let r0=await R();
const ov=(a,c)=>a.l<c.r&&c.l<a.r&&a.t<c.b&&c.t<a.b;
ok(!ov(r0.t,r0.g),'①3Dで屋根の表と方角ガイドが重ならない（表が左へ逃げる）',r0);
const clsVis=await p.evaluate(()=>{const c=document.querySelector('#nnRoofTbl .rcl').getBoundingClientRect();const h=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);return !!(h&&h.closest('.rcl'));});
ok(clsVis,'①表の ✕ が押せる（何かの裏に隠れていない）');
/* ① 触ったほうが手前 */
await p.evaluate(()=>{ const t=document.getElementById('nnRoofTbl'); t.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0})); });
let z1=await p.evaluate(()=>[+getComputedStyle(document.getElementById('nnRoofTbl')).zIndex,+getComputedStyle(document.getElementById('nnAxisGiz')).zIndex]);
ok(z1[0]>z1[1],'①屋根の表に触ると方角ガイドより手前',z1);
/* ① ✥ 移動ですぐ動く */
const mv=await p.evaluate(()=>{const m=document.querySelector('#nnAxisGiz .nnmv'); if(!m)return null; const r=m.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};});
ok(!!mv,'①方角ガイドに「✥ 移動」の帯がある');
if(mv){ const g0=r0.g; await p.mouse.move(mv.x,mv.y); await p.mouse.down(); await p.mouse.move(mv.x-150,mv.y+120,{steps:6}); await p.mouse.up(); await p.waitForTimeout(400);
  const g1=(await R()).g; ok(g1.l<g0.l-100&&g1.t>g0.t+80,'①帯をつかむと長押しなしで動く',{前:[g0.l|0,g0.t|0],後:[g1.l|0,g1.t|0]});
  z1=await p.evaluate(()=>[+getComputedStyle(document.getElementById('nnRoofTbl')).zIndex,+getComputedStyle(document.getElementById('nnAxisGiz')).zIndex]);
  ok(z1[1]>z1[0],'①方角ガイドに触ると今度はそちらが手前',z1); }
/* ② 列名 */
const th=await p.evaluate(()=>[...document.querySelectorAll('#nnRoofTbl th')].map(x=>x.textContent));
ok(th[2]==='GL高さ'&&/立上り.*GL高さ＋mm/.test(th[3]),'②列名「GL高さ」「立上り GL高さ＋mm」',th.slice(2,4));
/* ② GL高さを変えても立上りは＋300のまま（パラペットも一緒に上がる） */
await p.evaluate(()=>{ const i=document.querySelector('#nnRoofTbl .rlv'); i.value='1.5'; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); });
await p.waitForTimeout(600);
const s2=await p.evaluate(()=>{const q=state.polys[0]; const wl=(q.wallLv!=null)?+q.wallLv:+q.lv;
  return {lv:q.lv, top:Math.round(wl*1000+q.edges[0].h), rise:Math.round(wl*1000+q.edges[0].h-q.lv*1000),
    cell:(document.querySelector('#nnRoofTbl .rhw[data-k="h"]')||{}).value};});
ok(Math.abs(s2.lv-1.5)<1e-9&&s2.rise===300,'②GL高さ1.5mにしても、平場から立上り＋300mm（パラペットも上がる）',s2);
ok(s2.top===1800,'②パラペットの上端はGL+1800mm',s2.top);
ok(s2.cell==='300','②表の立上りは 300 のまま',s2.cell);
/* ③ 辺ごとに違う */
await p.evaluate(()=>{ state.polys[0].edges[0].h=2500; saveState(); nnRoofTbl(true); });
await p.waitForTimeout(300);
const s3=await p.evaluate(()=>{const tr=document.querySelector('#nnRoofTbl tr.rrow'); const m=tr.querySelector('.rhe.mix');
  return {mix:m&&m.textContent, inp:!!tr.querySelector('.rhw[data-k="h"]')};});
ok(s3.mix&&/辺ごと/.test(s3.mix)&&/300/.test(s3.mix)&&/2500/.test(s3.mix)&&!s3.inp,'③辺ごとに違うと入力欄ではなく「辺ごと ＋300〜＋2500」の札',s3);
await p.click('#nnRoofTbl .rhe.mix'); await p.waitForTimeout(300);
const s4=await p.evaluate(()=>{const o=document.getElementById('nnREPop'); if(!o)return null;
  return {rows:o.querySelectorAll('.er').length, dif:[...o.querySelectorAll('.er.dif b')].map(x=>x.textContent), gd:o.querySelector('.gd').textContent};});
ok(s4&&s4.rows===4&&s4.dif.join()==='辺1','③押すと辺ごとの一覧（4辺）・ほかと違う辺1に印',s4);
ok(s4&&/その辺だけ/.test(s4.gd),'③案内文「その辺だけ変わります」',s4&&s4.gd);
/* 行に触れるとその辺を選ぶ */
const er2=await p.$('#nnREPop .er:nth-child(2)'); await er2.hover(); await p.waitForTimeout(200);
const sl=await p.evaluate(()=>sel&&[sel.p,sel.r,sel.e]);
ok(sl&&sl.join()==='0,-1,1','③行に触れると、その辺（辺2）が選ばれる',sl);
/* その辺だけ直す */
await p.evaluate(()=>{ const i=document.querySelectorAll('#nnREPop .er input')[1]; i.value='800'; i.dispatchEvent(new Event('change',{bubbles:true})); });
await p.waitForTimeout(400);
const s5=await p.evaluate(()=>{const q=state.polys[0], wl=(q.wallLv!=null)?+q.wallLv:+q.lv; return q.edges.map(e=>Math.round(wl*1000+e.h-q.lv*1000));});
ok(s5.join()==='2500,800,300,300','③辺2だけ＋800に（ほかは変わらない）',s5);
/* そろえる */
await p.evaluate(()=>{ const o=document.getElementById('nnREPop'); o.querySelector('.al input').value='1000'; o.querySelector('.al button').click(); });
await p.waitForTimeout(400);
const s6=await p.evaluate(()=>{const q=state.polys[0], wl=(q.wallLv!=null)?+q.wallLv:+q.lv; return {v:q.edges.map(e=>Math.round(wl*1000+e.h-q.lv*1000)), inp:(document.querySelector('#nnRoofTbl .rhw[data-k="h"]')||{}).value};});
ok(s6.v.join()==='1000,1000,1000,1000'&&s6.inp==='1000','③「そろえる」で全辺＋1000・表は入力欄に戻る',s6);
await p.keyboard.press('Escape');
/* ④ 足元がずれている屋根（平場だけ上げた古いデータ） */
await p.evaluate(()=>{ const q=state.polys[0]; q.lv=1.5; q.wallLv=0; q.edges.forEach(e=>{e.h=2500;e.k='para';}); saveState(); nnRoofTbl(true); });
await p.waitForTimeout(300);
const s7=await p.evaluate(()=>(document.querySelector('#nnRoofTbl .rhw[data-k="h"]')||{}).value);
ok(s7==='1000','④平場GL+1.5m・パラペット上端GL+2.5m → 表は＋1000',s7);
await p.evaluate(()=>{ const i=document.querySelector('#nnRoofTbl .rhw[data-k="h"]'); i.value='2500'; i.dispatchEvent(new Event('change',{bubbles:true})); });
await p.waitForTimeout(400);
const s8=await p.evaluate(()=>{const q=state.polys[0]; return Math.round(q.wallLv*1000+q.edges[0].h);});
ok(s8===4000,'④＋2500と打つとパラペット上端はGL+4000（GL高さ1.5m＋2.5m）',s8);
ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
await b.close(); process.exit(ng?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
