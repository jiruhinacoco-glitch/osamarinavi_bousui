/* ★2026-09-28a ベースプレート＋アンカー部品／立体の材質（§534・本人の写真3枚）
   node _check/bplate.js [zumen_sekisan.html]
   前提： python3 -m http.server 8899 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
try{
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(700);

/* ① 設備の中に入口があり、小窓が開く・自動の数量が合う（検算は自分で計算） */
ok(await p.evaluate(()=>[...document.querySelectorAll('#nnSetsubiMenu button')].some(x=>/ベースプレート/.test(x.textContent))),'⚙設備追加に「ベースプレート」がある');
await p.evaluate(()=>{ try{ nnBplatePanel(); }catch(_){} }); await p.waitForTimeout(200);
ok(await p.evaluate(()=>{const d=document.getElementById('nnBpBox'); return !!d&&d.classList.contains('on');}),'小窓が開く');
const sum=await p.evaluate(()=>{const s=document.querySelector('#nnBpBox .bsum'); return s?s.textContent:'';});
const seal=Math.round((2*(200+200)/1000+4*Math.PI*24/1000)*100)/100, add=Math.round(((2*(400+400)*300+400*400-200*200)/1e6)*100)/100;
ok(sum.includes('シール '+seal+'m')&&sum.includes('増し貼り '+add+'㎡'),'車止め：シール'+seal+'m・増し貼り'+add+'㎡（自動）',sum);

/* ② 置ける（役物として登録され、形の値を持つ） */
await p.evaluate(()=>{ document.querySelector('#nnBpBox [data-a=put]').click(); }); await p.waitForTimeout(200);
await p.evaluate(()=>nnPlaceAtGrid(6,6)); await p.waitForTimeout(300);
const put=await p.evaluate(()=>{ const it=(state.parts||[]).map(x=>nnPartsLib().find(y=>y.id===x.p)).find(P=>P&&P.kind==='bplate'); return it?{bp:!!it.bp,w:it.w,h:it.h,seal:it.sealM}:null; });
ok(put&&put.bp&&put.w===400&&put.h===300+9+900,'図面に置ける（外形400・高さ1209）',put);

/* ③ 3Dで部品の姿になる（台座・プレート・六角ナット4・丸柱） */
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);
const r1=await p.evaluate(()=>{ let hid=0,hex=0,post=0,torus=0,yellow=0;
  T.group.traverse(o=>{ if(o.name==='nnPart'&&o.userData.partIdx!=null&&!o.visible)hid++;
    if(o.isMesh&&o.geometry){ const g=o.geometry, pr=g.parameters||{};
      if(o.userData.partIdx==null) return;
      if(g.type==='CylinderGeometry'&&pr.radialSegments===6)hex++;
      if(g.type==='CylinderGeometry'&&Math.abs(pr.height-0.9)<1e-6)post++;
      if(g.type==='TorusGeometry')torus++;
      if(o.material&&o.material.color&&o.material.color.getHex()===0xf0b400)yellow++; } });
  return {hid,hex,post,torus,yellow}; });
ok(r1.hid>=1,'元の箱は隠れる',r1.hid);
ok(r1.hex===4,'六角ナット4個',r1.hex);
ok(r1.post===1&&r1.yellow>=2,'黄色の丸柱（H900）とプレート',r1);

/* ④ 角柱＋リブ：袋ナット・リブ4枚・角柱 */
await p.evaluate(()=>{ nnBplatePanel(); document.querySelector('#nnBpBox [data-pre=kaku]').click(); document.querySelector('#nnBpBox [data-a=put]').click(); nnPlaceAtGrid(10,6); });
await p.waitForTimeout(2500);
const r2=await p.evaluate(()=>{ let dome=0,rib=0; T.group.traverse(o=>{ if(o.isMesh&&o.geometry){
  if(o.userData.partIdx==null) return; if(o.geometry.type==='SphereGeometry')dome++; if(o.geometry.type==='ExtrudeGeometry'&&o.userData.partIdx!=null)rib++; } }); return {dome,rib}; });
ok(r2.dome===4&&r2.rib===4,'角柱＋リブ：袋ナット4・リブ4枚',r2);

/* ⑤ 登録を直すと置いた分も変わる（高さ900→1500） */
const e5=await p.evaluate(()=>{ const P=nnPartsLib().find(x=>x.kind==='bplate'&&x.bp&&x.bp.post==='round');
  nnBplatePanel(P.id); const i=document.querySelector('#nnBpBox input[data-k=ph]'); i.value='1500'; i.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('#nnBpBox [data-a=save]').click(); return {h:P.h, ph:P.bp.ph}; });
await p.waitForTimeout(2500);
const post15=await p.evaluate(()=>{ let n=0; T.group.traverse(o=>{ if(o.isMesh&&o.userData.partIdx!=null&&o.geometry&&o.geometry.type==='CylinderGeometry'&&Math.abs((o.geometry.parameters||{}).height-1.5)<1e-6)n++; }); return n; });
ok(e5.h===300+9+1500&&e5.ph===1500&&post15===1,'形を直すと登録と3Dが変わる',{e5,post15});

/* ⑥ 3Dで組んだ立体に材質を選べる（保存・再読み込み後も残る） */
await p.evaluate(()=>{ state.d3sol=[{p:[0,9.2,0],n:[0,1,0],u:[1,0,0],v:[0,0,-1],a:[0,0],b:[0.4,0.4],d:0.3,mode:'out',shape:'box'}]; saveState(); nnSolSelect(0); });
await p.waitForTimeout(300);
const n6=await p.evaluate(()=>document.querySelectorAll('#nnD3Card .nnSolMats button').length);
ok(n6===9,'選択カードに材質9種',n6);
await p.evaluate(()=>{ [...document.querySelectorAll('#nnD3Card .nnSolMats button')].find(x=>x.dataset.m==='yellow').click(); });
await p.waitForTimeout(300);
const c6=await p.evaluate(()=>{ let c=null; T.scene.traverse(o=>{ if(o.isMesh&&o.userData.solIdx===0&&o.geometry&&o.geometry.type==='BoxGeometry'&&o.material&&o.material.color)c=o.material.color.getHex(); }); return {mat:state.d3sol[0].mat,c}; });
ok(c6.mat==='yellow'&&c6.c===0xf0b400,'黄を押すと立体が黄色になる',c6);
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1500);
ok(await p.evaluate(()=>((state.d3sol||[])[0]||{}).mat==='yellow'),'再読み込みしても材質が残る');
ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
}catch(e){ ok(false,'途中で止まった（機能が無い）',String(e.message).slice(0,120)); }
console.log('★NG',ng); await b.close();
})();
