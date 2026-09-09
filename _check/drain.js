/* ★2026-09-09v ドレン本体（穴の径 50/75/100/125/150/175/200φ）
   node _check/drain.js
   前提： python3 -m http.server 8899 --directory <このフォルダ>

   ★測り方（現実と同じか、を見る）
   3Dの姿の中の数字を読むのではなく、**上から光線を落として「板があるか無いか」**で
   穴のふちを探す（人が上からのぞいて見るのと同じ）。つばの上面に当たる高さを先に
   実測しておき、その高さに当たらなくなった所を穴のふちとする。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1400,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(700);

/* ① 穴の径の一覧がある */
const PHI=await p.evaluate(()=>window.NN_DRAIN_PHI||null);
ok(Array.isArray(PHI) && PHI.join(',')==='50,75,100,125,150,175,200',
   '穴の径 50/75/100/125/150/175/200φ がそろっている',PHI);

/* ② 小窓（◆タテドレン）を押すと、7つの径のボタンが出る */
await p.evaluate(()=>{ try{ setTab('zu'); document.getElementById('tl_p_tatedrain').click(); }catch(_){} });
await p.waitForTimeout(300);
const btn=await p.evaluate(()=>{
  const d=document.getElementById('nnDrnBox');
  if(!d||!d.classList.contains('on'))return null;
  return [...d.querySelectorAll('.sgrid button')].map(x=>x.id);
});
ok(btn && btn.length===7 && btn[0]==='tl_p_tatedrain50' && btn[6]==='tl_p_tatedrain200',
   '◆タテドレンで7つの径がえらべる',btn);
await p.evaluate(()=>{ try{ document.getElementById('tl_p_yokodrain').click(); }catch(_){} });
await p.waitForTimeout(300);
ok(await p.evaluate(()=>{ const d=document.getElementById('nnDrnBox');
   return !!d && d.classList.contains('on') &&
     [...d.querySelectorAll('.sgrid button')].map(x=>x.id).join(',')
       ==='tl_p_yokodrain50,tl_p_yokodrain75,tl_p_yokodrain100,tl_p_yokodrain125,tl_p_yokodrain150,tl_p_yokodrain175,tl_p_yokodrain200'; }),
   '◆ヨコドレンでも7つの径がえらべる');
await p.evaluate(()=>{ try{ nnDrainClose(); }catch(_){ const o=document.getElementById('nnDrnBox'); if(o)o.classList.remove('on'); } });

/* ③ 名前から穴の径を読む口（ここが唯一の読み取り口） */
const rd=await p.evaluate(()=>{ try{ return [nnDrainPhiMM('たて型ドレン 50φ'), nnDrainPhiMM('よこ型ドレン 200φ'),
    nnDrainPhiMM('たて型ドレン 125φ'), nnDrainPhiMM('名無し')]; }catch(e){ return [String(e)]; } });
ok(rd[0]===50 && rd[1]===200 && rd[2]===125 && rd[3]===75,'名前の「◯φ」から穴の径を読む',rd);

