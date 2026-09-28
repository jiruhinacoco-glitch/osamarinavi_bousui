/* ★2026-09-28e 荷揚げの作り込み（§538）：ラベル・芯・ラップ・すのこパレット／数が多いと細部を省く／
   Blender のモデル（models/nz_*.glb）があれば差し替わる。
   node _check/nizumi2.js [zumen_sekisan.html]   前提： python3 -m http.server 8899 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'), path=require('path');
const F=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
async function open(b,glb){
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); p.on('dialog',d=>d.accept());
  p._errs=[]; p.on('pageerror',e=>p._errs.push(e.message));
  if(glb) await p.route('**/models/nz_can.glb', r=>r.fulfill({status:200, contentType:'model/gltf-binary', body:fs.readFileSync(path.join(__dirname,'assets/testcube.glb'))}));
  await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ ['nn_specs_v1','nn_materials_v1','nn_matqty_mode','nn_matqty_pos'].forEach(k=>localStorage.removeItem(k)); try{nnZMenuClose();}catch(_){}});
  return p;
}
async function roof(p,W,D){ await p.evaluate(([W,D])=>{ state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[]; state.d3sheet=[]; state.specCode='AS-T1';
  const pts=[{x:0,y:0},{x:W,y:0},{x:W,y:D},{x:0,y:D}];
  state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); saveState(); recalc(); draw(); },[W,D]);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ document.querySelector('#nnMatQty [data-a=niz]').click(); nnPlaceAtGrid(3,3); });
  await p.waitForFunction(()=>{ let n=0; T.group.traverse(o=>{ if(o.userData.partIdx!=null&&o.userData.nzItem) n++; }); return n>0; },null,{timeout:20000}).catch(()=>{});
  await p.waitForTimeout(500); }
const look=p=>p.evaluate(()=>{ const r={roll:0,can:0,label:0,core:0,wrap:0,slat:0,glbCan:0,extrude:0};
  T.group.traverse(o=>{ if(o.userData.partIdx==null) return; const k=o.userData.nzItem; if(k) r[k]=(r[k]||0)+1;
    if(!o.isMesh) return; const g=o.geometry, pr=(g&&g.parameters)||{}, mats=Array.isArray(o.material)?o.material:[o.material];
    if(g&&g.type==='PlaneGeometry'&&mats[0]&&mats[0].map&&!mats[0].transparent) r.label++;
    if(g&&g.type==='CylinderGeometry'&&pr.openEnded&&Math.abs(pr.radiusTop-0.041)<1e-6) r.core++;
    if(mats[0]&&mats[0].transparent&&mats[0].opacity<0.3&&g&&g.type==='BoxGeometry') r.wrap++;
    if(g&&g.type==='BoxGeometry'&&Math.abs(pr.height-0.022)<1e-6) r.slat++;
    if(g&&g.type==='ExtrudeGeometry') r.extrude++; });
  T.group.traverse(o=>{ if(o.userData.partIdx!=null&&o.userData.nzItem==='can'&&!o.isMesh) r.glbCan++; });
  return r; });
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
/* ① 10×8m：作り込みの細部が出る */
let p=await open(b,false); await roof(p,10,8);
let r=await look(p); const E=await p.evaluate(()=>{ const d=nnEstimateData(); return d.hira+d.tachi+d.tenba; });
const cans=Math.ceil(E*0.2/17)+Math.ceil(E*0.5/18), rolls=Math.ceil(E*1.1/8)*2;
ok(r.can===cans&&r.roll===rolls,'数は今までどおり（缶'+cans+'・ロール'+rolls+'）',r);
ok(r.label===cans*2,'一斗缶の正面と背面にラベル（'+cans*2+'枚）',r.label);
ok(r.core===rolls,'ロールに芯が付く（'+rolls+'本）',r.core);
ok(r.wrap===2,'ロールの山2つに透明ラップ',r.wrap);
ok(r.slat>=4*4,'パレットはすのこ板',r.slat);
ok(r.extrude>=cans,'一斗缶は角の丸い缶（押し出しの形）',r.extrude);
ok(await p.evaluate(()=>{ let n=0; const seen=new Set(); T.group.traverse(o=>{ if(o.userData.partIdx!=null&&o.userData.nzItem==='roll'&&o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>seen.add(m)); } }); return seen.size<=6; }),'ロールの材質は使い回し（材料ごと・胴と端面で6つ以内）');
ok(p._errs.length===0,'JSエラーなし（ふつう）',p._errs.slice(0,2));
await p.context().close();
/* ② とても大きい屋根（合計160個超）：細部を省く＝ラベル・芯・ラップが出ない、1種類120個まで */
p=await open(b,false); await roof(p,40,30);
r=await look(p);
ok(r.roll===240&&r.label===0&&r.core===0&&r.wrap===0,'数が多いときは細部を省く（ロール120本×2・ラベル／芯／ラップなし）',r);
await p.context().close();
/* ③ Blender のモデル（nz_can.glb）があれば一斗缶が差し替わる */
p=await open(b,true); await roof(p,10,8);
await p.waitForFunction(()=>{ let n=0; T.group.traverse(o=>{ if(o.userData.partIdx!=null&&o.userData.nzItem==='can'&&!o.isMesh) n++; }); return n>0; },null,{timeout:15000}).catch(()=>{});
r=await look(p);
ok(r.glbCan===cans&&r.label===0,'models/nz_can.glb を置くと一斗缶がBlenderのモデルになる（'+cans+'個・ラベルの板は出ない）',r);
ok(r.roll===rolls&&r.core===rolls,'ほかの荷姿（ロール）は今までどおり',r);
ok(p._errs.length===0,'JSエラーなし（差し替え）',p._errs.slice(0,2));
await p.context().close();
}catch(e){ ok(false,'途中で止まった（機能が無い）',String(e.message).slice(0,120)); }
console.log('★NG',ng); await b.close();
})();
