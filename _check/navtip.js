/* ★2026-10-28c ナビ（メインアイコン）の長押し（nn_navtip.js）の検証
   本人「長押しで画像が保存できてしまうのでやめて。長押ししたら説明用テロップ枠に説明が流れるように。テロップ枠は長い黒線で、説明文字は白」
   ①ふつうに押す（0.08秒）→ 移動する
   ②長押し（0.7秒）→ 移動しない・（ホームは）お知らせのすぐ上に黒い帯（★2026-10-28d）・ゆっくり流れる（画面の幅いっぱい）・白い文字でそのアイコンの説明・文字が右から左へ動く
   ③押したまま別のアイコンへなぞる → そのアイコンの説明に替わる
   ④指を離しても移動しない・流れ終わったら帯が消える
   ⑤ナビの絵：右クリック／長押しのメニューを止める・選択できない（-webkit-touch-callout:none の指定がある）
   ⑥幅980のページ（現場記録帳）でも帯が同じ見た目の大きさ・ナビのすぐ上
   使い方: node _check/navtip.js（http://localhost:8899 で配信しておくこと） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,240):'')); if(!c)NG++;};
const U='http://localhost:8899/';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const errs=[];
 const open=async pg=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(pg+': '+e.message)); await p.goto(U+pg); await p.waitForTimeout(1800); return p; };
 const center=(p,k)=>p.evaluate(k=>{ const n=[...document.querySelectorAll('nav .ni')].find(e=>(e.getAttribute('onclick')||'').indexOf("'"+k+"'")>=0); n.scrollIntoView({block:'nearest',inline:'nearest'}); const r=n.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; },k);
 /* ① */
 let p=await open('index.html');
 let c=await center(p,'hacchu');
 await p.mouse.move(c.x,c.y); await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up();
 const went=await p.waitForURL(/hacchu/,{timeout:5000}).then(()=>true).catch(()=>false);
 ok('①ふつうに押すと移動する', went);
 await p.close();
 /* ② ③ ④ */
 p=await open('index.html');
 c=await center(p,'kiroku');
 await p.mouse.move(c.x,c.y); await p.mouse.down(); await p.waitForTimeout(700);
 const s2=await p.evaluate(()=>{ const t=document.getElementById('nnNavTip'); if(!t) return null; const r=t.getBoundingClientRect(), n=document.querySelector('.newsbox').getBoundingClientRect(), sp=t.querySelector('span'), cs=getComputedStyle(t);   /* ★2026-10-28d ホームはお知らせのすぐ上 */
   return {on:t.classList.contains('on'), op:+cs.opacity, bg:cs.backgroundColor, col:getComputedStyle(sp).color, txt:sp.textContent, w:Math.round(r.width), cw:document.documentElement.clientWidth,
     gap:Math.round(n.top-r.bottom), h:Math.round(r.height), x1:Math.round(sp.getBoundingClientRect().left), path:location.pathname}; });
 await p.waitForTimeout(400);
 const x2=await p.evaluate(()=>Math.round(document.querySelector('#nnNavTip span').getBoundingClientRect().left));
 ok('②長押しで移動しない・黒い帯が画面の幅いっぱいでお知らせのすぐ上・白い文字で現場記録帳の説明', s2&&s2.on&&/index/.test(s2.path)&&s2.bg==='rgb(0, 0, 0)'&&s2.col==='rgb(255, 255, 255)'&&/^現場記録帳/.test(s2.txt)&&s2.w===s2.cw&&s2.gap>=0&&s2.gap<=8, s2);
 ok('②文字が右から左へ流れる・ゆっくり（0.4秒で15〜30px＝秒速40〜75px）', s2&&s2.x1-x2>=15&&s2.x1-x2<=30, {前:s2&&s2.x1, 後:x2});
 const c2=await center(p,'map');
 await p.mouse.move(c2.x,c2.y,{steps:6}); await p.waitForTimeout(150);
 const t3=await p.evaluate(()=>document.querySelector('#nnNavTip span').textContent);
 ok('③押したままなぞると、そのアイコン（現場マップ）の説明に替わる', /^現場マップ/.test(t3), t3.slice(0,20));
 await p.mouse.up(); await p.waitForTimeout(500);
 ok('④指を離しても移動しない', /index/.test(await p.evaluate(()=>location.pathname)));
 const gone=await p.waitForFunction(()=>!document.getElementById('nnNavTip').classList.contains('on'),null,{timeout:25000})   /* ★2026-10-28d ゆっくりにしたので1回分が約18秒 */.then(()=>true).catch(()=>false);
 ok('④流れ終わったら帯が消える', gone);
 /* ⑤ */
 const s5=await p.evaluate(()=>{ const img=document.querySelector('nav .ni img'); const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true}); const r=img.dispatchEvent(ev);
   const css=document.getElementById('nnNavTipCss').textContent; return {prevented:!r, sel:getComputedStyle(img).userSelect||getComputedStyle(img).webkitUserSelect, callout:/-webkit-touch-callout:none/.test(css)}; });
 ok('⑤ナビの絵：長押し・右クリックのメニューを止める・選択できない・画像保存のメニュー（touch-callout）を出さない指定', s5.prevented&&s5.sel==='none'&&s5.callout, s5);
 await p.close();
 /* ⑥ 幅980のページ */
 await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','ichiran'); }catch(_){} });
 p=await open('kirokucho_demo.html');
 c=await center(p,'hacchu');
 await p.mouse.move(c.x,c.y); await p.mouse.down(); await p.waitForTimeout(700);
 const s6=await p.evaluate(()=>{ const t=document.getElementById('nnNavTip'), r=t.getBoundingClientRect(), cw=document.documentElement.clientWidth;
   const n={top:Math.min(...[...document.querySelectorAll('nav, nav .ni, nav .ni img')].map(e=>e.getBoundingClientRect().top))};   /* ナビの絵のいちばん上 */
   return {on:t.classList.contains('on'), txt:t.textContent.slice(0,6), w:Math.round(r.width), cw, 見た目の高さ:Math.round(r.height*393/cw), gap:Math.round(n.top-r.bottom), path:location.pathname}; });
 await p.mouse.up();
 ok('⑥幅980のページでも帯がナビ（はみ出した絵も含む）のすぐ上・見た目の高さが同じくらい（22〜34px）・移動しない', s6.on&&/^発注/.test(s6.txt)&&s6.w===s6.cw&&s6.見た目の高さ>=22&&s6.見た目の高さ<=34&&s6.gap>=0&&/kirokucho/.test(s6.path), s6);
 await p.close();
 ok('JSエラーなし', errs.length===0, errs.slice(0,3));
 console.log(NG?('★NG '+NG+'件'):'全部○');
 await b.close();
})();