/* ④ 径ごとに置いて、3Dの穴を上からの光線で実測する */
async function measure(key, phi){
  await p.evaluate(()=>{ setTab('zu'); nnPartsClear(); });
  const put=await p.evaluate(k=>{ try{ nnStamp(k); nnPlaceAtGrid(6,6); }catch(e){ return String(e); }
    return (state.parts||[]).length?'':'置けなかった'; }, key);
  if(put) return {err:key+'：'+put};
  await p.waitForTimeout(250);
  await p.evaluate(()=>{ setTab('d3'); try{ dirty3d=true; build3D(); }catch(_){} });
  await p.waitForTimeout(1400);
  return await p.evaluate(()=>{
    T.scene.updateMatrixWorld(true);
    const it=(state.parts||[]).slice(-1)[0];
    if(!it) return {err:'置けていない'};
    const P=nnPartsLib().find(x=>x.id===it.p);
    if(!P) return {err:'登録が見つからない'};
    const s=state.scaleM, cx=it.x*s, cz=it.y*s, W=(+P.w||300)/1000;
    const rc=new THREE.Raycaster(), down=new THREE.Vector3(0,-1,0);
    /* ★見えるものだけを数える。当たり判定用の箱（nnPart）は見えないので外す
       （three.js の光線は「見えない」ものにも当たるため、ここで外さないと箱を測ってしまう）。 */
    const shoot=(r,th)=>{ rc.set(new THREE.Vector3(cx+r*Math.cos(th), 40, cz+r*Math.sin(th)), down);
      return rc.intersectObject(T.group,true).filter(h=>h.object.name!=='nnPart').map(h=>h.point.y); };
    /* つばの上面の高さを実測（穴のそと・つばの内がわ） */
    const outR=W*0.42, ys=shoot(outR,0);
    if(!ys.length) return {err:'つばに当たらない'};
    const yF=Math.max.apply(null,ys);
    /* ★「板か、かごか」を向きで見わける（現実の見え方）。
       つば＝どの向きから落としても必ず当たる／ストレーナー＝すき間があるので当たらない向きがある。 */
    const solid=r=>{ let n=0; for(let k=0;k<24;k++){
        if(shoot(r, k*Math.PI/12).some(y=>Math.abs(y-yF)<0.0025)) n++; } return n===24; };
    if(solid(0.0005)) return {err:'まん中に板がある（穴があいていない）', yF:yF};
    let lo=0.0005, hi=outR;                 /* lo=穴の中 hi=つばの上 */
    if(!solid(hi)) return {err:'そとがわでつばに当たらない', yF:yF};
    for(let i=0;i<20;i++){ const md=(lo+hi)/2; if(solid(md)) hi=md; else lo=md; }
    return {R:(lo+hi)/2, yF:yF, W:Math.round(W*1000), pw:P.w, ph:P.h, kind:P.kind, nm:P.name};
  });
}
for(const f of [50,75,100,125,150,175,200]){
  const m=await measure('tatedrain'+f, f);
  if(m.err){ ok(false,'たて型 '+f+'φ の穴を測れた',m); continue; }
  const d=Math.round(m.R*2*10000)/10;    /* 実測の穴の径（mm） */
  ok(Math.abs(d-f)<2.0,'たて型 '+f+'φ：上から見た穴が '+f+'mm（実測 '+d+'mm）',
     {d:d, tsuba:m.W, kind:m.kind});
  ok(m.pw===f+250 && m.ph===60,'たて型 '+f+'φ：つば '+(f+250)+'角・高さ60mm',{w:m.pw,h:m.ph});
}

/* ⑤ よこ型：立上りに向く縦の板に穴があく（高さのある姿になる） */
await p.evaluate(()=>{ try{ setTab('zu'); nnPartsClear(); nnStamp('yokodrain150'); nnPlaceAtGrid(6,6); }catch(_){} });
await p.waitForTimeout(250);
await p.evaluate(()=>{ setTab('d3'); try{ dirty3d=true; build3D(); }catch(_){} });
await p.waitForTimeout(1400);
const yk=await p.evaluate(()=>{
  T.scene.updateMatrixWorld(true);
  let n=0, bb=new THREE.Box3(), got=false;
  T.group.traverse(o=>{ if(o.isMesh && o.name!=='nnPart' && o.userData.partIdx!=null){
    n++; const b2=new THREE.Box3().setFromObject(o); if(!got){bb.copy(b2);got=true;} else bb.union(b2); } });
  return {n, h:got?+(bb.max.y-bb.min.y).toFixed(3):0};
});
ok(yk.n>=5 && yk.h>0.12,'よこ型150φ：横引きの姿が出る（高さ'+yk.h+'m）',yk);

/* ⑥ 高さ0で保存されている古いドレンも3Dに出る（つばだけの登録） */
await p.evaluate(()=>{ try{ setTab('zu'); nnPartsClear(); nnStamp('tatedrain100'); nnPlaceAtGrid(6,6);
  const it=(state.parts||[]).slice(-1)[0]; it.sz={w:350,d:350,h:0}; saveState(); }catch(_){} });
await p.waitForTimeout(200);
await p.evaluate(()=>{ setTab('d3'); try{ dirty3d=true; build3D(); }catch(_){} });
await p.waitForTimeout(1400);
const old=await p.evaluate(()=>{
  let rich=0, box=0;
  T.group.traverse(o=>{ if(o.name==='nnPart'&&o.userData.partIdx!=null) box++;
    else if(o.isMesh && o.userData.partIdx!=null) rich++; });
  return {rich, box};
});
ok(old.box>=1 && old.rich>=5,'高さ0で保存された古いドレンも3Dに出る',old);

/* ⑦ 増張りパーツの穴の既定が、置いたドレンの呼び径になる */
const ph2=await p.evaluate(()=>{ try{
  const it=(state.parts||[]).slice(-1)[0], P=nnPartsLib().find(x=>x.id===it.p);
  return nnDrainPhiMM(P.name); }catch(e){ return String(e); } });
ok(ph2===100,'増張りパーツはドレンの呼び径（100φ）を既定にする',ph2);

ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
console.log('\n★NG '+ng+' 件'); await b.close(); process.exit(ng?1:0);
})();
