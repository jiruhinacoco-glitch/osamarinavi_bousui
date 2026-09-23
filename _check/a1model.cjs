/* Run with Node; NN_NODE_MODULES / NN_CHROME may override local runtime paths. */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.NN_NODE_MODULES?path.join(process.env.NN_NODE_MODULES,'playwright'):'C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');let bad=0;
function check(ok,msg){console.log((ok?'○ ':'★NG ')+msg);if(!ok)bad++;}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NN_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const phone of [false,true]){
  const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1440,height:1000},isMobile:phone,hasTouch:phone,serviceWorkers:'block'});
  await context.route('http://a1.test/**',r=>{let p=path.resolve(root,decodeURIComponent(new URL(r.request().url()).pathname).slice(1));if(process.env.NN_A1_BEFORE&&path.basename(p)==='shiyo_toroku.html')p=path.join(root,'.research/before.html');return p.startsWith(root+path.sep)&&fs.existsSync(p)?r.fulfill({path:p}):r.fulfill({status:404,body:''});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://a1.test/shiyo_toroku.html');
  await page.evaluate(()=>{const s=Object.values(specById).find(s=>s.code==='A-1');selectAndShow({type:'std',id:s.id});});
  const launch=page.locator('.a1-launch button');check(await launch.count()===1,'A-1専用入口 '+(phone?'スマホ':'PC'));
  if(!await launch.count()){await context.close();continue;}
  const pick=async i=>{if(phone)await page.selectOption('[data-step-mobile]',String(i));else await page.locator('[data-step="'+i+'"]').click();};
  await launch.click();await page.waitForFunction(()=>document.querySelector('#a1-dialog')?._a1?.renderer.info.render.triangles>0);
  check(await page.locator('#a1-dialog [data-step]').count()===11,'下地＋増張り＋9工程');
  await page.selectOption('[data-mode]','only');await pick(9);
  const separator=await page.evaluate(()=>{const d=document.querySelector('#a1-dialog'),g=d._a1.groups;const meshes=g[9].children;return {visible:g.map((a,i)=>a.visible?i:-1).filter(i=>i>=0),maxY:Math.max(...meshes.map(m=>{m.geometry.computeBoundingBox();return m.geometry.boundingBox.max.y+m.position.y;}))};});
  check(JSON.stringify(separator.visible)==='[0,9]'&&separator.maxY<.35,'工程8のみ表示・絶縁シートを立上り全面に作らない');
  await page.selectOption('[data-mode]','upto');await pick(5);
  check(await page.evaluate(()=>document.querySelector('#a1-dialog')._a1.groups.every((g,i)=>g.visible===(i<=5))),'工程4までの完成状態・後工程非表示');
  await page.selectOption('[data-mode]','complete');
  check(await page.evaluate(()=>document.querySelector('#a1-dialog')._a1.groups.every(g=>g.visible)),'完成状態は9工程と先行処理を表示');
  const measures=await page.evaluate(()=>{const gs=document.querySelector('#a1-dialog')._a1.groups;return {concrete:gs[10].children.filter(m=>m.geometry.type==='BoxGeometry').map(m=>m.geometry.parameters.height),wire:gs[10].children.filter(m=>m.geometry.type==='CylinderGeometry').map(m=>m.geometry.parameters.radiusTop),reinforce:gs[2].children[0].geometry.parameters.shapes.getPoints().slice(0,4).reduce((s,p,i,a)=>i?s+p.distanceTo(a[i-1]):0,0)};});
  check(measures.concrete.filter(h=>Math.abs(h-.08)<1e-8).length===3&&measures.wire.length>20&&measures.wire.every(r=>r===.003)&&measures.reinforce>=.3,'実形状：保護80mm・金網径6mm・増張り幅300mm以上');
  await page.selectOption('[data-mode]','explode');
  check(await page.evaluate(()=>document.querySelector('#a1-dialog')._a1.groups[10].position.y>.8),'分解表示で層間が開く');
  await page.selectOption('[data-mode]','cut');await page.selectOption('[data-view]','corner');
  await page.locator('[data-reset]').click();
  const canvas=page.locator('#a1-dialog canvas'),rect=await canvas.boundingBox();
  const before=await page.evaluate(()=>document.querySelector('#a1-dialog')._a1.camera.position.toArray());
  await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.65,rect.y+rect.height*.55,{steps:6});await page.mouse.up();
  check(await page.evaluate(b=>JSON.stringify(document.querySelector('#a1-dialog')._a1.camera.position.toArray())!==JSON.stringify(b),before),'実ドラッグで視点移動');
  await page.locator('[data-reset]').click();await pick(6);
  check(await page.evaluate(()=>{const d=document.querySelector('#a1-dialog'),r=d.getBoundingClientRect();return d.scrollWidth<=d.clientWidth+2&&r.right<=document.documentElement.clientWidth+3;}),'操作欄・模型が画面幅に収まる');
  const out=process.env.NN_A1_OUT||path.join(root,'.research');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,phone?'a1-phone.png':'a1-pc.png')});
  await page.locator('[data-close]').click();await page.waitForFunction(()=>!document.querySelector('#a1-dialog'));await launch.click();await page.waitForFunction(()=>document.querySelector('#a1-dialog')?._a1?.renderer.info.render.triangles>0);
  check(errors.length===0,'再表示・実行エラーなし '+errors.join(';'));
  await page.locator('[data-close]').click();await page.goto('http://a1.test/kokkosho.html');await page.evaluate(()=>openDetail('n_a_hogo'));await page.locator('.a1-launch button').click();await page.waitForFunction(()=>document.querySelector('#a1-dialog')?._a1?.renderer.info.render.triangles>0);check(errors.length===0,'国交省仕様側からも同じ模型を開く');
  check(await page.evaluate(()=>[...document.scripts].filter(s=>!s.src).every(s=>{try{new Function(s.textContent);return true;}catch{return false;}})),'HTMLとして解釈した実スクリプト構文');
  await page.goto('http://a1.test/shiyo_toroku.html?model=A-1');await page.waitForFunction(()=>document.querySelector('#a1-dialog')?._a1?.renderer.info.render.triangles>0);check(true,'共有リンクからA-1を直接表示');
  await context.close();
 }
 await browser.close();process.exitCode=bad?1:0;
})().catch(e=>{console.error('★NG',e);process.exitCode=1;});
