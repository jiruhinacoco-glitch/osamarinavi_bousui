/* ★2026-08-23c ゼロから役物を組んで登録する（円柱・寸法入力・移動・📦登録）（§155）
   node _check/custompart.js
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
const CAM=`(()=>({th:+T.theta.toFixed(4),ph:+T.phi.toFixed(4),r:+T.r.toFixed(3),tx:+T.tx.toFixed(3),tz:+T.tz.toFixed(3)}))()`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const SCR=`(wx,wy,wz)=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=new THREE.Vector3(wx,wy,wz).project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
}`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage();
p.on('dialog',d=>d.accept(d.type()==='prompt'?'テスト小屋':undefined));
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const clickBtn=async(txt)=>{ await p.evaluate(t=>{
  const bts=[...document.querySelectorAll('#nnD3Card button')];
  const x=bts.find(b=>b.textContent.includes(t)); if(x)x.click(); }, txt); };
const pad=async(v)=>{ await p.waitForTimeout(350);
  await p.evaluate(val=>{ const w=document.querySelector('#nnNumDlg input');
    if(w){ w.value=val; document.querySelector('#nnNumDlg .okb').click(); } }, String(v));
  await p.waitForTimeout(350); };

await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(700);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);
await p.evaluate(()=>d3ViewIso()); await p.waitForTimeout(900);
const cam0=await p.evaluate(CAM);

/* ① 長方形をかく → カードに ⚪円柱・✎寸法 のボタンがある */
await p.evaluate(()=>setTool('draw')); await p.waitForTimeout(300);
const c1=await p.evaluate(`(${SCR})(2.0, 0.35, 2.0)`);
const c2=await p.evaluate(`(${SCR})(2.8, 0.35, 2.6)`);
await p.mouse.click(c1.x,c1.y); await p.waitForTimeout(350);
await p.mouse.click(c2.x,c2.y); await p.waitForTimeout(350);
const btns=await p.evaluate(()=>[...document.querySelectorAll('#nnD3Card button')].map(b=>b.textContent));
ok(btns.some(t=>t.includes('円柱')),'カードに「⚪ 円柱」がある',btns);
ok(btns.some(t=>t.includes('寸法')),'カードに「✎ 寸法」がある');

/* ② ✎寸法：採寸した数字をそのまま入れる（600×400） */
await clickBtn('寸法'); await pad(600); await pad(400);
const tt1=await p.evaluate(()=>document.querySelector('#nnD3Card .tt').textContent);
ok(/0\.60 × 0\.40/.test(tt1),'寸法の数値入力で 600×400 になる',tt1);

/* ③ ⚪円柱で押し出す（長さ500） */
await clickBtn('円柱'); await pad(500);
const s1=await p.evaluate(()=>{const a=state.d3sol||[]; return a.length?a[0]:null;});
ok(!!s1 && s1.shape==='cyl','円柱の立体ができる（shape=cyl）',s1&&s1.shape);
ok(!!s1 && Math.abs(s1.d-0.5)<1e-6,'円柱の長さ500mmが入る',s1&&s1.d);
ok(!!s1 && Math.abs(Math.abs(s1.b[0]-s1.a[0])-0.6)<1e-6 && Math.abs(Math.abs(s1.b[1]-s1.a[1])-0.4)<1e-6,
   '円柱の断面はかいた長方形どおり（0.6×0.4）');
ok(await p.evaluate(()=>{let n=0; T.scene.traverse(o=>{ if(o.userData&&o.userData.solIdx!=null
   &&o.geometry&&o.geometry.type==='CylinderGeometry')n++; }); return n>=1;}),'3Dに円柱の絵が出る');

/* ④ 箱ももう1つ（押出し300） */
const c3=await p.evaluate(`(${SCR})(4.2, 0.35, 2.0)`);
const c4=await p.evaluate(`(${SCR})(5.0, 0.35, 2.8)`);
await p.mouse.click(c3.x,c3.y); await p.waitForTimeout(300);
await p.mouse.click(c4.x,c4.y); await p.waitForTimeout(300);
await clickBtn('押出し'); await pad(300);
ok(await p.evaluate(()=>(state.d3sol||[]).length)===2,'箱も足せる（計2件）');

