/* ③断面で描いたあと ④3D を押したら立体が出るか（2026-08-19i） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500);
await p.evaluate(()=>{ try{localStorage.removeItem('nn_zumen_v1');}catch(_){} });
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1800);

/* ① 何も無いときは ④3D に理由が出る */
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3500);
const e1=await p.evaluate(()=>{const d=document.getElementById('d3empty');
  return d?{show:getComputedStyle(d).display!=='none', t:d.textContent.slice(0,24)}:null;});
ok(e1&&e1.show,'何も描いていないときは理由が出る',e1);

/* ② 断面だけ描いて ④3D → 立体が出る */
await p.evaluate(()=>{
  state.sect={cell:0.1, closed:true, depth:2, wp:[0,1,2],
    pts:[{x:0,y:0},{x:0.9,y:0},{x:0.9,y:0.3},{x:1.15,y:0.3},{x:1.15,y:-0.15},{x:0,y:-0.15}]};
  saveState(); setTab('sec');
}); await p.waitForTimeout(900);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);
const r2=await p.evaluate(()=>{
  let n=0; try{ T.group.traverse(o=>{ if(o.isMesh) n++; }); }catch(_){}
  const d=document.getElementById('d3empty');
  return {mesh:n, mode:window.nnSectIs3D?nnSectIs3D():null, empty:d?getComputedStyle(d).display!=='none':null};
});
ok(r2.mesh>=1,'③断面だけでも ④3D で立体が出る',r2);
ok(r2.mode===true,'断面3Dモードに入る');
ok(r2.empty===false,'理由の表示は消える');

/* ③ 部位があるときは今までどおり図面の3D */
await p.evaluate(()=>{ setTab('zu'); const x=document.getElementById('tl_sample'); if(x)x.click(); }); await p.waitForTimeout(1000);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);
const r3=await p.evaluate(()=>({mode:nnSectIs3D(), polys:state.polys.length,
  mesh:(()=>{let n=0;try{T.group.traverse(o=>{if(o.isMesh)n++;});}catch(_){}return n;})()}));
ok(r3.mode===false&&r3.polys>0&&r3.mesh>3,'部位があるときは今までどおり図面の3D',r3);
ok(errs.length===0,'JSエラーなし',errs);
await b.close(); process.exit(ng?1:0);
})();
