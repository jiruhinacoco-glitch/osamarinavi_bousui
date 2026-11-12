/* スマホ表示の現場詳細：タブ（概要・写真…）が開いた直後から見え、下へ送っても残り、指で押せる高さがある。
   一覧用の道具（カード・表一覧・検索）は詳細のあいだ出ない。直す前の版（2026-11-12zz まで）は★NG。
   使い方: node _check/dtabtop.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
/* ---- スマホ表示 ---- */
{const ctx=await b.newContext({...devices['iPhone 13']});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(()=>goProperty(props[0].id)); await p.waitForFunction(()=>document.querySelectorAll('#detail .dmenu button').length>=6);
 /* 見えている範囲＝詳細の箱と、下の帯（#nav）の上はしの、せまいほう */
 const M=()=>p.evaluate(()=>{const D=document.getElementById('detail'),dr=D.getBoundingClientRect(),nav=document.getElementById('nav');
   const bot=Math.min(dr.bottom,nav?nav.getBoundingClientRect().top:1e9);
   const tb=document.getElementById('toolbar');
   const bs=[...D.querySelectorAll('.dmenu button')].map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent.trim(),x:r.left,y:r.top,w:r.width,h:r.height,on:e.classList.contains('on')};});
   const body=document.getElementById('tabbody').getBoundingClientRect();
   return {top:dr.top,bot,vis:bot-dr.top,vh:document.documentElement.clientHeight,vw:document.documentElement.clientWidth,tbH:tb?tb.getBoundingClientRect().height:0,bs,bodyTop:body.top,st:D.scrollTop,sh:D.scrollHeight};});
 let m=await M();
 const inV=(q,m)=>q.y>=m.top-1&&q.y+q.h<=m.bot+1;
 ok(m.tbH===0,'詳細のあいだ、一覧用の道具（カード・表一覧・検索）は出ない',m.tbH);
 ok(m.vis/m.vh>=0.7,'詳細が見える範囲が画面の7割以上',Math.round(m.vis/m.vh*100)+'%');
 ok(m.bs.length===7&&m.bs.every(q=>inV(q,m)),'開いた直後に、タブが全部 見える高さにある',m.bs.map(q=>Math.round(q.y)));
 ok(m.bs.every(q=>q.h>=40),'タブの高さが40px以上（指で押せる）',m.bs.map(q=>Math.round(q.h)));
 ok(m.bs.filter(q=>q.x>=0&&q.x+q.w<=m.vw).length>=4,'横に4つ以上のタブが切れずに見える',m.bs.filter(q=>q.x>=0&&q.x+q.w<=m.vw).length);
 /* 一番下まで送る → タブは残る */
 await p.evaluate(()=>{const D=document.getElementById('detail');D.scrollTop=D.scrollHeight;}); await p.waitForTimeout(300);
 m=await M();
 ok(m.st>200&&m.bs.every(q=>inV(q,m)),'一番下まで送っても、タブは見えたまま',{st:Math.round(m.st),y:Math.round(m.bs[0].y)});
 /* 指で「写真」を押す → 写真になり、中身の先頭がタブのすぐ下に来る */
 await p.evaluate(()=>{document.getElementById('detail').scrollTop=0;}); await p.waitForTimeout(200);
 const ph=(await M()).bs.find(q=>q.t==='写真');
 await p.touchscreen.tap(ph.x+ph.w/2,ph.y+ph.h/2);
 await p.waitForFunction(()=>{const o=document.querySelector('#detail .dmenu button.on');return o&&o.textContent.trim()==='写真';},null,{timeout:4000}).catch(()=>{});
 /* 送ると下の帯が引っ込んで箱が伸びる → 位置が落ち着くまで待ってから測る（同じ値が2回続くまで） */
 {let prev=null; for(let i=0;i<20;i++){ await p.waitForTimeout(250); m=await M(); const k=Math.round(m.bodyTop)+'/'+Math.round(m.bot); if(k===prev) break; prev=k; }}
 const on=m.bs.find(q=>q.on), stripBot=Math.max(...m.bs.map(q=>q.y+q.h));
 ok(on&&on.t==='写真','「写真」を押すと写真のタブになる',on&&on.t);
 ok(m.bodyTop>=stripBot-1&&m.bodyTop<=stripBot+20,'押したあと、中身の先頭がタブのすぐ下に来る',{bodyTop:Math.round(m.bodyTop),stripBot:Math.round(stripBot)});
 /* 右はしのタブを選んでも、選んだタブが見えている */
 await p.evaluate(()=>setTab('エクスポート')); await p.waitForTimeout(300); m=await M();
 const ex=m.bs.find(q=>q.on);
 ok(ex&&ex.x>=0&&ex.x+ex.w<=m.vw+1&&inV(ex,m),'右はしのタブ（エクスポート）を選ぶと、そのタブが帯の中に見える',ex&&{t:ex.t,x:Math.round(ex.x),r:Math.round(ex.x+ex.w)});
 /* 一覧へ戻ると道具が戻る */
 await p.evaluate(()=>backToList()); await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.getElementById('toolbar').getBoundingClientRect().height>20),'一覧へ戻ると、道具（検索など）が戻る');
 ok(errs.length===0,'エラーが出ない',errs.slice(0,2));
 await ctx.close();}
/* ---- PC は今までどおり（左に縦のメニュー） ---- */
{const ctx=await b.newContext({viewport:{width:1600,height:900}});
 const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(()=>goProperty(props[0].id)); await p.waitForFunction(()=>document.querySelectorAll('#detail .dmenu button').length>=6);
 const r=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#detail .dmenu button')].map(e=>e.getBoundingClientRect());const tb=document.getElementById('tabbody').getBoundingClientRect();
   return {sameX:bs.every(q=>Math.abs(q.left-bs[0].left)<1),down:bs.every((q,i)=>i===0||q.top>bs[i-1].top),right:tb.left>bs[0].right,w:Math.round(bs[0].width)};});
 ok(r.sameX&&r.down&&r.right&&r.w===170,'PCは今までどおり：左に縦のメニュー（幅170）・右に中身',r);
 await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();
})().catch(e=>{console.log('★NG 検査が途中で止まった  '+String(e.message).split('\n')[0].slice(0,100)); process.exit(1);});
