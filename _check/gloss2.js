const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const U='http://127.0.0.1:8899/kirokucho_demo.html';
const D='/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/';
const ok=(c,m)=>console.log((c?'○':'★NG')+' '+m);
const chk=el=>{const cs=getComputedStyle(el),af=getComputedStyle(el,'::after'),i=el.querySelector('i');
  return {dark:/rgb\(10, 13, 10\)/.test(cs.backgroundImage),af:af.content!=='none',
          fill:i?getComputedStyle(i).backgroundImage:null};};

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(U,{waitUntil:'load'}); await p.waitForTimeout(1200);
  await p.addInitScript(()=>{});

  // ① 施工中物件（スケジュール）＝ .sc-prog .bar
  const r1=await p.evaluate(()=>{
    try{showView('jisha');}catch(e){}
    return 1;
  });
  await p.waitForTimeout(1200);
  const g1=await p.evaluate(()=>{
    const el=document.querySelector('.sc-prog .bar'); if(!el) return null;
    const cs=getComputedStyle(el),af=getComputedStyle(el,'::after'),i=el.querySelector('i');
    return {dark:/rgb\(10, 13, 10\)/.test(cs.backgroundImage),af:af.content!=='none',
            fill:i?getComputedStyle(i).backgroundImage:null,r:cs.borderRadius};
  });
  console.log('sc-prog:',JSON.stringify(g1));
  ok(g1&&g1.dark&&g1.af&&/rgb\(34, 166, 58\)/.test(g1.fill||''),'施工中カードの進捗バーが筒＋緑');
  await p.screenshot({path:D+'g_sched.png'});

  // ② 物件詳細（予実 .ptrack ／ 工事の進み .pace .pt2）
  await p.evaluate(()=>{ try{showView('list');}catch(e){} });
  await p.waitForTimeout(700);
  await p.evaluate(()=>{ const kou=props.find(x=>x.stRaw==='kou'); selectedId=kou.id; curTab='概要'; openDetailFull(); });
  await p.waitForTimeout(900);
  const g2=await p.evaluate(()=>{
    const out={};
    const t=document.querySelector('.ptrack');
    if(t){const cs=getComputedStyle(t),af=getComputedStyle(t,'::after'),i=t.querySelector('i'),u=t.querySelector('u');
      out.ptrack={dark:/rgb\(10, 13, 10\)/.test(cs.backgroundImage),af:af.content!=='none',
        fill:i?getComputedStyle(i).backgroundImage:null, u:u?getComputedStyle(u).backgroundColor:null};}
    const pt=document.querySelector('.pace .pt2');
    if(pt){const cs=getComputedStyle(pt),af=getComputedStyle(pt,'::after');
      const is=[...document.querySelectorAll('.pace .pt2 i')].map(x=>getComputedStyle(x).backgroundImage);
      out.pt2={dark:/rgb\(10, 13, 10\)/.test(cs.backgroundImage),af:af.content!=='none',fills:is};}
    return out;
  });
  console.log('detail:',JSON.stringify(g2,null,1));
  ok(g2.ptrack&&g2.ptrack.dark&&g2.ptrack.af,'予実（費目）のバーが筒');
  ok(g2.ptrack&&/rgb\(34, 166, 58\)|rgb\(224, 42, 26\)/.test(g2.ptrack.fill||''),'予実のバーが緑または赤');
  ok(g2.ptrack&&g2.ptrack.u==='rgb(255, 215, 106)','見積の位置の縦線が黄色');
  ok(g2.pt2&&g2.pt2.dark&&g2.pt2.af,'工事の進み／予算の減りが筒');
  ok(g2.pt2&&/rgb\(34, 166, 58\)/.test(g2.pt2.fills[0]||''),'工事の進み＝緑');
  ok(g2.pt2&&/rgb\(224, 42, 26\)/.test(g2.pt2.fills[1]||''),'予算の減り＝赤');
  await p.screenshot({path:D+'g_detail.png'});

  ok(errs.length===0,'JSエラーなし '+(errs[0]||''));
  await b.close();
})();
