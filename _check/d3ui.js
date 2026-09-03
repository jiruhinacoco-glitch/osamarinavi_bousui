/* ①3Dタブで部材スタンプ（鳩小屋・脱気筒）が置けるか
   ②カメラを「真横（90度）」まで倒せるか（断面の形を確かめるため）
   ③タブが ①平面図 ②断面図 ③3D で、②割付のタブが出ていないか

   ★2026-08-29i に見つけた不具合：
     3Dでスタンプのゴーストは出るのに、タップしても置かれなかった。
     面のドラッグ（nnFaceDrag）が指を横取りし、離すときに
     stopImmediatePropagation で**統一の受け口（置く処理）まで止めて**いた。
     ★同じ要素に付いた受け口どうしは stopPropagation では止まらないので、
       「先に始めない」ことでしか譲れない。
     カメラは 1.45rad（約83度）で止まっていて、真横から断面の形を見られなかった。

   使い方: node _check/d3ui.js
           node _check/d3ui.js before   … 直す前のファイルと比べる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BEFORE=process.argv[2]==='before';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
let FILE='zumen_sekisan.html';
if(BEFORE){ FILE='_before_d3ui.html'; execSync('git show HEAD:zumen_sekisan.html > '+FILE); }
const RING={pts:[{x:0,y:0},{x:14,y:0},{x:14,y:10},{x:0,y:10}],
  edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'})), lv:0, holes:[], name:'屋根①'};

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
  p.on('dialog',d=>d.accept().catch(()=>{}));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
  await p.evaluate(r=>localStorage.setItem('nn_zumen_v1',JSON.stringify(
    {polys:[r],parts:[],d3sol:[],scaleM:1,specCode:'AS-T1'})),RING);
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1900);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

  /* ---- ③ タブの名前 ---- */
  const tabs=await p.evaluate(()=>{
    const g=id=>{ const e=document.getElementById(id); if(!e) return null;
      return {t:(e.textContent||'').replace(/\s+/g,''), show:getComputedStyle(e).display!=='none'}; };
    return {zu:g('ht_zu'), wf:g('ht_wf'), sec:g('ht_sec'), d3:g('ht_d3')};
  });
  ok('タブ①が「平面図」', tabs.zu && /平面図/.test(tabs.zu.t) && tabs.zu.show, tabs.zu);
  ok('②割付のタブは出さない', tabs.wf && !tabs.wf.show, tabs.wf);
  ok('タブ②が「断面図」', tabs.sec && /断面図/.test(tabs.sec.t) && tabs.sec.show, tabs.sec);
  ok('タブ③が「3D」', tabs.d3 && /3D/.test(tabs.d3.t) && tabs.d3.show, tabs.d3);
  ok('割付は「ヨコ割付／タテ割付」から開ける',
     await p.evaluate(()=>!!document.getElementById('tl_wari_h')&&!!document.getElementById('tl_wari_v')));

  await p.evaluate(()=>{ setTab('d3'); try{nnRoofFold(true);}catch(_){} }); await p.waitForTimeout(3200);

  /* ---- ② カメラを真横まで ---- */
  const cam=await p.evaluate(()=>{ T.phi=0.9;
    for(let i=0;i<40;i++) d3Tilt(10);          /* 「横から」を何度も押す */
    return {phi:+T.phi.toFixed(4), deg:+(T.phi*180/Math.PI).toFixed(1)}; });
  ok('カメラが真横（90度）まで倒せる', cam.deg>=89.9, cam);
  await p.evaluate(()=>{ for(let i=0;i<40;i++) d3Tilt(-10); });
  const cam2=await p.evaluate(()=>({deg:+(T.phi*180/Math.PI).toFixed(1)}));
  ok('真上には行かない（絵が回らないように下限は残す）', cam2.deg>5 && cam2.deg<15, cam2);

  /* ---- ① 3Dで部材スタンプが置ける ---- */
  const place=async(nm)=>{
    await p.evaluate(()=>{ T.theta=Math.PI*0.5; T.phi=0.75; T.r=24; T.tx=7; T.tz=5;
      T.voX=0; T.voY=0; T.rev++; });
    await p.waitForTimeout(900);
    const before=await p.evaluate(()=>state.parts.length);
    /* ★2026-09-03 鳩小屋などは「⚙ 設備」の小窓に移った（§265）。小窓を開いてから全体から探す */
    const hit=await p.evaluate(n=>{ try{ if(window.nnSetsubiPanel) nnSetsubiPanel(true); }catch(_){}
      const b=[...document.querySelectorAll('button')]
      .find(x=>new RegExp(n).test(x.getAttribute('data-nm')||x.textContent||''));
      if(!b) return null; b.click(); return {placing:(window.nnPlacingId?String(nnPlacingId()):'—')}; },nm);
    if(!hit) return {none:true};
    await p.waitForTimeout(500);
    const c=await p.evaluate(()=>{ const r=T.renderer.domElement.getBoundingClientRect();
      return {x:Math.round(r.x+r.width*0.5), y:Math.round(r.y+r.height*0.55)}; });
    await p.mouse.move(c.x,c.y); await p.waitForTimeout(350);
    await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up();
    await p.waitForTimeout(900);
    const after=await p.evaluate(()=>({n:state.parts.length,
      last:state.parts[state.parts.length-1]||null}));
    /* 置くモードは続く（続けて置ける・§233）ので、Escでやめる */
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    return {before, after, placing:hit.placing};
  };
  for(const nm of ['鳩小屋','脱気筒','タテドレン']){
    const r=await place(nm);
    ok('3Dで「'+nm+'」を置ける', !r.none && r.after && r.after.n===r.before+1
       && r.after.last && isFinite(r.after.last.x) && isFinite(r.after.last.y), r);
  }
  ok('置いた部材は積算にも出る',
     await p.evaluate(()=>{ try{ recalc(); const t=document.getElementById('sekisan');
       return /鳩小屋|脱気筒|ドレン/.test(t?t.innerText:''); }catch(e){ return false; } }));
  ok('JSエラーなし', errs.length===0, errs.slice(0,3));

  console.log(R.join('\n'));
  const ng=R.filter(x=>x.startsWith('★')).length;
  console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
  if(BEFORE){ try{ execSync('rm -f _before_d3ui.html'); }catch(_){} }
  await b.close(); process.exit(ng?1:0);
})();
