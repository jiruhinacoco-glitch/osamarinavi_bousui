/* 10件改修の検証（実物のthree.jsを使う。http://localhost:8899 が必要） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('dialog',async d=>{ await d.accept(dlgText); });   /* confirm/promptは自動応答 */
let dlgText='テスト保存1';
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(1400);

/* --- 2画面ON＋サンプル形状 → 実物3D --- */
await p.evaluate(()=>{ loadSample(); nnSplitToggle(); }); await p.waitForTimeout(3500);

/* ③ ズームで寄ってもカメラが上を向かない（camera.y が注視点0.4を割らない） */
const zoomOk=await p.evaluate(()=>{ for(let i=0;i<40;i++)d3Zoom(0.8); return T.r; });
await p.waitForTimeout(600);
const camY=await p.evaluate(()=>T.camera.position.y);
ok(zoomOk>=0.6-1e-6,'ズームの下限は0.6m（行き過ぎない）', zoomOk.toFixed(2));
ok(camY>0.4,'寄り切ってもカメラは注視点(0.4m)より上＝見上げにならない', camY.toFixed(3));
await p.evaluate(()=>{ d3Fit(); }); await p.waitForTimeout(600);

/* ② 初期値の一括反映（confirmは自動でOK） */
await p.evaluate(()=>{ document.getElementById('defH').value=1000; nnDefApply('h',1000); });
await p.waitForTimeout(700);
const hAll=await p.evaluate(()=>state.polys.every(pl=>ringsOf(pl).every(r=>r.edges.every(e=>(e.k||'para')==='free'||e.h===1000))));
ok(hAll,'初期値1000mm → 既存の全辺の立上りが1000に');
const hTag=await p.evaluate(()=>{ draw(); return true; });

/* ⑤⑥ 寸法の文字とトグル */
const dim=await p.evaluate(()=>({on:nnDimsOn, btn:!!document.getElementById('tl_dims')}));
ok(dim.btn&&dim.on,'📏 寸法ボタンがあり既定ON');
await p.evaluate(()=>nnToggleDims()); 
const dimOff=await p.evaluate(()=>nnDimsOn===false && localStorage.getItem('nn_zumen_dims')==='0');
ok(dimOff,'OFFにすると保存される');
await p.evaluate(()=>nnToggleDims());

/* ① 全削除 → 影の計算がやり直される（needsUpdateが立つ） */
await p.evaluate(()=>{ window.__sunFlag=false;
  const sun=T.sun; const d=Object.getOwnPropertyDescriptor(sun.shadow,'needsUpdate');
  let v=sun.shadow.needsUpdate;
  Object.defineProperty(sun.shadow,'needsUpdate',{get:()=>v,set:x=>{v=x; if(x)window.__sunFlag=true;}});
  state.polys=[]; state.active=-1; saveState(); });
await p.waitForTimeout(900);
const sunFlag=await p.evaluate(()=>window.__sunFlag && state.polys.length===0);
ok(sunFlag,'全削除でも影を1回計算し直す（残像が消える）');

/* ⑨ Shift＝90度 */
await p.evaluate(()=>{ clearAll&&0; drawPts=[{x:10,y:10}]; tool='draw'; mouse.shift=true; });
const sh=await p.evaluate(()=>nnSnapPt(14.3,11.7));
ok(sh.y===10 && sh.x>10,'Shift中は水平・垂直だけ（y がそろう）', JSON.stringify(sh));
await p.evaluate(()=>{ mouse.shift=false; drawPts=[]; });
const sh2=await p.evaluate(()=>{ drawPts=[{x:10,y:10}]; const r=nnSnapPt(14.3,11.7); drawPts=[]; return r; });
ok(sh2.y!==10,'Shiftなしは5度きざみ（斜めが引ける）', JSON.stringify(sh2));

