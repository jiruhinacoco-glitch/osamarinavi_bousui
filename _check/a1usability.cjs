const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');let bad=0;const check=(ok,s)=>{console.log((ok?'○ ':'★NG ')+s);if(!ok)bad++;};
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const cfg of [{w:1440,h:900,z:1},{w:1920,h:920,z:1.4},{w:390,h:844,z:1,phone:true},{w:844,h:390,z:1,phone:true}]){
 const ctx=await browser.newContext({viewport:{width:cfg.w,height:cfg.h},isMobile:!!cfg.phone,hasTouch:!!cfg.phone,deviceScaleFactor:cfg.phone?2:1,serviceWorkers:'block'});
 await ctx.route('http://a1.test/**',r=>{let p=path.resolve(root,decodeURIComponent(new URL(r.request().url()).pathname).slice(1));if(process.env.A1_BEFORE&&/a1_model\.(js|css)$/.test(p))p=path.join(root,'.research/a1-before.'+path.extname(p).slice(1));return p.startsWith(root+path.sep)&&fs.existsSync(p)?r.fulfill({path:p}):r.fulfill({status:404,body:''});});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://a1.test/shiyo_toroku.html');await page.evaluate(z=>{document.body.style.zoom=z;NN_A1.open();},cfg.z);
 await page.waitForFunction(()=>document.querySelector('#a1-dialog')?._a1?.renderer.info.render.triangles>0);
 const name=cfg.w+'×'+cfg.h+' 倍率'+cfg.z;
 const nav=await page.locator('[data-nav]').count();check(nav===8,'既存3Dと同じ8操作 '+name);
 const dims=await page.evaluate(()=>{const d=document.querySelector('#a1-dialog'),b=d.querySelector('[data-close]').getBoundingClientRect(),r=d.getBoundingClientRect(),v=d.querySelector('canvas'),c=v.getBoundingClientRect();return {close:b.top>=0&&b.right<=document.documentElement.clientWidth+2&&b.bottom<document.documentElement.clientHeight,inside:r.top>=-1&&r.bottom<=document.documentElement.clientHeight+2,sharp:v.width>=c.width*devicePixelRatio-.5&&v.height>=c.height*devicePixelRatio-.5};});
 check(dims.close&&dims.inside,'閉じる・画面全体が縦横に収まる '+name);check(dims.sharp,'表示実寸に合う描画解像度 '+name);
 if(nav!==8){await ctx.close();continue;}
 await page.locator('.a1-side').evaluate(e=>e.scrollTop=e.scrollHeight);check(await page.locator('[data-close]').isVisible()&&await page.locator('[data-close]').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<document.documentElement.clientHeight;}),'説明をスクロールしても閉じるは固定');
 await page.locator('.a1-side').evaluate(e=>e.scrollTop=0);
 const canvas=page.locator('#a1-dialog canvas'),r=await canvas.boundingBox();
 const state=()=>page.evaluate(()=>document.querySelector('#a1-dialog')._a1.state);
 let a=await state();await page.mouse.move(r.x+r.width*.35,r.y+r.height*.6);await page.mouse.down();await page.mouse.move(r.x+r.width*.35+50,r.y+r.height*.6+10,{steps:3});await page.mouse.up();let b=await state();
 check(a.theta===b.theta&&a.phi===b.phi&&Math.hypot(b.target[0]-a.target[0],b.target[2]-a.target[2])>.01,'左ドラッグは回転せず移動');
 a=await state();await page.mouse.move(r.x+r.width*.35,r.y+r.height*.6);await page.mouse.down({button:'right'});await page.mouse.move(r.x+r.width*.35+40,r.y+r.height*.6+20,{steps:3});await page.mouse.up({button:'right'});b=await state();check(Math.abs((b.theta-a.theta)+.24)<1e-7&&Math.abs((b.phi-a.phi)+.1)<1e-7,'右ドラッグの向き・感度が3D投影と一致');
 a=await state();await page.mouse.wheel(0,120);await page.waitForFunction(old=>document.querySelector('#a1-dialog')._a1.state.distance!==old,a.distance);b=await state();check(Math.abs(b.distance/a.distance-1.12)<1e-7,'ホイール倍率が3D投影と一致');
 check(await page.evaluate(()=>{const d=document.querySelector('#a1-dialog'),s=d._a1.scene;return d.dataset.sky==='std'&&s.background.isTexture&&s.environment.isTexture&&s.background.image.width===1024;}),'3D投影の標準全天球背景と環境光');
 const coats=await page.evaluate(()=>{const gs=document.querySelector('#a1-dialog')._a1.groups;let n=0,wave=0;for(let i=3;i<=8;i++){for(const m of gs[i].children){if(m.material.userData.kind==='asphalt'){n++;const p=m.geometry.attributes.position;if(i===7){const xs=[];for(let k=0;k<p.count/2;k+=49)xs.push(p.getX(k));wave=Math.max(...xs)-Math.min(...xs);}}}}return {n,wave};});check(coats.n===10&&coats.wave>.02,'流し張り4工程の平場・立上り＋上掛け2回に波状端のアス層');
 await page.locator('[data-reset]').click();if(cfg.w<701)await page.selectOption('[data-step-mobile]','3');else await page.locator('[data-step="3"]').click();await page.selectOption('[data-component]','asphalt');
 check(await page.evaluate(()=>{const gs=document.querySelector('#a1-dialog')._a1.groups;return gs[3].visible&&gs[3].children.filter(m=>m.visible).every(m=>m.material.userData.kind==='asphalt')&&!gs[4].visible;}),'溶融アスだけを取り出して確認');
 await page.selectOption('[data-component]','all');await page.selectOption('[data-mode]','cut');await page.locator('[data-reset]').click();await page.locator('.a1-side').evaluate(e=>e.scrollTop=0);
 await page.screenshot({path:path.join(root,'.research/a1-new-'+cfg.w+'.png')});
 if(cfg.phone){const cdp=await ctx.newCDPSession(page);const q=await canvas.boundingBox();const pts=[{x:q.x+q.width*.35,y:q.y+q.height*.55},{x:q.x+q.width*.60,y:q.y+q.height*.55}];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts.map(p=>({...p,x:p.x+1}))});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...pts[0],x:pts[0].x-15},{...pts[1],x:pts[1].x+15}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check((await state()).pointers===0,'実タッチ2本指終了で指状態を解除');}
 await page.locator('[data-close]').click();await page.waitForFunction(()=>!document.querySelector('#a1-dialog'));check(await page.locator('#a1-dialog').count()===0,'閉じるボタンの実クリックで終了');check(errors.length===0,'実行エラーなし '+errors.join(';'));await ctx.close();
}}finally{await browser.close();}process.exitCode=bad?1:0;})().catch(e=>{console.error('★NG',e);process.exitCode=1;});
