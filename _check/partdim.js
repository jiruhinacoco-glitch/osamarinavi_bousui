/* 役物の寸法を数値で変える（§308）
   本人の指摘「役物関連を設置しても、面を伸ばしたり短くしたりできない」
   使い方： node _check/partdim.js ／ スマホ： node _check/partdim.js ph */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(PH?{viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                          :{viewport:{width:1400,height:900}});
if(PH) await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/zumen_sekisan.html');
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(800);
await p.evaluate(()=>{
  state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
    edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}];
  saveState(); setTab('zu');
});
await p.waitForTimeout(900);
/* 配管引込みを置いて選ぶ */
await p.evaluate(()=>{ nnStamp('hikomi',1); nnPlaceAtGrid(10,8); setTool('sel'); nnPartSelect(0); });
await p.waitForTimeout(500);
const bar=await p.evaluate(()=>{ const b=document.getElementById('nnPartBar');
  return b?{on:b.classList.contains('on'), keys:[].map.call(b.querySelectorAll('button'),x=>x.dataset.b)}:null; });
ok(bar&&bar.on, '① 役物を選ぶとバーが出る');
ok(bar&&bar.keys.indexOf('dim')>=0, '① バーに「✎ 寸法」がある', bar&&bar.keys);

/* 寸法を入れる（nnNumAsk を横取りして順に答える） */
const r=await p.evaluate(()=>new Promise(res=>{
  const ans=['500','400','1200']; let i=0;
  const _a=window.nnNumAsk;
  window.nnNumAsk=function(t,v,fn){ setTimeout(()=>fn(ans[i++]),0); };
  document.querySelector('#nnPartBar button[data-b="dim"]').click();
  setTimeout(()=>{ window.nnNumAsk=_a;
    res({sz:(state.parts[0]||{}).sz||null}); }, 400);
}));
ok(r.sz && r.sz.w===500 && r.sz.d===400 && r.sz.h===1200, '② 入れた寸法がその1個に入る', r.sz);

/* 3D の箱がその寸法になる */
await p.evaluate(()=>{ setTab('d3'); });
await p.waitForTimeout(2200);
const box=await p.evaluate(()=>{
  let m=null; T.group.traverse(o=>{ if(o.userData&&o.userData.partIdx===0&&o.geometry&&!m) m=o; });
  if(!m) return null; m.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(m), s=bb.getSize(new THREE.Vector3());
  return [Math.round(s.x*1000), Math.round(s.y*1000), Math.round(s.z*1000)];
});
ok(box && box.indexOf(1200)>=0 && box.indexOf(500)>=0 && box.indexOf(400)>=0,
   '② 3Dの立体もその寸法になる（mm）', box);

/* 開き直しても残る */
await p.evaluate(()=>saveState());
await p.reload(); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(1500);
const kept=await p.evaluate(()=>(state.parts[0]||{}).sz||null);
ok(kept && kept.h===1200, '③ 開き直しても残る', kept);

/* 別の1個を置いても、そちらは既定のまま */
await p.evaluate(()=>{ setTab('zu'); nnStamp('hikomi',1); nnPlaceAtGrid(14,8); setTool('sel'); });
await p.waitForTimeout(500);
const two=await p.evaluate(()=>({n:(state.parts||[]).length, a:(state.parts[0]||{}).sz||null, b:(state.parts[1]||{}).sz||null}));
ok(two.n===2 && two.a && two.a.h===1200 && !two.b, '③ 変えたのはその1個だけ（登録そのものは変えない）', two);

ok(errs.length===0, 'JSエラーなし', errs);
console.log(ng?('★NG '+ng+'件'):'すべて○');
await b.close();
process.exit(ng?1:0);
})();
