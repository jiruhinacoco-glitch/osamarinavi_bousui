/* 3Dパッドの絵ボタン（2026-08-18c） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3500);
  const r=await p.evaluate(()=>{
    const out={};
    ['d3_zin','d3_zout','d3_rl','d3_rr','d3_tup','d3_tdn','d3_fit'].forEach(id=>{
      const b=document.getElementById(id); const im=b.querySelector('.d3bi');
      const cs=getComputedStyle(b);
      out[id]={img:!!(im&&im.naturalWidth>0&&b.classList.contains('hasimg')),
        noFrame:cs.borderStyle==='none'||cs.borderWidth==='0px', bg:cs.backgroundColor,
        txt:getComputedStyle(b.querySelector('.d3tx')||b).display};
    });
    return out;
  });
  ok('＋−⟲⟳＋上から/横からの6個が絵になり枠が消えた', ['d3_zin','d3_zout','d3_rl','d3_rr','d3_tup','d3_tdn'].every(k=>r[k].img&&r[k].noFrame), r.d3_zin);
  ok('絵のあるボタンは文字が消える', ['d3_zin','d3_rr'].every(k=>r[k].txt==='none'));
  ok('絵の無いボタン（全体）は今までどおり白い枠', !r.d3_fit.img&&!r.d3_fit.noFrame);
  /* 機能：＋で寄る、⟳で回る（長押し系の配線が生きているか） */
  const before=await p.evaluate(()=>({r:T.r, th:T.theta, ph:T.phi}));
  await p.tap('#d3_zin'); await p.waitForTimeout(300);
  await p.tap('#d3_rr'); await p.waitForTimeout(300);
  await p.tap('#d3_tup'); await p.waitForTimeout(300);
  const after=await p.evaluate(()=>({r:T.r, th:T.theta, ph:T.phi}));
  ok('＋で寄る・⟳で回る・上からで傾く（機能はそのまま）', after.r<before.r && after.th!==before.th && after.ph!==before.ph, {before,after});
  ok('JSエラーなし', errs.length===0, errs);
  await p.screenshot({path:'out/chk_d3pad.png'});
  console.log(R.join('\n'));
  await b.close();
})();
