/* 検査：数字の入力欄は、スマホではiPhoneのキーボードではなく自前の数字パッド（nn_numpad.js）で入れる（2026-09-26p・本人の指摘）
   node _check/numpad.js      前提： python3 -m http.server 8899   ※直す前の版では★NG（パッドが無い）
   ・図面・積算の入口（パラペット設定の「立上り」）：押した瞬間にパッドが出る・入力欄にフォーカスしない（＝キーボードが出ない）
     1文字目は置き換え・打つたびに値が変わる（input）・「✓ 確定」で change・閉じる
   ・「次へ ↓」で次の数字欄へ移る
   ・パッドの外を押すと閉じる
   ・パソコンでは出ない（今までどおりキーボード）
   ・全11ページで nn_numpad.js を読み込んでいる */
const fs=require('fs');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); };
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const PAGES=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'];
(async()=>{
 const miss=PAGES.filter(p=>!/<script src="\.\/nn_numpad\.js/.test(fs.readFileSync(p+'.html','utf8')));
 ok(miss.length===0,'全11ページで数字パッドを読み込む',miss);
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:393,height:852},screen:{width:393,height:852},isMobile:true,hasTouch:true,userAgent:UA});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8899/zumen_sekisan.html');
 await p.waitForFunction(()=>{const i=document.querySelector('input.pvH');return i&&i.getBoundingClientRect().height>0;},null,{timeout:15000});
 await p.evaluate(()=>{const i=document.querySelector('input.pvH');i.id=i.id||'tPvH';i.scrollIntoView({block:'center'});
   window.__ev=[];['input','change'].forEach(t=>i.addEventListener(t,()=>__ev.push(t+':'+i.value)));});
 const r=await p.evaluate(()=>{const q=document.getElementById('tPvH').getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};});
 const t0=Date.now(); await p.touchscreen.tap(r.x,r.y);
 await p.waitForFunction(()=>{const d=document.getElementById('nnNumpad');return d&&d.classList.contains('open');},null,{timeout:3000}).catch(()=>{});
 const s1=await p.evaluate(()=>{const d=document.getElementById('nnNumpad'),i=document.getElementById('tPvH');
   return {open:!!d&&d.classList.contains('open'),focus:document.activeElement===i,im:i.getAttribute('inputmode'),val:d&&d.querySelector('.np-v').textContent,lb:d&&d.querySelector('.np-l').textContent,
     h:d?Math.round(d.getBoundingClientRect().height):0,vh:document.documentElement.clientHeight};});
 ok(s1.open,'「立上り」を押すとパッドが出る',{ms:Date.now()-t0});
 ok(!s1.focus,'入力欄にフォーカスしない（iPhoneのキーボードが出ない）',s1.focus);
 ok(s1.val==='300','パッドに今の値が出る',s1.val);
 ok(s1.h>0&&s1.h<=s1.vh*0.4,'パッドはコンパクト（画面の4割以下）',{h:s1.h,vh:s1.vh});
 const tapKey=async k=>{const q=await p.evaluate(k=>{const e=document.querySelector('#nnNumpad [data-k="'+k+'"]').getBoundingClientRect();return {x:e.left+e.width/2,y:e.top+e.height/2};},k);await p.touchscreen.tap(q.x,q.y);};
 await tapKey('4');await tapKey('5');await tapKey('0');
 const s2=await p.evaluate(()=>({v:document.getElementById('tPvH').value,ev:__ev.slice()}));
 ok(s2.v==='450','1文字目で置き換え・続けて打てる（300→450）',s2);
 ok(s2.ev.includes('input:450')&&!s2.ev.some(x=>/^change/.test(x)),'打つたびに input（確定前は change しない）',s2.ev);
 await tapKey('ok');
 const s3=await p.evaluate(()=>({open:document.getElementById('nnNumpad').classList.contains('open'),ev:__ev.slice()}));
 ok(!s3.open&&s3.ev.includes('change:450'),'「✓ 確定」で change・閉じる',s3);
 /* 次へ */
 await p.touchscreen.tap(r.x,r.y);
 const before=await p.evaluate(()=>document.querySelector('.nnpad-on')&&document.querySelector('.nnpad-on').id);
 await tapKey('nx'); await p.waitForTimeout(250);
 const nx=await p.evaluate(()=>{const e=document.querySelector('.nnpad-on');return {id:e&&(e.id||e.className),open:document.getElementById('nnNumpad').classList.contains('open')};});
 ok(before==='tPvH'&&nx.open&&nx.id&&nx.id!=='tPvH','「次へ ↓」で次の数字欄へ',{before,nx});
 /* 外を押すと閉じる */
 await p.touchscreen.tap(20,120); await p.waitForTimeout(100);
 ok(await p.evaluate(()=>!document.getElementById('nnNumpad').classList.contains('open')&&!document.querySelector('.nnpad-on')),'パッドの外を押すと閉じる');
 /* 小数：step が整数なら「.」は押せない */
 await p.touchscreen.tap(r.x,r.y);
 ok(await p.evaluate(()=>document.querySelector('#nnNumpad [data-k="."]').disabled&&document.querySelector('#nnNumpad [data-k="pm"]').disabled),'きざみが整数・0以上の欄は「.」「±」を押せない');
 await tapKey('ok');
 ok(errs.length===0,'JSエラーなし（スマホ）',errs.slice(0,2));
 /* 幅980で組むページ（国交省仕様の一覧表示）：パッドは実寸 */
 const c2=await b.newContext({viewport:{width:393,height:852},screen:{width:393,height:852},isMobile:true,hasTouch:true,userAgent:UA});
 await c2.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','ichiran');}catch(e){}});
 const p2=await c2.newPage(); await p2.goto('http://127.0.0.1:8899/zairyo_toroku.html'); await p2.waitForTimeout(1500);
 const z=await p2.evaluate(()=>{const cw=document.documentElement.clientWidth;const i=[...document.querySelectorAll('input[type=number],input[inputmode=decimal],input[inputmode=numeric]')][0];
   if(!i)return {cw,none:true}; nnNumpadOpen(i); const d=document.getElementById('nnNumpad'),r=d.getBoundingClientRect(),g=d.querySelector('[data-k="7"]').getBoundingClientRect();
   return {cw,w:Math.round(r.width),key:Math.round(g.height*screen.width/cw)};});
 ok(z.none||z.w>=z.cw-2,'幅980のページでもパッドは画面の横いっぱい',z);
 ok(z.none||(z.key>=38&&z.key<=50),'幅980のページでもボタンは実寸で約44px',z);
 await c2.close();
 /* パソコン：出ない */
 const pc=await b.newPage({viewport:{width:1300,height:850}});
 await pc.goto('http://127.0.0.1:8899/zumen_sekisan.html');
 await pc.waitForFunction(()=>{const i=document.querySelector('input.pvH');return i&&i.getBoundingClientRect().height>0;},null,{timeout:15000});
 await pc.evaluate(()=>{document.querySelector('input.pvH').id='tPvH';});
 await pc.click('#tPvH');
 const q=await pc.evaluate(()=>({pad:!!document.querySelector('#nnNumpad.open'),focus:document.activeElement&&document.activeElement.id}));
 ok(!q.pad&&q.focus==='tPvH','パソコンではパッドを出さず、今までどおり入力欄に入る',q);
 console.log(ng?('★NG '+ng+'件'):'すべて○'); await b.close(); process.exit(ng?1:0);
})();
