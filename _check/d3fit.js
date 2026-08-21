/* ★2026-08-21a 3Dの「全体表示」が画面からはみ出さないか（§149）
   使い方： node _check/d3fit.js            （よこ／たて／PC の3通り）
   前提： python3 -m http.server 8899 --directory <このフォルダ> を立てておく
   見ているもの：立体の隅8点を実際に画面へ投影し、キャンバスの外に出ていないか。
   ★目安の式（大きさ×1.5）では画角も縦横比もツールバーの厚みも見ていないので
     よこ向きで下が切れていた。ここでは実測で確かめる。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const URL='http://localhost:8899/zumen_sekisan.html';
let ng=0;
const ok=(c,m)=>{ console.log((c?'  ○ ':'  ★NG ')+m); if(!c)ng++; };

const MEASURE=()=>{
  if(typeof T==='undefined'||!T||!T.renderer) return {err:'noT'};
  const el=T.renderer.domElement, W=el.clientWidth, H=el.clientHeight;
  const box=new THREE.Box3().setFromObject(T.group);
  if(box.isEmpty()) return {err:'empty'};
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(let i=0;i<8;i++){
    const v=new THREE.Vector3((i&1)?box.max.x:box.min.x,(i&2)?box.max.y:box.min.y,(i&4)?box.max.z:box.min.z);
    const q=v.project(T.camera);
    const sx=(q.x*0.5+0.5)*W, sy=(-q.y*0.5+0.5)*H;
    x0=Math.min(x0,sx);x1=Math.max(x1,sx);y0=Math.min(y0,sy);y1=Math.max(y1,sy);
  }
  const tb=document.getElementById('toolbar'), cr=el.getBoundingClientRect();
  const tbB=(tb&&getComputedStyle(tb).display!=='none')?(tb.getBoundingClientRect().bottom-cr.top):0;
  return {W,H,r:+T.r.toFixed(1),
    over:{left:Math.round(Math.max(0,-x0)),right:Math.round(Math.max(0,x1-W)),
          top:Math.round(Math.max(0,-y0)),bottom:Math.round(Math.max(0,y1-H))},
    fill:+(((x1-x0)*(y1-y0))/(W*H)).toFixed(3),
    underBar:Math.round(Math.max(0,tbB-y0))};
};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [nm,vp] of [['よこ',{width:852,height:393}],['たて',{width:393,height:852}],['PC',{width:1600,height:900}]]){
  console.log('\n== '+nm+' ==');
  const mob=nm!=='PC';
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:mob?2:1,isMobile:mob,hasTouch:mob});
  if(mob) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});
                                       Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1400);
  await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
  await p.waitForTimeout(700);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4000);

  const a=await p.evaluate(MEASURE);
  ok(!a.err,'3Dが立ち上がる '+JSON.stringify(a.err||''));
  if(!a.err){
    ok(a.over.bottom===0,'下がはみ出さない ('+a.over.bottom+'px)');
    ok(a.over.top===0,  '上がはみ出さない ('+a.over.top+'px)');
    ok(a.over.left===0&&a.over.right===0,'左右がはみ出さない ('+a.over.left+'/'+a.over.right+')');
    ok(a.underBar<=2,'ツールバーの下に来ている ('+a.underBar+'px)');
    ok(a.fill>=0.05,'小さすぎない（画面の'+Math.round(a.fill*100)+'%）');
  }
  /* 視点ボタン（図面と同じ／斜めから）でもはみ出さない */
  for(const [bn,fn] of [['図面と同じ','d3ViewPlan'],['斜めから','d3ViewIso']]){
    await p.evaluate(f=>window[f](),fn); await p.waitForTimeout(900);
    const m=await p.evaluate(MEASURE);
    ok(!m.err && m.over.top===0&&m.over.bottom===0&&m.over.left===0&&m.over.right===0,
       bn+'でもはみ出さない '+JSON.stringify(m.over||m.err));
  }
  /* ＋ボタンで寄れる（合わせ直しが手動操作を邪魔しない） */
  /* ★＋−は §39 で「タップと長押し」に作り替えたので inline onclick が無い。
     el.click() では動かない。本物のマウス／指で押すこと。 */
  const before=await p.evaluate(()=>+T.r.toFixed(2));
  await p.click('#d3_zin'); await p.waitForTimeout(400);
  const after=await p.evaluate(()=>+T.r.toFixed(2));
  ok(after<before,'＋ボタンで寄れる ('+before+'→'+after+')');
  ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
  await ctx.close();
}
await b.close();
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
process.exit(ng?1:0);
})();
