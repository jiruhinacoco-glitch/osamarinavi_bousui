/* §601 ステータス分布の円グラフ：絵そのものをつまんで動かせる／表と重ならない／1回押しの「一覧へ」は残る
   使い方: node _check/sttdrag.js [直す前のdashboard_widgets.jsのパス] */
const fs=require('fs'),path=require('path'),{chromium}=require('/opt/node22/lib/node_modules/playwright');
let bad=0;const ok=(v,n,d)=>{console.log((v?'○ ':'★NG ')+n+' '+JSON.stringify(d??''));if(!v)bad++;};
const OLD=process.argv[2];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const mk=async(W,init)=>{const c=await b.newContext({viewport:{width:W,height:950},serviceWorkers:'block'});
 await c.addInitScript(i=>{localStorage.setItem('nn_view_mode','pc');if(i)localStorage.setItem('nn_dash_widgets_v1',i);},init||'');
 await c.route('**/*',r=>{const u=new URL(r.request().url());let f=path.resolve(decodeURIComponent(u.pathname).slice(1));if(OLD&&u.pathname==='/dashboard_widgets.js')f=path.resolve(OLD);return u.hostname==='stt.test'&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
 const p=await c.newPage();await p.goto('https://stt.test/kirokucho_demo.html');await p.waitForFunction(()=>document.querySelector('[data-widget-key="stt-chart"]'));await p.waitForTimeout(400);return [c,p];};
const ov=p=>p.evaluate(()=>{const R=s=>document.querySelector(s).getBoundingClientRect(),a=R('[data-widget-key="stt-table"]'),c=R('[data-widget-key="stt-chart"]');const w=Math.min(a.right,c.right)-Math.max(a.left,c.left),h=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top);return w>2&&h>2?Math.round(w)+'x'+Math.round(h):0;});
// ① 絵そのものをつまんで動かす
let [c,p]=await mk(1890);const ch=p.locator('[data-widget-key="stt-chart"]');await ch.scrollIntoViewIfNeeded();
let r=await ch.boundingBox();const sx=r.x+r.width/2,sy=r.y+r.height-30;/* 「表の✓と連動」あたり＝絵の中 */
await p.mouse.move(sx,sy);await p.mouse.down();await p.mouse.move(sx,sy+80,{steps:8});await p.mouse.up();
let a=await ch.boundingBox();ok(Math.abs(a.x-r.x)<6&&Math.abs(a.y-r.y-80)<6,'円グラフの絵をつまんで動かせる',{before:[r.x,r.y],after:[a.x,a.y]});
// ② 表の上へ落としても重ならない
const t=await p.locator('[data-widget-key="stt-table"]').boundingBox();r=await ch.locator('.nn-widget-move').boundingBox();/* 「円グラフを移動」の取っ手でも同じ */
await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:10});await p.mouse.up();
ok(!(await ov(p)),'表の上に落としても重ならない（空いている所へずれる）',{overlap:await ov(p)});
// ③ 角でサイズ変更して表へ食い込ませても重ならない
await p.locator('[data-panel-id="stt"] .nn-widget-move').first().dblclick();await p.waitForTimeout(200);
const g=ch.locator('[data-edge="sw"]');r=await g.boundingBox();await p.mouse.move(r.x+6,r.y+6);await p.mouse.down();await p.mouse.move(r.x-200,r.y+100,{steps:8});await p.mouse.up();
ok(!(await ov(p)),'左へ大きく広げても表と重ならない',{overlap:await ov(p)});
// ④ 1回押しの一覧へ（goStatus2）が効く
await p.locator('[data-panel-id="stt"] .nn-widget-move').first().dblclick();await p.waitForTimeout(200);
await p.evaluate(()=>{window.__gs=0;window.goStatus2=()=>{window.__gs++;};});
const seg=p.locator('[data-panel-id="stt"] .stseg').first();const sb=await seg.boundingBox();await p.mouse.click(sb.x+sb.width/2,sb.y+sb.height/2);
ok(await p.evaluate(()=>window.__gs)===1,'円グラフを1回押すと今までどおり反応する');
await c.close();
// ⑤ 前に保存された「重なった配置」を読み込んでも重ならない
[c,p]=await mk(1890,JSON.stringify({'pc|stt-table':{x:0,y:0,width:900},'pc|stt-chart':{x:500,y:0,width:290,height:320}}));
ok(!(await ov(p)),'保存済みの重なりを開いた時に直す',{overlap:await ov(p)});await c.close();
await b.close();console.log(bad?'NG '+bad:'ALL OK');process.exitCode=bad?1:0;})();
