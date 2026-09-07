/* 完成した部位の寸法・角度の札をタップ→数値で直せる（§316）
   本人の指摘「図面作成完了後に寸法や角度の編集ができない。おかしい」
   使い方: node _check/labeledit.js（PC） / node _check/labeledit.js ph（スマホたて） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
if(PH) await ctx.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852});}catch(_){} });
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/zumen_sekisan.html'); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(900);
if(PH){ await p.waitForFunction(()=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect(); const nav=document.querySelector('nav'); const nr=nav?nav.getBoundingClientRect():null;
  return (!nr||nr.top>=innerHeight-1) && Math.abs(cv.height-Math.round(r.height*devicePixelRatio))<=2; },{timeout:15000}); await p.waitForTimeout(400); }
/* L字（1マス=1m）：P0(2,3) P1(18,3) P2(18,9) P3(22,9) P4(22,13) P5(2,13)。中抜き 1つ */
await p.evaluate(()=>{ state.scaleM=1; state.polys=[{name:'屋根①', lv:0,
  pts:[{x:2,y:3},{x:18,y:3},{x:18,y:9},{x:22,y:9},{x:22,y:13},{x:2,y:13}], edges:[0,1,2,3,4,5].map(()=>({k:'para',h:300,w:250})),
  holes:[{pts:[{x:6,y:6},{x:9,y:6},{x:9,y:8},{x:6,y:8}], edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250}))}]}];
  state.active=0; saveState(); setTool('sel'); if(!showAngles) toggleAngles(); /* ★ツールバーの下に置く（上に置くとボタンに当たる・§121の罠） */ cellPx=(typeof NN_PHONE!=='undefined'&&NN_PHONE)?20:32; ox=(typeof NN_PHONE!=='undefined'&&NN_PHONE)?10:80; oy=(typeof NN_PHONE!=='undefined'&&NN_PHONE)?280:300; draw();
  window.__ask=null; window.nnNumAsk=function(t,init,fn){ window.__ask={t,init}; fn(window.__ans); };
  /* ★直し方の選択（§317）は既定「形を保つ」で自動応答。⑥で本物に戻して窓そのものを見る */
  window.__realPick=window.nnAskPick;
  window.nnAskPick=function(t,items,cb){ window.__pick={t:t, ks:items.map(x=>x.k)}; cb(window.__pickAns==null?'keep':window.__pickAns); }; });
const tap=async(x,y)=>{ if(PH) await p.touchscreen.tap(x,y); else await p.mouse.click(x,y); await p.waitForTimeout(250); };
const labClient=async(kind,r,i)=>await p.evaluate(([kind,r,i])=>{ const cv=document.getElementById('cv'), rc=cv.getBoundingClientRect();
  const kx=(cv.width/devicePixelRatio)/rc.width, ky=(cv.height/devicePixelRatio)/rc.height;
  const h=nnLabHit.find(b=>b.kind===kind&&b.p===0&&b.r===r&&b.i===i); if(!h) return null; return {x:rc.left+h.x/kx, y:rc.top+h.y/ky, w:h.w, hh:h.h}; },[kind,r,i]);
const geom=async()=>await p.evaluate(()=>{ const P=state.polys[0].pts; const L=(a,b)=>+Math.hypot(b.x-a.x,b.y-a.y).toFixed(3);
  return {P:P.map(q=>[+q.x.toFixed(3),+q.y.toFixed(3)]), len:P.map((q,i)=>L(q,P[(i+1)%P.length])), n:nnLabHit.filter(b=>b.kind==='pdim').length, na:nnLabHit.filter(b=>b.kind==='pang').length}; });
