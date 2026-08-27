/* ★2026-08-26b/27a 「スマホたて画面の下の帯」の検証
   ホーム画面から起動したiPhoneは、申告(innerHeight)・visualViewport・
   目印(fixedの下端)までぜんぶ実際より小さい値のまま嘘をつくことがある
   （実機スクショの実測：中身が60pt短く、その下にページの背景色が塗られていた）。
   ①その状態でも screen（画面そのもの）の高さで正しく直るか（2026-08-27a）
   ②目印だけが後から伸びる状態でも合図で追従するか（2026-08-26b）
   使い方: node _check/fillband.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
/* ①は等倍ページ（width=device-width）だけ。縮小ページ（kirokucho等）は
   CSSのpxが screen と合わないので screen 候補の対象外（③がその保護を確かめる） */
const PAGES=['index.html','genba_map_v36.html','zumen_sekisan.html','hacchu.html'];
const initFake=(scrH)=>`(()=>{
  try{Object.defineProperty(screen,'width',{get:()=>393});
      Object.defineProperty(screen,'height',{get:()=>${scrH}});}catch(e){}
  try{Object.defineProperty(Navigator.prototype,'standalone',{get:()=>true,configurable:true});}catch(e){}
  try{Object.defineProperty(window,'innerHeight',{get:()=>700,configurable:true});}catch(e){}
  try{Object.defineProperty(VisualViewport.prototype,'height',{get:()=>700,configurable:true});}catch(e){}
  window.__probeH=700;
  const orig=Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect=function(){
    if(this.id==='nnBtmProbe'){const h=window.__probeH;
      return {top:h-1,bottom:h,left:0,right:1,width:1,height:1,x:0,y:h-1};}
    return orig.call(this); };
})()`;
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

  /* --- ①実機の壊れ方：申告・vv・目印ぜんぶ700のまま。screen だけが852（真実） --- */
  for(const pg of PAGES){
    const p=await b.newPage({viewport:{width:393,height:700},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(initFake(852));
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/'+pg); await p.waitForTimeout(1500);
    await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    const v=await p.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnvh')));
    ok(pg+'：全部の申告が嘘でも screen の高さで正しくなる（帯が出ない）', Math.abs(v-852)<3, v);
    ok(pg+'：JSエラーなし', errs.length===0, errs.join(' / '));
    await p.close();
  }

  /* --- ②目印だけが後から伸びる（screen は700＝役に立たない状態で、目印の合図で追従） --- */
  {
    const p=await b.newPage({viewport:{width:393,height:700},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(initFake(700));
    await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(1200);
    const v0=await p.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnvh')));
    ok('②起動時は申告どおり（700）', Math.abs(v0-700)<3, v0);
    await p.evaluate(()=>{ window.__probeH=852; });
    await p.waitForTimeout(2600);
    const v1=await p.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnvh')));
    ok('②目印が伸びたら追従する', Math.abs(v1-852)<3, v1);
    await p.waitForTimeout(1000);
    await p.evaluate(()=>{ window.__probeH=800; });
    await p.waitForTimeout(1800);
    const v2=await p.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnvh')));
    ok('②3秒を過ぎても合図（目印）だけで追従する', Math.abs(v2-800)<3, v2);
    await p.close();
  }

  /* --- ③縮小ページ（width=980）では screen 候補が誤作動しない --- */
  {
    const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393});
      Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}
      try{Object.defineProperty(Navigator.prototype,'standalone',{get:()=>true,configurable:true});}catch(e){} });
    await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1500);
    const v=await p.evaluate(()=>({nnvh:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnvh')),
      inner:innerHeight}));
    /* width=980 の中では innerHeight≈2100（CSSpx）。screen(852) に置き換わってはいけない */
    ok('③縮小ページでは screen 候補が誤作動しない（--nnvh≒innerHeight）',
       Math.abs(v.nnvh-v.inner)<4 && v.nnvh>1500, JSON.stringify(v));
    await p.close();
  }
  console.log(R.join('\n'));
  await b.close();
})();
