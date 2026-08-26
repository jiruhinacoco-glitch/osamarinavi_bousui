/* ★2026-08-26b 「スマホたて画面の下が黒い帯」の検証
   iPhoneをホーム画面から起動すると、innerHeight（と visualViewport.height）が
   実際より小さい値のまま変わらず、本当の下端（目印 #nnBtmProbe）だけが
   起動の少し後に伸びる。resize は来ない。
   → 2026-08-24ab の「変わったときだけ測る」が一度も測り直さず、
     --nnvh が小さいまま＝body が短い＝下に黒い帯（実機で発生した不具合）。
   この検査は「目印だけが後から伸びる」を作り、--nnvh が追従するかを見る。
   使い方: node _check/fillband.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const PAGES=['index.html','genba_map_v36.html','kirokucho_demo.html','zumen_sekisan.html'];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const pg of PAGES){
    const p=await b.newPage({viewport:{width:393,height:700},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{
      try{Object.defineProperty(screen,'width',{get:()=>393});
          Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}
      /* ホーム画面からの起動を再現：申告値は700のまま固定・目印の位置だけ後から伸ばせる */
      try{Object.defineProperty(Navigator.prototype,'standalone',{get:()=>true,configurable:true});}catch(e){}
      try{Object.defineProperty(window,'innerHeight',{get:()=>700,configurable:true});}catch(e){}
      try{Object.defineProperty(VisualViewport.prototype,'height',{get:()=>700,configurable:true});}catch(e){}
      window.__probeH=700;
      const orig=Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect=function(){
        if(this.id==='nnBtmProbe'){
          const h=window.__probeH;
          return {top:h-1,bottom:h,left:0,right:1,width:1,height:1,x:0,y:h-1};
        }
        return orig.call(this);
      };
    });
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/'+pg); await p.waitForTimeout(1200);
    await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    const v0=await p.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnvh')));
    ok(pg+'：起動時は申告どおり（--nnvh=700）', Math.abs(v0-700)<3, v0);
    /* ★現場マップだけ body{height:var(--nnvh)} ではなく、fitApp() が --nnvh を読んで
       #app（地図）の高さを毎秒決める作り。測り先をページの実態に合わせる。 */
    const beforeH=await p.evaluate(pg=>{
      const el=pg==='genba_map_v36.html'?document.getElementById('app'):document.body;
      return el?el.clientHeight:0; },pg);
    /* 起動アニメが終わって、本当の下端だけが852に伸びた（resizeは来ない） */
    await p.evaluate(()=>{ window.__probeH=852; });
    await p.waitForTimeout(2600);   /* 起動直後の測り直し（〜3秒）か0.8秒ごとの合図で拾う */
    const v1=await p.evaluate(pg=>{
      const el=pg==='genba_map_v36.html'?document.getElementById('app'):document.body;
      return {v:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnvh')),
        h:el?el.clientHeight:0}; },pg);
    ok(pg+'：目印が伸びたら --nnvh と中身の高さが追従（黒い帯が出ない）',
       Math.abs(v1.v-852)<3 && (v1.h-beforeH)>=140, JSON.stringify({before:beforeH, after:v1}));
    /* ★起動直後の測り直し（3秒）が終わった後でも、合図（目印）で必ず拾えるか */
    await p.waitForTimeout(1000);   /* 累計3.6秒＝settle分は終わっている */
    await p.evaluate(()=>{ window.__probeH=800; });
    await p.waitForTimeout(1800);
    const v2=await p.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnvh')));
    ok(pg+'：3秒を過ぎても合図（目印）だけで追従する', Math.abs(v2-800)<3, v2);
    ok(pg+'：JSエラーなし', errs.length===0, errs.join(' / '));
    await p.close();
  }
  console.log(R.join('\n'));
  await b.close();
})();