const g0=await geom();
ok(g0.n===10 && g0.na===10, '① 完成した辺・角の札に当たり判定がある（外周6＋穴4）', {dim:g0.n, ang:g0.na});
/* ② 上の辺（32→16m を 15m に） */
const l0=await labClient('pdim',-1,0); ok(!!l0, '② 上の辺の寸法の札の位置が取れる', l0);
await p.evaluate(()=>{ window.__ans='15'; }); await tap(l0.x,l0.y);
const g1=await geom(); const ask1=await p.evaluate(()=>window.__ask);
ok(ask1 && /長さ/.test(ask1.t) && ask1.init==='16.0', '② 札をタップ＝長さの入力窓（いまの値 16.0）', ask1);
ok(g1.len[0]===15 && g1.P[1][0]===17 && g1.P[2][0]===17 && g1.P[3][0]===21 && g1.P[4][0]===21, '② 上の辺が15m・右側の点が左へ1m動く', g1);
ok(g1.P[0][0]===2 && g1.P[5][0]===2 && g1.len[5]===10 && g1.len[4]===19, '② 始点と左の辺は動かず、下の辺（ひとつ手前）が 20→19m で帳尻', {len:g1.len});
ok(g1.len[1]===6 && g1.len[2]===4 && g1.len[3]===4, '② ほかの辺の長さは変わらない', g1.len);
const saved=await p.evaluate(()=>{ const o=JSON.parse(localStorage.getItem('nn_zumen_v1')); return o.polys[0].pts[1].x; });
ok(saved===17, '② 保存もされている（開き直しても残る）', saved);
/* ③ 角度：P1 の角（90°）を 100° に */
const a1=await labClient('pang',-1,1); ok(!!a1, '③ 角の札の位置が取れる', a1);
await p.evaluate(()=>{ window.__ans='100'; }); await tap(a1.x,a1.y);
const g2=await geom(); const ask2=await p.evaluate(()=>window.__ask);
const deg1=await p.evaluate(()=>{ const P=state.polys[0].pts; return +nnInteriorDeg(state.polys[0],P[1],P[0],P[2]).toFixed(1); });
ok(ask2 && /角度/.test(ask2.t) && ask2.init==='90', '③ 札をタップ＝角度の入力窓（いまの値 90）', ask2);
ok(Math.abs(deg1-100)<0.2, '③ 角が100°になる', deg1);
ok(g2.len[0]===15 && g2.len[1]===6 && g2.len[2]===4 && g2.len[3]===4 && g2.P[0][0]===2 && g2.P[1][0]===17, '③ 辺の長さと始点はそのまま（回しただけ）', g2.len);
ok(g2.P[0][0]===2 && g2.P[0][1]===3 && g2.len[4]===g1.len[4], '③ 角の両側の点（P0・P1）は動かず、下の辺の長さもそのまま＝左の辺（P5→P0）だけで帳尻', {P0:g2.P[0], len4:g2.len[4]});
/* ↩戻る で2手戻る */
const un=await p.evaluate(()=>{ undoStep(); undoStep(); const P=state.polys[0].pts; return [P[1].x, P[2].x, +Math.hypot(P[1].x-P[0].x,P[1].y-P[0].y).toFixed(2)]; });
ok(un[0]===18 && un[2]===16, '③ ↩戻る で元に戻る', un);
/* ④ 穴の辺も直せる（3→2.5m） */
await p.evaluate(()=>{ draw(); });
const h0=await labClient('pdim',0,0); ok(!!h0, '④ 中抜きの辺の札も押せる', h0);
await p.evaluate(()=>{ window.__ans='2.5'; }); await tap(h0.x,h0.y);
const hole=await p.evaluate(()=>{ const H=state.polys[0].holes[0].pts; return [H[1].x, H[2].x, H[0].x, H[3].x]; });
ok(hole[0]===8.5 && hole[1]===8.5 && hole[2]===6 && hole[3]===6, '④ 穴の辺が2.5mになり、始点側は動かない', hole);
/* ⑤ 描画ツール（かき始める前）でも押せる／かいている途中は今までどおり */
await p.evaluate(()=>{ setTool('draw'); draw(); window.__ask=null; window.__ans='16'; });
const l1=await labClient('pdim',-1,0); await tap(l1.x,l1.y);
const d1=await p.evaluate(()=>({asked:!!window.__ask, pts:drawPts.length, len:+Math.hypot(state.polys[0].pts[1].x-state.polys[0].pts[0].x,0).toFixed(2)}));
ok(d1.asked && d1.pts===0 && d1.len===16, '⑤ 描画ツールでも、かき始める前なら札で直せる（点は打たれない）', d1);
/* ⑥ 直し方を選べる（形を保つ／この辺だけ）＝本人の指摘「向かいの辺まで同じ寸法になる」（§317） */
await p.evaluate(()=>{ window.nnAskPick=window.__realPick;            /* ★本物の窓に戻す */
  setTool('sel'); state.polys[0].pts=[{x:2,y:3},{x:18,y:3},{x:18,y:13},{x:2,y:13}];
  state.polys[0].edges=[0,1,2,3].map(()=>({k:'para',h:300,w:250})); delete state.polys[0].holes;
  saveState(); draw(); window.__ask=null; window.__ans='12'; });
