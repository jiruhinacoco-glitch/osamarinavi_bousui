/* §604 現場記録帳（スマホ表示）：①表一覧が指でなぞって縦にスクロールできる ②検索枠・請求記録・KPI・各枠の間が6px
   ③「請求し忘れ」→「請求記録」 ④平行四辺形の見出しが1行・文字15px以上（393px幅・長い「月別」は除く）・枠の高さがそろう
   使い方: node _check/kktight.js [直す前の kirokucho_demo.html] [直す前の record_view.js]（要 http://localhost:8899） */
const path=require('path'),{chromium}=require('/opt/node22/lib/node_modules/playwright');
let bad=0;const ok=(v,n,d)=>{console.log((v?'○ ':'★NG ')+n+' '+JSON.stringify(d??''));if(!v)bad++;};
const [OLD,OLDRV]=process.argv.slice(2);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const c=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
await c.addInitScript(()=>localStorage.setItem('nn_view_mode','mobile'));
if(OLD)await c.route('**/kirokucho_demo.html*',r=>r.fulfill({path:path.resolve(OLD),contentType:'text/html'}));
if(OLDRV)await c.route('**/record_view.js*',r=>r.fulfill({path:path.resolve(OLDRV),contentType:'text/javascript'}));
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/kirokucho_demo.html');await p.waitForFunction(()=>document.querySelectorAll('#dashboard .dpanel h4 .httl-text').length>=8);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
// ② 間隔
const g=await p.evaluate(()=>{const d=document.getElementById('dashboard');const R=s=>d.querySelector(s).getBoundingClientRect();const a=R(':scope>.stbar'),k=R('#nnSkPanel'),q=R(':scope>.kgrps'),gr=R(':scope>.nn-panel-grid');
 const ps=[...d.querySelectorAll('.nn-panel-grid>.dpanel')].filter(e=>e.offsetHeight).map(e=>e.getBoundingClientRect());
 return {'検索→請求':Math.round(k.top-a.bottom),'請求→KPI':Math.round(q.top-k.bottom),'KPI→枠':Math.round(gr.top-q.bottom),枠どうし:Math.round(ps[1].top-ps[0].bottom)};});
ok(Object.values(g).every(v=>v>=4&&v<=7),'②検索枠・請求記録・KPI・各枠の間が6px前後',g);
// ③ 名前
ok(/請求記録/.test(await p.textContent('#nnSkPanel .skh'))&&!/し忘れ/.test(await p.textContent('#nnSkPanel .skh')),'③見出しが「請求記録」');
// ④ 見出し
const h=await p.evaluate(()=>[...document.querySelectorAll('#dashboard .dpanel h4 .httl')].filter(e=>e.offsetHeight).map(e=>{const t=e.querySelector('.httl-text');const r=document.createRange();r.selectNodeContents(t);
 const tops=new Set([...r.getClientRects()].filter(q=>q.width>3).map(q=>Math.round(q.top)));const fr=e.getBoundingClientRect(),tr=t.getBoundingClientRect();
 return {k:t.textContent.trim(),fs:parseFloat(getComputedStyle(t).fontSize),lines:tops.size,inside:tr.right<=fr.right+0.5,h:Math.round(fr.height)};}));
ok(h.every(x=>x.lines===1&&x.inside),'④見出しは全部1行で枠の中',h.filter(x=>x.lines!==1||!x.inside).map(x=>x.k));
const std=h.filter(x=>!/月別/.test(x.k));
ok(std.every(x=>x.fs>=15),'④見出しの文字が15px以上（月別以外）',std.map(x=>x.k.slice(0,6)+':'+x.fs));
ok(new Set(h.map(x=>x.h)).size===1,'④見出しの枠の高さがそろう',[...new Set(h.map(x=>x.h))]);
// ① 表一覧のスクロール（指でなぞる）
await p.getByText('現場一覧',{exact:true}).first().tap();await p.waitForTimeout(400);await p.getByText('表一覧').first().tap();await p.waitForSelector('#recordScroll');await p.waitForTimeout(500);
const cdp=await c.newCDPSession(p);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:620}]});
for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:620-i*25}]});await p.waitForTimeout(16);}
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);
const st=await p.evaluate(()=>document.getElementById('recordScroll').scrollTop);
ok(st>100,'①表一覧を指で上へなぞると縦にスクロールする',st);
ok(!errs.length,'実行エラーなし',errs);
await b.close();console.log(bad?'NG '+bad:'ALL OK');process.exitCode=bad?1:0;})();
