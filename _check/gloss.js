const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const U='http://127.0.0.1:8899/kirokucho_demo.html';
const ok=(c,m)=>console.log((c?'○':'★NG')+' '+m);

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(U,{waitUntil:'load'}); await p.waitForTimeout(1200);

  // 一覧タブ（各物件）へ
  await p.evaluate(()=>{ try{showView('main');}catch(e){} });
  await p.waitForTimeout(600);
  // 表モード（進捗／予算消化の列）が出るか、まずカードの .apw を見る
  const g1=await p.evaluate(()=>{
    const el=document.querySelector('.pline .prog')||document.querySelector('.prog');
    if(!el) return null;
    const cs=getComputedStyle(el), af=getComputedStyle(el,'::after');
    const i=el.querySelector('i');
    return {bg:cs.backgroundImage, r:cs.borderRadius, sh:cs.boxShadow,
            afc:af.content, afbg:af.backgroundImage,
            fill:i?getComputedStyle(i).backgroundImage:null};
  });
  console.log('--- .prog ---'); console.log(JSON.stringify(g1,null,1).slice(0,1400));
  ok(g1 && /rgb\(10, 13, 10\)/.test(g1.bg), '筒の地が黒（#0a0d0a を含む）');
  ok(g1 && g1.r==='0px', '角は丸くない（長方形）');
  ok(g1 && /inset/.test(g1.sh), '内側に影がある（筒に見える）');
  ok(g1 && g1.afc!=='none', 'つや（::after）がある');
  ok(g1 && /rgb\(34, 166, 58\)/.test(g1.fill||''), '満たしている部分が光沢の緑');

  const g2=await p.evaluate(()=>{
    const el=document.querySelector('.prog.bud i'); if(!el) return null;
    return getComputedStyle(el).backgroundImage;
  });
  ok(g2 && /rgb\(224, 42, 26\)/.test(g2), '予算のバーが光沢の赤');

  const pv=await p.evaluate(()=>{
    const el=document.querySelector('.pline .pv'); if(!el) return null;
    const cs=getComputedStyle(el); return {c:cs.color,z:cs.zIndex,ts:cs.textShadow};
  });
  ok(pv && pv.c==='rgb(255, 255, 255)', '%の数字が白（黒地でも読める）');
  ok(pv && pv.z==='2', '%の数字がつやの上に出る');

  await p.screenshot({path:'/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/g_list.png'});

  // ダッシュボード（施工中の現場＝.sc-prog／工法別＝.houbar）
  await p.evaluate(()=>{ try{showView('dash');}catch(e){} });
  await p.waitForTimeout(900);
  const g3=await p.evaluate(()=>{
    const r={};
    ['.sc-prog .bar','.houbar','.ptrack','.pace .pt2'].forEach(sel=>{
      const el=document.querySelector(sel);
      if(!el){r[sel]='(無し)';return;}
      const cs=getComputedStyle(el),af=getComputedStyle(el,'::after'),i=el.querySelector('i');
      r[sel]={dark:/rgb\(10, 13, 10\)/.test(cs.backgroundImage), af:af.content!=='none',
              fill:i?/rgb\(34, 166, 58\)|rgb\(224, 42, 26\)/.test(getComputedStyle(i).backgroundImage):null};
    });
    return r;
  });
  console.log('--- ダッシュボード ---'); console.log(JSON.stringify(g3));
  await p.screenshot({path:'/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/g_dash.png',fullPage:false});

  ok(errs.length===0,'JSエラーなし '+(errs[0]||''));
  await b.close();
})();