/* ⑤ 選択 → ✥移動：タップした場所へ動く（大きさは変わらない） */
await p.evaluate(()=>setTool('sel')); await p.waitForTimeout(300);
const s0pt=await p.evaluate(()=>{
  const it=state.d3sol[1];
  const u=new THREE.Vector3().fromArray(it.u), v=new THREE.Vector3().fromArray(it.v),
        n=new THREE.Vector3().fromArray(it.n), p0=new THREE.Vector3().fromArray(it.p);
  const c=new THREE.Vector3().copy(p0)
    .addScaledVector(u,(it.a[0]+it.b[0])/2).addScaledVector(v,(it.a[1]+it.b[1])/2)
    .addScaledVector(n,it.d+0.001);
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=c.project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
});
await p.mouse.click(s0pt.x,s0pt.y); await p.waitForTimeout(400);
ok(await p.evaluate(()=>nnSolSelIdx())===1,'選択ツールで選べる');
const btns2=await p.evaluate(()=>[...document.querySelectorAll('#nnD3Card button')].map(b=>b.textContent));
ok(btns2.some(t=>t.includes('移動'))&&btns2.some(t=>t.includes('寸法')),'カードに ✥移動・✎寸法 がある',btns2);
const dim0=await p.evaluate(()=>{const it=state.d3sol[1];
  return {w:+Math.abs(it.b[0]-it.a[0]).toFixed(3), h:+Math.abs(it.b[1]-it.a[1]).toFixed(3),
          c:[+((it.a[0]+it.b[0])/2).toFixed(2), +((it.a[1]+it.b[1])/2).toFixed(2)]};});
await clickBtn('移動'); await p.waitForTimeout(250);
const mv=await p.evaluate(`(${SCR})(6.4, 0.35, 4.4)`);
await p.mouse.click(mv.x,mv.y); await p.waitForTimeout(450);
const dim1=await p.evaluate(()=>{const it=state.d3sol[1];
  return {w:+Math.abs(it.b[0]-it.a[0]).toFixed(3), h:+Math.abs(it.b[1]-it.a[1]).toFixed(3),
          c:[+((it.a[0]+it.b[0])/2).toFixed(2), +((it.a[1]+it.b[1])/2).toFixed(2)]};});
ok(dim1.w===dim0.w && dim1.h===dim0.h,'移動しても大きさは変わらない',{mae:dim0,ato:dim1});
ok(dim1.c[0]!==dim0.c[0]||dim1.c[1]!==dim0.c[1],'中心がタップした場所へ動く',dim1.c);

/* ⑥ ✎寸法（できた立体を後から直す：700×350×D450） */
await clickBtn('寸法'); await pad(700); await pad(350); await pad(450);
const s2=await p.evaluate(()=>{const it=state.d3sol[1];
  return {w:+Math.abs(it.b[0]-it.a[0]).toFixed(3), h:+Math.abs(it.b[1]-it.a[1]).toFixed(3), d:it.d};});
ok(s2.w===0.7&&s2.h===0.35&&Math.abs(s2.d-0.45)<1e-6,'立体の寸法を後から数字で直せる',s2);

/* ⑦ 📦 役物に登録（confirm→名前→単価12000） */
ok(await p.evaluate(()=>{const b=document.getElementById('nnSolReg');
  return !!(b&&b.style.display==='block');}),'「📦 役物に登録」ボタンが出ている');
await p.evaluate(()=>nnSolRegister()); await pad(12000);
await p.waitForTimeout(900);
const reg=await p.evaluate(()=>{
  const it=(window.nnPartsLib?nnPartsLib():[]).find(x=>x.kind==='custom');
  return it?{name:it.name, w:it.w, d:it.d, h:it.h, price:it.price,
             sols:(it.custom&&it.custom.sols||[]).length}:null;});
