const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const U='http://127.0.0.1:8899/kirokucho_demo.html';
const D='/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto(U,{waitUntil:'load'}); await p.waitForTimeout(1200);
  await p.evaluate(()=>{showView('list');}); await p.waitForTimeout(600);
  await p.evaluate(()=>{const k=props.find(x=>x.stRaw==='kou'); selectedId=k.id; curTab='概要'; openDetailFull();});
  await p.waitForTimeout(900);
  const el=await p.$('.pace');
  if(el){ await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    await el.screenshot({path:D+'s_pace.png'}); }
  const pb=await p.$('.pbars');
  if(pb){ await pb.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    await pb.screenshot({path:D+'s_pbars.png'}); }
  // 一覧（表モード）の 進捗／予算消化
  await p.evaluate(()=>{showView('list');}); await p.waitForTimeout(700);
  const ap=await p.$('.apw')||await p.$('.pw2');
  // ダッシュボード：施工中の現場・工法別
  await p.evaluate(()=>{showView('dash');}); await p.waitForTimeout(1200);
  const hb=await p.$('.houbar');
  if(hb){ const box=await hb.boundingBox(); await hb.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    const par=await p.evaluateHandle(e=>e.closest('table')||e.parentElement,hb);
    await par.asElement().screenshot({path:D+'s_hou.png'}); }
  // 自社スケジュールの進捗
  await p.evaluate(()=>{showView('jisha');}); await p.waitForTimeout(1400);
  const sp=await p.$('.sc-prog');
  if(sp){ await sp.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    const par=await p.evaluateHandle(e=>e.parentElement,sp);
    await par.asElement().screenshot({path:D+'s_scprog.png'}); }
  await b.close(); console.log('shots done');
})();
