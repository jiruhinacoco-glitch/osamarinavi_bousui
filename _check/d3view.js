/* 3Dパッド：ナイトモード削除・視点2ボタン（2026-08-18e） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  /* サンプル形状を出してから3Dへ（全体表示の効きを見るため） */
  await p.evaluate(()=>{ const b=document.getElementById('tl_sample'); if(b)b.click(); });
  await p.waitForTimeout(800);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3500);

  ok('ナイトモード（🌙画面）はパッドから消えた', await p.evaluate(()=>!document.getElementById('d3_theme')));
  ok('夜/昼は上のツールバーに残っている', await p.evaluate(()=>!!document.getElementById('tl_night')&&!!document.getElementById('tl_day')));
  const pad=await p.evaluate(()=>[...document.querySelectorAll('#d3pad button')].map(b=>b.id));
  ok('パッドは8個（＋−上横⟲⟳＋視点2つ）', pad.length===8&&pad.includes('d3_plan')&&pad.includes('d3_iso'), pad);

  const img=await p.evaluate(()=>{
    const out={};
    ['d3_plan','d3_iso'].forEach(id=>{const b=document.getElementById(id), im=b.querySelector('.d3bi'), cs=getComputedStyle(b);
      out[id]={img:!!(im&&im.naturalWidth>0&&b.classList.contains('hasimg')), noFrame:cs.borderWidth==='0px'};});
    return out;});
  ok('視点2ボタンが絵になり枠が消えた', img.d3_plan.img&&img.d3_plan.noFrame&&img.d3_iso.img&&img.d3_iso.noFrame, img);

  /* 角度をぐちゃぐちゃにしてから、各ボタンで決まった視点に戻るか */
  await p.evaluate(()=>{ T.theta=0.3; T.phi=1.3; T.r=3; T.tx=99; T.tz=-99; });
  await p.tap('#d3_plan'); await p.waitForTimeout(700);
  const plan=await p.evaluate(()=>({th:+T.theta.toFixed(3), ph:+T.phi.toFixed(3), r:+T.r.toFixed(1), tx:+T.tx.toFixed(1), tz:+T.tz.toFixed(1)}));
  ok('図面と同じ：真上・theta=90度・全体表示に戻る',
     Math.abs(plan.th-Math.PI/2)<0.01 && plan.ph<0.2 && plan.r>5 && Math.abs(plan.tx)<50, plan);
  await p.screenshot({path:'out/chk_d3_plan.png'});

  await p.tap('#d3_iso'); await p.waitForTimeout(700);
  const iso=await p.evaluate(()=>({th:+T.theta.toFixed(3), ph:+T.phi.toFixed(3), r:+T.r.toFixed(1)}));
  ok('斜めから：起こした3/4アングル', Math.abs(iso.ph-0.95)<0.01 && Math.abs(iso.th-(Math.PI/2+0.5))<0.01, iso);
  await p.screenshot({path:'out/chk_d3_iso.png'});

  /* 図面と同じアングルか＝カメラの真下が図面の中心・上下が図面と一致（world +z が画面下） */
  await p.tap('#d3_plan'); await p.waitForTimeout(700);
  const dir=await p.evaluate(()=>{
    const c=T.camera;
    const toScr=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(c); return {x:v.x, y:v.y};};
    const o=toScr(T.tx,0.4,T.tz);
    const px=toScr(T.tx+5,0.4,T.tz);      /* 図面の +x（右） */
    const pz=toScr(T.tx,0.4,T.tz+5);      /* 図面の +y（下） */
    return {dxRight:px.x-o.x, dxUp:px.y-o.y, dzRight:pz.x-o.x, dzUp:pz.y-o.y};
  });
  ok('図面の +x が画面の右へ', dir.dxRight>0.05 && Math.abs(dir.dxUp)<0.05, dir);
  ok('図面の +y（下）が画面の下へ', dir.dzUp<-0.05 && Math.abs(dir.dzRight)<0.05, dir);
  ok('JSエラーなし', errs.length===0, errs);
  console.log(R.join('\n'));
  await b.close();
})();
