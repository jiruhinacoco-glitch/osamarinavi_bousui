/* 図面作成：途中で「筆をおく」→ あとで「続きから」引ける（§318）
   本人の指摘「線を引いて途中で終わることができず、形にしたいと完結することができない。
   線を引いたら一度そこで筆をおき、また途中の終点の線から線を引けるように」
   使い方: node _check/draft1.js（PC） / node _check/draft1.js ph（スマホたて）
           node _check/draft1.js pc _before.html（直す前と比べる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const FILE=(process.argv[3]||(process.argv[2]&&process.argv[2].endsWith('.html')?process.argv[2]:null))||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
if(PH) await ctx.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(_){} });
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{localStorage.removeItem('nn_zumen_v1');}catch(_){}}); await p.reload();
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(900);
if(PH){ await p.waitForFunction(()=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect(); const nav=document.querySelector('nav'); const nr=nav?nav.getBoundingClientRect():null;
  return (!nr||nr.top>=innerHeight-1) && Math.abs(cv.height-Math.round(r.height*devicePixelRatio))<=2; },{timeout:15000}); await p.waitForTimeout(300); }
await p.evaluate(()=>{ state.scaleM=1; state.polys=[]; state.active=-1; saveState();
  cellPx=(typeof NN_PHONE!=='undefined'&&NN_PHONE)?20:32; ox=(typeof NN_PHONE!=='undefined'&&NN_PHONE)?10:80;
  oy=(typeof NN_PHONE!=='undefined'&&NN_PHONE)?300:320; setTool('draw'); draw(); });
const gclick=async(gx,gy)=>{ const q=await p.evaluate(([gx,gy])=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
  const kx=(cv.width/devicePixelRatio)/r.width, ky=(cv.height/devicePixelRatio)/r.height;
  return {x:r.left+gx2px(gx)/kx, y:r.top+gy2px(gy)/ky}; },[gx,gy]);
  if(PH) await p.touchscreen.tap(q.x,q.y); else await p.mouse.click(q.x,q.y); await p.waitForTimeout(230); return q; };

/* ── ① 3点引いて「筆をおく」 ── */
await gclick(2,2); await gclick(8,2); await gclick(8,6);
/* ★スマホは「指の右上の赤い照準」に打たれるので、狙った升目とは少しずれる（仕様）。
   期待値は決め打ちにせず、実際に打たれた点と突き合わせる。 */
const endPt=await p.evaluate(()=>drawPts.length?[+drawPts[drawPts.length-1].x, +drawPts[drawPts.length-1].y]:null);
const mid=await p.evaluate(()=>({pts:drawPts.length, bar:!!document.querySelector('#nnDraftBar.on'),
  txt:(document.getElementById('nnDraftBar')||{}).textContent||''}));
ok(mid.pts===3, '① 3点引けている', mid.pts);
ok(mid.bar && /筆をおく/.test(mid.txt), '① 引いている間は「✋ 筆をおく」が出る', mid.txt.replace(/\s+/g,' ').slice(0,40));
await p.evaluate(()=>{ document.querySelector('#nnDraftBar button[data-a="put"]').click(); }); await p.waitForTimeout(400);
const put=await p.evaluate(()=>{ let ls=null; try{ ls=JSON.parse(localStorage.getItem('nn_zumen_v1')).draft; }catch(_){}
  return {pts:drawPts.length, draft:(state.draft&&state.draft.pts.length)||0, saved:(ls&&ls.pts&&ls.pts.length)||0,
    txt:(document.getElementById('nnDraftBar')||{}).textContent||'', tool:tool, polys:state.polys.length}; });
ok(put.pts===0 && put.draft===3, '① 筆をおくと、引きかけが下書きとして残る（消えない）', put);
ok(put.saved===3, '① 下書きは保存される（開き直しても残る）', put.saved);
ok(/続きから/.test(put.txt), '① 「▶ 続きから」が出る', put.txt.replace(/\s+/g,' ').slice(0,40));
ok(put.polys===0, '① 勝手に屋根にはしない', put.polys);

/* ── ② 続きから引いて閉じる ── */
await p.evaluate(()=>{ document.querySelector('#nnDraftBar button[data-a="go"]').click(); }); await p.waitForTimeout(400);
const res=await p.evaluate(()=>({pts:drawPts.length, tool:tool, draft:state.draft?1:0,
  last:drawPts.length?[drawPts[drawPts.length-1].x, drawPts[drawPts.length-1].y]:null}));
