const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/node22/lib/node_modules/playwright');
let bad=0;function ok(c,n,v){console.log((c?'○ ':'★NG ')+n+' '+JSON.stringify(v??''));if(!c)bad++;}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const mobile of [false,true]){
const c=await b.newContext({viewport:mobile?{width:393,height:852}:{width:1754,height:950},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',reducedMotion:'reduce',...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'}:{})});
await c.addInitScript(m=>localStorage.setItem('nn_view_mode',m?'mobile':'pc'),mobile);
await c.route('**/*',r=>{const u=new URL(r.request().url());let f=path.resolve(decodeURIComponent(u.pathname).slice(1));if(u.pathname==='/kirokucho_demo.html'&&process.argv[2])f=path.resolve(process.argv[2]);return u.hostname==='dash.test'&&f.startsWith(process.cwd()+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('https://dash.test/kirokucho_demo.html');await p.waitForFunction(()=>document.querySelectorAll('#dashboard .httl').length===10);await p.evaluate(()=>document.fonts.ready);
const v=await p.evaluate(()=>{let bars=[...document.querySelectorAll('.cbar')].slice(0,2).map(b=>[...b.children].map(e=>({label:e.textContent,w:parseFloat(e.style.width),color:getComputedStyle(e).backgroundColor,action:e.getAttribute('onclick')})));return {buttons:document.querySelectorAll('.dash-settings-btn').length,radius:getComputedStyle(document.querySelector('.kgrp')).borderRadius,bold:getComputedStyle(document.querySelector('.alert-row .nm')).fontWeight,line:getComputedStyle(document.querySelector('.mini-tbl td')).borderRightWidth,bars,cta:[...document.querySelectorAll('.dpanel:has(.dash-settings-btn) h4 .cta')].length};});
ok(v.buttons===6&&!v.cta,'詳細設定6件・青い説明削除',v.buttons);ok(v.radius==='3px'&&+v.bold>=800&&parseFloat(v.line)>=.8&&parseFloat(v.line)<=1.1,'角・現場名太字・縦罫線',v);
ok(v.bars.every(a=>a.slice(0,3).every((e,i)=>e.w>=a[i+1].w)&&a[4].label.includes('粗利')),'完成バーのコスト降順・粗利右端');ok(v.bars.every(a=>a[4].color==='rgb(187, 216, 242)'&&a.find(e=>e.action==='toggleCost(0)').color!=='rgb(187, 216, 242)'),'粗利は共通青・材料は別色');
if(v.buttons===6){
 for(let i=0;i<6;i++){await p.locator('.dash-settings-btn').nth(i).click();ok(await p.locator('#dashSettings').isVisible(),'設定を開く '+i);await p.locator('#dashSettingSize').selectOption('large');await p.locator('#dashSettingOption').uncheck();await p.locator('#dashSettingSave').click();await p.waitForFunction(()=>document.querySelectorAll('.dash-settings-btn').length===6);}
 await p.reload();await p.waitForFunction(()=>document.querySelectorAll('.dash-settings-btn').length===6);ok(await p.locator('.dpanel.dash-large').count()===6,'6パネル設定を再読込で復元');
 await p.locator('.dash-settings-btn').nth(2).click();const cb=p.locator('[data-col]');const last=cb.last();await last.uncheck();await p.locator('#dashSettingSave').click();await p.waitForFunction(()=>document.querySelectorAll('.dash-settings-btn').length===6);await p.reload();await p.waitForFunction(()=>document.querySelectorAll('.dash-settings-btn').length===6);await p.locator('.dash-settings-btn').nth(2).click();ok(!await p.locator('[data-col]').last().isChecked(),'列表示設定の保存復元');await p.locator('#dashSettingCancel').click();
 await p.locator('.cbar i').first().click();ok(await p.locator('#costbox').innerText().then(t=>t.includes('材料費')||t.includes('労務費')||t.includes('現場経費')),'並び替え後の費目クリック');
}
ok(errors.length===0,'実行エラーなし',errors);if(mobile)ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'スマホ横はみ出しなし');
if(!process.argv[2]){await p.evaluate(()=>document.getElementById('dashboard').scrollTop=0);await p.screenshot({path:'_check/dashsettings-'+(mobile?'mobile':'pc')+'.png'});}await c.close();}
await b.close();process.exitCode=bad?1:0;})();