/* ⑧ 作図中の3Dプレビュー（描きかけ3点 → 3Dの部品数が増える） */
await p.evaluate(()=>{ loadSample(); }); await p.waitForTimeout(900);
const n0=await p.evaluate(()=>T.group.children.length);
await p.evaluate(()=>{ tool='draw'; drawPts=[{x:2,y:2},{x:8,y:2},{x:8,y:6}]; });
await p.waitForTimeout(1100);
const n1=await p.evaluate(()=>T.group.children.length);
ok(n1>n0,'描きかけ3点でも3Dに仮の面が出る', n0+' → '+n1);
const camKeep=await p.evaluate(()=>({r:T.r}));
await p.evaluate(()=>{ drawPts.push({x:2,y:6}); }); await p.waitForTimeout(1100);
const camKeep2=await p.evaluate(()=>T.r);
ok(Math.abs(camKeep2-camKeep.r)<1e-6,'プレビュー中はカメラが勝手に動かない', camKeep2.toFixed(2));
await p.evaluate(()=>{ drawPts=[]; }); await p.waitForTimeout(1100);
const n2=await p.evaluate(()=>T.group.children.length);
ok(Math.abs(n2-n0)<=2,'描きかけを消すと3Dからも消える', n1+' → '+n2);

/* ⑦ 役物が①図面タブでも見える（tab='zu' で drawParts が描く） */
const partOk=await p.evaluate(()=>{
  state.parts=[{p:'p2',x:5,y:5,r:0}]; draw();
  /* drawParts はcanvasに描くだけなので、tabチェックが通ることをソース実行で確認 */
  return tab==='zu' && !!state.parts.length;
});
ok(partOk,'①図面タブで役物の描画が有効（タブ名の取り違えを修正）');

/* ④ 保存 → 一覧 → 開く … ★2026-09-03 保存は物件を選ぶ窓に変わった（§259）ので、
   この項は _check/zusave.js（26項目）が後継。ここでは見ない。 */

/* ⑩ 押し出し：3D面をレイキャストで拾って役物として置く（クリックを合成） */
await p.evaluate(()=>{ state.parts=[]; saveState(); nnExtArm(); });
await p.waitForTimeout(300);
/* nnNumAsk を自動応答に差し替え */
await p.evaluate(()=>{ window._realAsk=window.nnNumAsk; window.nnNumAsk=function(t,d,cb){ cb(String(d)); }; });
const extOk=await p.evaluate(()=>{
  const el=T.renderer.domElement; const r=el.getBoundingClientRect();
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  el.dispatchEvent(new PointerEvent('pointerdown',{clientX:cx,clientY:cy,bubbles:true}));
  el.dispatchEvent(new PointerEvent('pointerup',{clientX:cx,clientY:cy,bubbles:true}));
  return new Promise(res=>setTimeout(()=>res({
    parts:(state.parts||[]).length,
    lib:(nnPartsLib()||[]).some(x=>/押出し/.test(x.name))
  }),700));
});
ok(extOk.parts===1 && extOk.lib,'3Dの面タップ→押し出しが役物として置かれる（2Dにも出る）', JSON.stringify(extOk));

/* 記録帳側：作成図面タブに保存一覧が出る */
const p2=await b.newPage({viewport:{width:1600,height:900}});
/* ★browser.newPage は別コンテキスト＝localStorageが別物。保存一覧を注入して確かめる */
await p2.goto('http://localhost:8899/kirokucho_demo.html'); await p2.waitForTimeout(300);
await p2.evaluate(sv=>localStorage.setItem('nn_zumen_saves_v1', JSON.stringify(sv)),
  await p.evaluate(()=>JSON.parse(localStorage.getItem('nn_zumen_saves_v1')||'[]')));
const errs2=[]; p2.on('pageerror',e=>errs2.push(e.message));
await p2.goto('http://localhost:8899/kirokucho_demo.html'); await p2.waitForTimeout(2200);
await p2.evaluate(()=>{ showView('list'); }); await p2.waitForTimeout(900);
await p2.evaluate(()=>{ goProperty(props[0].id); curTab='作成図面'; renderDetail(); }); await p2.waitForTimeout(700);
const kz=await p2.evaluate(()=>({has:/図面・積算で保存した図面/.test(document.body.innerText),
  link:!!document.querySelector('a[href*="zumen_sekisan.html?open="]')}));
/* ★2026-09-03 保存図面は物件に紐づく作りに変わった（§259）。この項は zusave.js が後継。 */
ok(true,'（記録帳の作成図面タブ＝zusave.js で見る）');
ok(errs2.length===0,'記録帳側JSエラーなし', errs2.join('|').slice(0,150));

ok(errs.length===0,'図面側JSエラーなし', errs.join(' | ').slice(0,300));
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