ok(res.pts===3 && res.tool==='draw' && !res.draft, '② 「続きから」で描画ツールに戻り、3点が復活する', res);
ok(res.last && endPt && Math.abs(res.last[0]-endPt[0])<0.02 && Math.abs(res.last[1]-endPt[1])<0.02, '② 終点は筆をおいた場所のまま', {now:res.last, was:endPt});
await gclick(2,6);                       /* 4点目 */
const p4=await p.evaluate(()=>drawPts.length);
ok(p4===4, '② 終点の続きから線が引ける', p4);
/* 始点で閉じる（スマホは照準ぶんずれるので、始点の画面位置から逆に狙う） */
await p.evaluate(()=>{ window.__p0=[drawPts[0].x, drawPts[0].y]; });
const c0=await p.evaluate(()=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
  const kx=(cv.width/devicePixelRatio)/r.width, ky=(cv.height/devicePixelRatio)/r.height;
  const ph=(typeof NN_PHONE!=='undefined'&&NN_PHONE);
  return {x:r.left+gx2px(window.__p0[0])/kx-(ph?36:0), y:r.top+gy2px(window.__p0[1])/ky+(ph?52:0)}; });
if(PH) await p.touchscreen.tap(c0.x,c0.y); else await p.mouse.click(c0.x,c0.y);
await p.waitForTimeout(400);
const cl=await p.evaluate(()=>({polys:state.polys.length, n:state.polys[0]?state.polys[0].pts.length:0,
  area:state.polys[0]?+polyAreaM(state.polys[0].pts,state.scaleM).toFixed(1):0, draft:state.draft?1:0}));
ok(cl.polys===1 && cl.n===4, '② 始点で閉じると屋根になる（4点）', cl);
ok(cl.area>10, '② 面積が出る', cl.area);
ok(!cl.draft, '② 閉じたら下書きは残らない', cl.draft);

/* ── ③ 道具を変えても消えない／Escは筆をおく ── */
await p.evaluate(()=>{ setTool('draw'); draw(); });
await gclick(12,2); await gclick(16,2);
await p.evaluate(()=>{ setTool('sel',1); });    /* 道具をボタンで変える */
const sw=await p.evaluate(()=>({draft:(state.draft&&state.draft.pts.length)||0, pts:drawPts.length, tool:tool}));
ok(sw.draft===2 && sw.pts===0, '③ 道具を変えても引きかけは下書きに残る（前は消えていた）', sw);
await p.evaluate(()=>{ nnDraftResume(); }); await p.waitForTimeout(300);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
const esc=await p.evaluate(()=>({draft:(state.draft&&state.draft.pts.length)||0, pts:drawPts.length}));
ok(esc.draft===2 && esc.pts===0, '③ Esc＝筆をおく（中止して消さない）', esc);

/* ── ④ 終点をタップしても続きから ── */
await p.evaluate(()=>{ setTool('sel'); draw(); });
/* 下書きの終点そのものの画面位置をタップする（照準は関係ない＝指の位置で判定） */
const ep=await p.evaluate(()=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
  const kx=(cv.width/devicePixelRatio)/r.width, ky=(cv.height/devicePixelRatio)/r.height;
  const q=state.draft.pts[state.draft.pts.length-1];
  return {x:r.left+gx2px(q.x)/kx, y:r.top+gy2px(q.y)/ky}; });
if(PH) await p.touchscreen.tap(ep.x,ep.y); else await p.mouse.click(ep.x,ep.y);
await p.waitForTimeout(400);
const tap=await p.evaluate(()=>({pts:drawPts.length, tool:tool, draft:state.draft?1:0}));
ok(tap.pts===2 && tap.tool==='draw', '④ 下書きの終点をタップ＝続きから引ける', tap);

/* ── ⑤ 開き直しても残る／消せる ── */
await p.evaluate(()=>{ nnDraftPut(); }); await p.waitForTimeout(300);
await p.reload(); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(900);
const rl=await p.evaluate(()=>({draft:(state.draft&&state.draft.pts.length)||0,
  bar:!!document.querySelector('#nnDraftBar.on'), polys:state.polys.length}));
ok(rl.draft===2 && rl.bar, '⑤ 開き直しても下書きが残り、帯も出る', rl);
const del=await p.evaluate(()=>{ nnDraftClear(false); return {draft:state.draft?1:0, bar:!!document.querySelector('#nnDraftBar.on')}; });
ok(!del.draft && !del.bar, '⑤ 「🗑 消す」で下書きを消せる', del);
/* ⑥ 何も無いときは帯を出さない／3Dでは出さない */
const off=await p.evaluate(()=>{ const b=document.getElementById('nnDraftBar'); return b?b.classList.contains('on'):false; });
ok(!off, '⑥ 下書きも引きかけも無いときは帯を出さない');
const d3=await p.evaluate(()=>{ setTool('draw'); state.draft={pts:[{x:1,y:1},{x:3,y:1}]}; draw(); setTab('d3');
  const r=!!document.querySelector('#nnDraftBar.on'); setTab('zu'); return r; });
ok(!d3, '⑥ 3Dタブでは出さない（平面図の道具なので）');
ok(errs.length===0, 'JSエラーなし', errs);
await b.close(); console.log((ng?'★NG':'○')+' '+ng+'件  ('+(PH?'スマホ':'PC')+')'); process.exit(ng?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
