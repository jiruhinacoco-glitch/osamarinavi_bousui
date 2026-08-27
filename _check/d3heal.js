/* ★2026-08-27a 3Dの全体表示：画面の大きさが変わったら合わせ直す（nnD3FitHeal）の検証
   よこ向きスマホで、全体表示の実測が「画面がまだ正しい大きさになる前」に走ると
   絵が下にはみ出したまま二度と直らなかった（本人の指摘「下の画面だけ見えない」）。
   ・画面の大きさが変わったら（カメラを誰も触っていないときだけ）合わせ直す
   ・使う人がカメラを動かしたあとは絶対に動かさない（§152 の決まりはそのまま）
   使い方: node _check/d3heal.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});
    Object.defineProperty(screen,'height',{get:()=>852});}catch(e){} });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1200);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:40,y:0},{x:40,y:7},{x:0,y:7}],
      edges:[0,1,2,3].map(()=>({h:750,w:250,k:'para'}))}];
    state.active=0; state.scaleM=0.5; saveState(); renderPolyList();
    setTab('d3');
  });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined' && T && T.renderer && T.fitW!=null; }catch(_){ return false; } },null,{timeout:15000});
  await p.waitForTimeout(600);

  const fits=async()=>await p.evaluate(()=>{
    const el=T.renderer.domElement, W=el.clientWidth, H=el.clientHeight;
    const box=new THREE.Box3().setFromObject(T.group);
    const c=T.camera; c.updateMatrixWorld();
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(let i=0;i<8;i++){
      const v=new THREE.Vector3((i&1)?box.max.x:box.min.x,(i&2)?box.max.y:box.min.y,(i&4)?box.max.z:box.min.z);
      const q=v.project(c);
      const sx=(q.x*0.5+0.5)*W, sy=(-q.y*0.5+0.5)*H;
      if(sx<x0)x0=sx; if(sx>x1)x1=sx; if(sy<y0)y0=sy; if(sy>y1)y1=sy;
    }
    return {W,H, fitW:T.fitW, fitH:T.fitH, over:[Math.round(-x0),Math.round(x1-W),Math.round(-y0),Math.round(y1-H)],
      theta:T.theta};
  });
  let f=await fits();
  ok('よこ向きで全体が画面内（はみ出し0）', f.over.every(v=>v<=2), JSON.stringify(f));
  ok('合わせたときの画面の大きさを控えている', Math.abs(f.W-f.fitW)<8 && Math.abs(f.H-f.fitH)<8, f.fitW+'x'+f.fitH);

  /* --- 画面の大きさが変わる（レイアウトの遅れの再現。向きは同じ＝orientationchangeは出ない）
         → 自動で合わせ直す --- */
  await p.setViewportSize({width:852,height:320});
  await p.waitForTimeout(1200);
  f=await fits();
  ok('画面の大きさが変わったら自動で合わせ直す（カメラは誰も触っていない）',
     Math.abs(f.H-f.fitH)<8 && f.over.every(v=>v<=2), JSON.stringify(f));

  /* --- 使う人がカメラを動かしたら、その後の大きさ変化では動かさない（§152）
         ★向きの回転（orientationchange）だけは §149/§152 の決まりで合わせ直してよいので、
           ここでは「向きは同じまま大きさだけ変わる」状況で確かめる --- */
  const th=await p.evaluate(()=>{ T.theta+=0.4; T.sig=''; return T.theta; });
  await p.waitForTimeout(300);
  const before=await p.evaluate(()=>T.fitH);
  await p.setViewportSize({width:852,height:393});
  await p.waitForTimeout(1200);
  const g=await p.evaluate(()=>({theta:T.theta, fitH:T.fitH, H:T.renderer.domElement.clientHeight}));
  ok('カメラを動かしたあとは、大きさが変わっても勝手に戻さない',
     Math.abs(g.theta-th)<1e-9 && g.fitH===before && Math.abs(g.fitH-g.H)>30, JSON.stringify(g)+' before='+before);

  /* --- 向きの回転（orientationchange）では合わせ直す（§149 の決まり・角度は保つ） --- */
  await p.evaluate(()=>{ dispatchEvent(new Event('orientationchange')); });
  await p.waitForTimeout(800);
  const h2=await p.evaluate(()=>({theta:T.theta, fitH:T.fitH, H:T.renderer.domElement.clientHeight}));
  ok('向きの回転では合わせ直す（角度はそのまま）',
     Math.abs(h2.theta-th)<1e-9 && Math.abs(h2.fitH-h2.H)<8, JSON.stringify(h2));
  await p.evaluate(()=>{ state.polys=[]; state.active=-1; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
