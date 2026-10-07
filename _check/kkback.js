/* §603 国交省仕様：詳細（S-M2など）と原文ビューアの「✕ 閉じる」が iPhone の時計の帯（上の安全域）に
   重なって押せず、戻れなかった。帯の下に出るか／押して閉じるか／端末の「戻る」でも閉じるかを測る。
   使い方: node _check/kkback.js [直す前の kokkosho.html]（要 http://localhost:8899） */
const fs=require('fs'),path=require('path'),{chromium}=require('/opt/node22/lib/node_modules/playwright');
let bad=0;const ok=(v,n,d)=>{console.log((v?'○ ':'★NG ')+n+' '+JSON.stringify(d??''));if(!v)bad++;};
const OLD=process.argv[2], TOP=59;/* iPhone 15 Pro 縦の上の安全域 */
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const mode of ['mobile','ichiran']){
const c=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
await c.addInitScript(m=>localStorage.setItem('nn_view_mode',m),mode);
if(OLD)await c.route('**/kokkosho.html',r=>r.fulfill({path:path.resolve(OLD),contentType:'text/html'}));
const p=await c.newPage();const cdp=await c.newCDPSession(p);
await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:TOP,topMax:TOP,bottom:34,bottomMax:34,left:0,leftMax:0,right:0,rightMax:0}});
await p.goto('http://localhost:8899/index.html');await p.goto('http://localhost:8899/kokkosho.html');await p.waitForTimeout(900);
const T='['+mode+'] ';
const env=await p.evaluate(()=>{const d=document.createElement('div');d.style.cssText='position:fixed;top:0;height:env(safe-area-inset-top,0px)';document.body.append(d);const h=d.getBoundingClientRect().height;d.remove();return h;});
ok(env>0,T+'上の安全域の再現',env);
/* 詳細を開く（S-M2） */
await p.evaluate(()=>{const id=SPECIES.find(s=>s.code==='S-M2')?.id;openDetail(id);});await p.waitForTimeout(400);
const bt=await p.evaluate(()=>{const r=document.querySelector('#detail .close').getBoundingClientRect();const vv=window.visualViewport;const s=vv?vv.scale:1;return {top:r.top,bottom:r.bottom,inset:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--x')||0)};});
const envCss=env;/* CSS px（ページの倍率をかける前） */
ok(bt.top>=envCss-0.5,T+'詳細の「閉じる」が時計の帯より下',{btnTop:Math.round(bt.top),band:envCss});
await p.locator('#detail .close').click();await p.waitForTimeout(350);
ok(!(await p.evaluate(()=>document.getElementById('detail').classList.contains('open'))),T+'閉じるで詳細が閉じる');
ok(/kokkosho/.test(p.url()),T+'閉じてもページはそのまま',p.url());
/* 端末の「戻る」（iPhoneの左端スワイプ）で詳細だけ閉じる */
await p.evaluate(()=>openDetail(SPECIES[0].id));await p.waitForTimeout(300);
await p.goBack().catch(()=>{});await p.waitForTimeout(500);
ok(/kokkosho/.test(p.url())&&!(await p.evaluate(()=>document.getElementById('detail').classList.contains('open'))),T+'戻る操作で詳細だけ閉じる（前のページへ飛ばない）',p.url());
/* 原文ビューア */
await p.evaluate(()=>gbOpen('shin'));await p.waitForTimeout(400);
const gx=await p.evaluate(()=>document.querySelector('#gb .gbhead .x').getBoundingClientRect().top);
ok(gx>=envCss-0.5,T+'原文の「閉じる」が時計の帯より下',{btnTop:Math.round(gx),band:envCss});
await p.locator('#gb .gbhead .x').click();await p.waitForTimeout(300);
ok(!(await p.evaluate(()=>document.getElementById('gb').classList.contains('open')))&&/kokkosho/.test(p.url()),T+'原文が閉じてページはそのまま');
await c.close();}
await b.close();console.log(bad?'NG '+bad:'ALL OK');process.exitCode=bad?1:0;})();
