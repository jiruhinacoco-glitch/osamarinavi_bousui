/* §1431 平面図の描画：向きの補正（水平・垂直＝6度以内／45度＝4度以内／そのほかの15度きざみ＝1.5度以内・弱め）。
   ①実際にクリックして、少し傾けて狙った長方形が、4辺ともまっすぐな長方形になる（出来上がり）
   ②45度・30度に近いと吸い付く／離れていれば狙った位置のまま ③長さは丸めない ④下絵を敷いているときは補正しない ⑤スマホでも同じ
   直す前の版は★NG。使い方: node _check/angho.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.evaluate(()=>{ try{nnZMenuClose()}catch(_){} state.polys=[]; state.parts=[]; state.underlay=null; state.scaleM=1; drawPts=[]; cellPx=55; ox=30; oy=190; setTab('zu'); setTool('draw'); draw(); });
const click=async(x,y)=>{ const pt=await p.evaluate(([x,y])=>{ const r=cv.getBoundingClientRect(); return {x:r.left+(ox+x*cellPx)*r.width/(cv.width/devicePixelRatio), y:r.top+(oy+y*cellPx)*r.height/(cv.height/devicePixelRatio)}; },[x,y]); await p.mouse.move(pt.x,pt.y); await p.mouse.click(pt.x,pt.y); await p.waitForTimeout(120); };
/* ① 始点(3,2)→ 右へ（2.8度下がり）→ 下へ（2.8度右へ流れる）→ 左へ（始点の真下あたり）→ 始点で閉じる */
await click(3,2); await click(9.2,2.3); await click(9.4,6.1); await click(3.06,6.25); await click(3,2);
const sh=await p.evaluate(()=>state.polys[0]?state.polys[0].pts.map(q=>[+q.x.toFixed(3),+q.y.toFixed(3)]):null);
/* 手計算：(3,2)→水平なので (9.2,2)→垂直なので (9.2,6.1)→水平なので y=6.1・x は始点の真下 3 にそろう → (3,6.1) */
const want=[[3,2],[9.2,2],[9.2,6.1],[3,6.1]];
ck(sh&&sh.length===4&&sh.every((q,i)=>Math.abs(q[0]-want[i][0])<0.02&&Math.abs(q[1]-want[i][1])<0.02),'少し傾けて狙った長方形が、4辺ともまっすぐな長方形になる（'+JSON.stringify(sh)+'・正しくは '+JSON.stringify(want)+'）');
/* ②〜④ 向きごと（前の点＝(2,2)。角度は右＝0度・下＝90度） */
const snap=(x,y,ul)=>p.evaluate(([x,y,ul])=>{ setTool('draw'); state.polys=[]; state.underlay=ul?{x:0,y:0,mPerPx:0.1,rot:0}:null; if(ul){ try{ uImg=document.createElement('canvas'); uImg.width=10; uImg.height=10; }catch(_){} } else { try{ uImg=null; }catch(_){} }
  drawPts=[{x:2,y:2}]; mouse.shift=false; const g=nnSnapPt(x,y); return [g.x,g.y]; },[x,y,ul]);
const pol=(deg,L)=>[2+L*Math.cos(deg*Math.PI/180), 2+L*Math.sin(deg*Math.PI/180)];
const angOf=g=>Math.atan2(g[1]-2,g[0]-2)*180/Math.PI, lenOf=g=>Math.hypot(g[0]-2,g[1]-2);
const cases=[[5,0,'5度→水平'],[-5.5,0,'-5.5度→水平'],[84.5,90,'84.5度→垂直'],[7,7,'7度→そのまま（水平の6度より外・15度からも遠い）'],[10,10,'10度→そのまま'],
  [42,45,'42度→45度'],[48.5,45,'48.5度→45度'],[50,50,'50度→そのまま'],[14,15,'14度→15度（弱め）'],[31.2,30,'31.2度→30度（弱め）'],[33,33,'33度→そのまま（15度きざみは1.5度以内だけ）'],[61,60,'61度→60度'],[57,57,'57度→そのまま'],[135+3,135,'138度→135度'],[-92,-90,'-92度→真上']];
for(const c of cases){ const a=pol(c[0],5.37), g=await snap(a[0],a[1],false), d=angOf(g);
  /* 長さ：吸い付いたときは「狙った点から線へ下ろした足」＝ 5.37×cos(ずれ)。丸めない */
  const wantL=5.37*Math.cos((c[0]-c[1])*Math.PI/180);
  ck(Math.abs(d-c[1])<0.01&&Math.abs(lenOf(g)-wantL)<0.002, c[2]+'（出た向き '+d.toFixed(2)+'度・長さ '+lenOf(g).toFixed(3)+'m／正しくは '+c[1]+'度・'+wantL.toFixed(3)+'m）'); }
const u=pol(3,5.37), gu=await snap(u[0],u[1],true);
ck(Math.abs(gu[0]-u[0])<1e-9&&Math.abs(gu[1]-u[1])<1e-9,'下絵を敷いているときは補正しない（3度でも狙った位置のまま）');
await p.evaluate(()=>{ state.underlay=null; try{ uImg=null; }catch(_){} });
console.log('errors',errs.slice(0,3)); if(errs.length) NG++;
/* ⑤ スマホ（同じ決まりを通る） */
const q=await (await b.newContext({viewport:{width:852,height:393},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'})).newPage();
await q.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await q.waitForTimeout(1500);
const gs=await q.evaluate(()=>{ try{nnZMenuClose()}catch(_){} state.polys=[]; state.underlay=null; setTab('zu'); setTool('draw'); drawPts=[{x:2,y:2}]; const a=nnSnapPt(19.2,2.5), r=nnResolvePoint(a.x,a.y,19.2,2.5); return [r.g.x,r.g.y]; });
ck(gs[1]===2&&Math.abs(gs[0]-19.2)<1e-9,'スマホ：17.2m を少し下がり気味に引いても水平になる（'+JSON.stringify(gs)+'）');
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