ok(!!reg,'役物ライブラリに custom として登録される',reg);
ok(reg && reg.name==='テスト小屋','名前が入る');
ok(reg && reg.sols===2,'形（立体2件）がまるごと保存される');
ok(reg && reg.w>=500 && reg.h>=200 && reg.price===12000,'外接寸法と単価が入る',reg&&[reg.w,reg.d,reg.h]);
ok(await p.evaluate(()=>(state.d3sol||[]).length)===0,'立体は役物に置き換わる（d3solは空）');
ok(await p.evaluate(()=>(state.parts||[]).some(x=>String(x.p).startsWith('c'))),'同じ場所に1個置かれる');

/* ⑧ 3Dで custom の姿に組み上がる（箱は隠れ、円柱を含む形が出る） */
await p.waitForTimeout(800);
const view=await p.evaluate(()=>{
  let hidden=0, cyl=0, meshes=0;
  T.group.traverse(o=>{
    if(o.name==='nnPart'&&o.visible===false)hidden++;
    if(o.isMesh&&o.userData&&o.userData.partIdx!=null&&o.visible!==false){
      meshes++;
      if(o.geometry&&o.geometry.type==='CylinderGeometry')cyl++;
    }
  });
  return {hidden,cyl,meshes};
});
ok(view.hidden>=1,'ただの箱は隠れる',view);
ok(view.cyl>=1&&view.meshes>=2,'登録した形（円柱＋箱）がそのまま3Dに出る');

/* ⑨ 3Dでタップすると役物として選べる（回す・複製・削除のバー） */
const partPt=await p.evaluate(()=>{
  let m=null; T.group.traverse(o=>{ if(!m&&o.isMesh&&o.userData&&o.userData.partIdx!=null&&o.visible!==false)m=o; });
  if(!m)return null;
  m.updateMatrixWorld(true);
  const c=new THREE.Vector3().setFromMatrixPosition(m.matrixWorld);
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=c.project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
});
if(partPt){ await p.mouse.click(partPt.x,partPt.y); await p.waitForTimeout(400); }
ok(await p.evaluate(()=>window.nnPartSelIdx?nnPartSelIdx():-1)>=0,'タップで役物として選べる');
await p.evaluate(()=>{ if(window.nnPartSelect)nnPartSelect(-1); });

/* ⑩ 積算に乗る */
await p.evaluate(()=>recalc()); await p.waitForTimeout(400);
const qt=await p.evaluate(()=>{const d=document.getElementById('nnPartsQt'); return d?d.textContent:'';});
ok(/テスト小屋/.test(qt)&&/12,000/.test(qt),'積算（役物・架台の表）に乗る');
ok(same(await p.evaluate(CAM),cam0),'ここまでの操作でカメラは動かない（§152）');

/* ⑪ 再読み込みしても、登録も置いた1個も残る */
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1200);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
ok(await p.evaluate(()=>!!((window.nnPartsLib?nnPartsLib():[]).find(x=>x.kind==='custom'))),
   '再読み込みしても登録が残る');
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);
const view2=await p.evaluate(()=>{
  let cyl=0; T.group.traverse(o=>{ if(o.isMesh&&o.userData&&o.userData.partIdx!=null
    &&o.geometry&&o.geometry.type==='CylinderGeometry')cyl++; });
  return cyl;
});
ok(view2>=1,'再読み込み後も3Dに同じ姿で出る',view2);

/* ⑫ 2D（①図面タブ）は箱で出る＝今までどおり */
await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(500);
ok(await p.evaluate(()=>(state.parts||[]).length>=1&&tab==='zu'),'①図面タブに戻れて役物が残っている');
ok(errs.length===0,'JSエラーなし  '+errs.slice(0,3).join(' / '));
await p.screenshot({path:'/tmp/custompart.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