await p.waitForTimeout(200);
const lb=await labClient('pdim',-1,0); await tap(lb.x,lb.y); await p.waitForTimeout(450);
const pick=await p.evaluate(()=>{ const w=document.getElementById('nnPickBox');
  return {open:!!w, txt:w?w.textContent.replace(/\s+/g,' '):'', btns:w?[...w.querySelectorAll('button[data-k]')].map(b=>b.getAttribute('data-k')):[]}; });
ok(pick.open && pick.btns.includes('keep') && pick.btns.includes('one'), '⑥ 向かいの辺も変わるときは「形を保つ／この辺だけ」を選べる', pick.btns);
ok(/16\.0m → 12\.0m/.test(pick.txt), '⑥ 向かいの辺が何mになるかが書いてある', pick.txt.slice(0,120));
await p.evaluate(()=>{ document.querySelector('#nnPickBox button[data-k="one"]').click(); }); await p.waitForTimeout(300);
const one=await p.evaluate(()=>{ const P=state.polys[0].pts, L=(a,b)=>+Math.hypot(b.x-a.x,b.y-a.y).toFixed(2);
  return {len:P.map((q,i)=>L(q,P[(i+1)%P.length])), P:P.map(q=>[+q.x.toFixed(2),+q.y.toFixed(2)])}; });
ok(one.len[0]===12 && one.len[2]===16, '⑥「この辺だけ」＝向かいの辺（16m）は変わらない', one.len);
await p.evaluate(()=>{ undoStep(); draw(); window.__ans='12'; }); await p.waitForTimeout(250);
const lb2=await labClient('pdim',-1,0); await tap(lb2.x,lb2.y); await p.waitForTimeout(300);
await p.evaluate(()=>{ const b=document.querySelector('#nnPickBox button[data-k="keep"]'); if(b)b.click(); }); await p.waitForTimeout(300);
const keep=await p.evaluate(()=>{ const P=state.polys[0].pts, L=(a,b)=>+Math.hypot(b.x-a.x,b.y-a.y).toFixed(2);
  return P.map((q,i)=>L(q,P[(i+1)%P.length])); });
ok(keep[0]===12 && keep[2]===12, '⑥「形を保つ」＝長方形のまま（向かいの辺も12m）', keep);
await p.evaluate(()=>{ undoStep(); draw(); }); await p.waitForTimeout(250);
/* ⑦ 選択ツールで札の外を押しても窓は出ない */
await p.evaluate(()=>{ setTool('sel'); draw(); window.__ask=null; });
const far=await p.evaluate(()=>{ const cv=document.getElementById('cv'), rc=cv.getBoundingClientRect(); const kx=(cv.width/devicePixelRatio)/rc.width, ky=(cv.height/devicePixelRatio)/rc.height; return {x:rc.left+gx2px(12)/kx, y:rc.top+gy2px(11)/ky}; });
await tap(far.x,far.y);
ok(await p.evaluate(()=>!window.__ask), '⑦ 札の外を押しても入力窓は出ない');
ok(errs.length===0, 'JSエラーなし', errs);
await b.close(); console.log((ng?'★NG':'○')+' '+ng+'件  ('+(PH?'スマホ':'PC')+')'); process.exit(ng?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
