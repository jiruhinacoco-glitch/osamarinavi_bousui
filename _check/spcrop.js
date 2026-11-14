/* スマホの現場詳細（スマホ表示）：全体の絵の切り抜き・進行状況の札・表のつながり・タブの絵（2026-11-14u）。直す前の版（14t）では★NG。
   ①写真を選ぶと切り抜きの画面が出る →「✂ トリミング」→ つまみで左半分にして「この範囲で入れる」→ 入った絵が縦長になっている（出来上がりを測る）
     ★11-14v スマホはつまみ式（本人「トリミングボタンを配置して」）。直す前の版（14u）では「✂ トリミング」が無く★NG
   ②「全体を入れる」なら元の形のまま入る ③いま入っている絵を「切り抜き」ボタンで切り抜き直せる
   ④進行状況：いまの段階の札だけ大きい（ほかは高さ28px以下） ⑤表の字が欄からはみ出さない・箱がつながっている ⑥タブ6つに絵が出て横にはみ出さない
   ⑦パソコンは写真を選ぶとそのまま入る（切り抜きの画面は出ない）
   使い方: node _check/spcrop.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)NG++;};
const PIC=path.join(__dirname,'..','icons','dtab_shashin.png');   /* 148×96（横長）の絵を写真の代わりに使う */
/* つまみ（h＝e・s など）を、絵の幅・高さに対する割合（fx・fy。null＝動かさない）の位置まで引く */
const DRAG=async(p,h,fx,fy)=>{const g=await p.evaluate(h=>{const e=document.querySelector('#nnCap .croplay .sel i[data-h="'+h+'"]'), w=document.querySelector('#nnCap .capw'); if(!e||!w) return null; const a=e.getBoundingClientRect(), b=w.getBoundingClientRect(); return {cx:a.left+a.width/2,cy:a.top+a.height/2,x:b.left,y:b.top,w:b.width,h:b.height};},h); if(!g) return;
  const tx=fx==null?g.cx:g.x+g.w*fx, ty=fy==null?g.cy:g.y+g.h*fy; await p.mouse.move(g.cx,g.cy); await p.mouse.down(); await p.mouse.move((g.cx+tx)/2,(g.cy+ty)/2,{steps:3}); await p.mouse.move(tx,ty,{steps:3}); await p.mouse.up();};
const RATIO=()=>{const e=document.querySelector('#detail .dtimg .dtiw > img'); return e&&e.naturalWidth?Math.round(e.naturalWidth/e.naturalHeight*100)/100:0;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
{const ctx=await b.newContext({...devices['iPhone 13']});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(()=>{const x=props[0]; x.status='契約済'; goProperty(x.id);});
 await p.waitForFunction(()=>document.querySelectorAll('#detail .dmenu button').length>=6); await p.waitForTimeout(600);
 /* ④⑤⑥ 見た目 */
 const v=await p.evaluate(()=>{const D=document.getElementById('detail'); const H=e=>Math.round(e.getBoundingClientRect().height);
   const rail=[...D.querySelectorAll('.drailp .rail > span')].map(e=>({h:H(e),now:e.classList.contains('now')}));
   const info=D.querySelector('.dhead .drinfo'), cells=[...info.querySelectorAll(':scope > .dib')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect());
   /* 表は見た目の順（dense）と部品の順が違う → 上からの位置で並べ直してから、段と段のすき間を測る */
   cells.sort((x,y)=>x.top-y.top); let gap=0, bot=cells.length?cells[0].bottom:0; cells.forEach((r,i)=>{ if(i&&r.top>cells[i-1].top+2){ gap=Math.max(gap,Math.round(r.top-bot)); bot=r.bottom; } else bot=Math.max(bot,r.bottom); });
   const m=D.querySelector('.dmenu');
   return {rail,cut:[...info.querySelectorAll('.dib > *')].filter(e=>e.scrollWidth>e.clientWidth+1).length,gap,n:cells.length,
     ic:[...m.querySelectorAll('button > .dmi')].filter(e=>e.getBoundingClientRect().height>=20).length,msw:m.scrollWidth,mcw:m.clientWidth,
     dad:(e=>e?Math.round(e.getBoundingClientRect().height):0)(D.querySelector('.drh > .dad'))};});
 const others=v.rail.filter(r=>!r.now), now=v.rail.find(r=>r.now);
 ok(!!now&&others.every(r=>r.h<=28)&&now.h>=Math.max(...others.map(r=>r.h))+6,'④進行状況：いまの段階の札だけ大きい（ほかは28px以下）',v.rail.map(r=>r.h+(r.now?'*':'')));
 ok(v.cut===0,'⑤表の字が欄からはみ出していない',v.cut);
 ok(v.n>=4&&v.gap<=2,'⑤表の段と段がつながっている（すき間2px以下）',{n:v.n,gap:v.gap});
 ok(v.dad>=16,'⑤工事名の下に住所が出ている',v.dad);
 /* ★11-14w 工事名・住所は四角の表（斜めに切らない）。項目名の欄が、下の表の項目名と同じ左位置・同じ幅 */
 const nm=await p.evaluate(()=>{const D=document.getElementById('detail'); const R=q=>{const e=D.querySelector(q); if(!e) return null; const r=e.getBoundingClientRect(); return {x:Math.round(r.left),w:Math.round(r.width),t:Math.round(r.top),b:Math.round(r.bottom),r:Math.round(r.right),clip:getComputedStyle(e).clipPath};};
   return {dhl:R('.drh > .dhl'),h2:R('.drh > h2'),dal:R('.drh > .dal'),dad:R('.drh > .dad'),li:R('.drinfo > .dib > i'),info:R('.dhead .drinfo')};});
 ok([nm.dhl,nm.h2,nm.dal,nm.dad].every(x=>x&&x.clip==='none'),'⑨工事名・住所の欄は四角（斜めに切っていない）',[nm.dhl,nm.h2,nm.dal,nm.dad].map(x=>x&&x.clip));
 ok(nm.dhl&&nm.dal&&nm.li&&Math.abs(nm.dhl.w-nm.dal.w)<=1&&Math.abs(nm.dhl.w-nm.li.w)<=2&&Math.abs(nm.dhl.x-nm.dal.x)<=1,'⑨項目名（工事名・住所）の幅が、下の表の項目名とそろっている',{dhl:nm.dhl&&nm.dhl.w,dal:nm.dal&&nm.dal.w,li:nm.li&&nm.li.w});
 ok(nm.h2&&nm.dad&&Math.abs(nm.h2.r-nm.dad.r)<=1&&Math.abs(nm.h2.r-nm.info.r)<=1&&Math.abs(nm.dal.t-nm.dhl.b)<=2,'⑨工事名と住所が上下につながり、右端が下の表とそろっている',{h2r:nm.h2&&nm.h2.r,dadr:nm.dad&&nm.dad.r,infor:nm.info&&nm.info.r,gap:nm.dal&&nm.dhl&&nm.dal.t-nm.dhl.b});
 ok(v.ic===6&&v.msw<=v.mcw,'⑥タブ6つに絵が出て、横にはみ出さない',{ic:v.ic,sw:v.msw,cw:v.mcw});
 /* ★11-14v 1段目のボタン：「PDF」の字・縁が濃い（白地のボタンの縁の明るさが 80 以下）・5つが1段に並ぶ */
 const bt=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#detail .drh > .dops > button')]; const lum=c=>{const m=c.match(/[\d.]+/g).map(Number); return Math.round(0.299*m[0]+0.587*m[1]+0.114*m[2]);};
   return {tx:bs.map(b=>b.textContent.trim()),lum:bs.map(b=>lum(getComputedStyle(b).borderTopColor)),bw:bs.map(b=>parseFloat(getComputedStyle(b).borderTopWidth)),rows:new Set(bs.map(b=>Math.round(b.getBoundingClientRect().top))).size};});
 ok(bt.tx.includes('PDF')&&!bt.tx.includes('工事情報印刷'),'⑧1段目のボタン：「工事情報印刷」ではなく「PDF」',bt.tx);
 ok(bt.lum.every(x=>x<=80)&&bt.bw.every(x=>x>=1.4)&&bt.rows===1,'⑧1段目のボタン：縁が濃く太い・1段に並ぶ',{lum:bt.lum,bw:bt.bw,rows:bt.rows});
 /* ① 写真を選ぶ → 切り抜きの画面 → 左半分を囲む → 入れる */
 const inp=()=>p.locator('#detail input[id^="nnDtImg_"]').first();
 await inp().setInputFiles(PIC);
 const shown=await p.waitForFunction(()=>{const o=document.getElementById('nnCap'); const i=o&&o.querySelector('.capw > img'); return !!(o&&!o.classList.contains('roof')&&i&&i.getBoundingClientRect().width>40);},null,{timeout:5000}).then(()=>true).catch(()=>false);
 ok(shown,'①写真を選ぶと、切り抜きの画面が出る');
 if(shown){
   const tr=await p.locator('#nnCap [data-a="trim"]').count();
   ok(tr===1,'①切り抜きの画面に「✂ トリミング」ボタンがある',tr);
   if(tr) await p.click('#nnCap [data-a="trim"]');
   const hn=await p.evaluate(()=>[...document.querySelectorAll('#nnCap .croplay .sel i')].filter(e=>e.getBoundingClientRect().width>=20).length);
   ok(hn===8,'①押すと、つまみが8つ出る（指で押せる大きさ）',hn);
   await DRAG(p,'e',0.5,null);
   const en=await p.evaluate(()=>{const b=document.querySelector('#nnCap [data-a="sel"]'); return !!b&&!b.disabled;});
   ok(en,'①「この範囲で入れる」が押せる');
   if(en) await p.click('#nnCap [data-a="sel"]');
   await p.waitForFunction(()=>!document.getElementById('nnCap'),null,{timeout:5000}).catch(()=>{});
   await p.waitForFunction(()=>{const e=document.querySelector('#detail .dtimg .dtiw > img'); return e&&e.naturalWidth>0&&e.naturalWidth<e.naturalHeight;},null,{timeout:8000}).catch(()=>{});
   const ra=await p.evaluate(RATIO);
   ok(ra>0.6&&ra<0.95,'①入った絵が、囲んだ形（左半分＝縦長 約0.77）になっている',ra);   /* 元は 148/96＝1.54。左半分は 74/96＝0.77 */
 }
 /* ③ いまの絵を切り抜き直す：上半分 */
 const rb=p.locator('#detail .dtimg .dtbar button',{hasText:'切り抜き'}).first();
 const has=await rb.count();
 ok(has>0,'③絵が入っているとき「切り抜き」ボタンがある');
 if(has){
   const bx=await rb.boundingBox(); const vw=await p.evaluate(()=>document.documentElement.clientWidth);
   ok(!!bx&&bx.x>=0&&bx.x+bx.width<=vw+1,'③「切り抜き」ボタンが画面の中',bx&&{x:Math.round(bx.x),r:Math.round(bx.x+bx.width),vw});
   const before=await p.evaluate(RATIO);
   await rb.click();
   const sh2=await p.waitForFunction(()=>{const i=document.querySelector('#nnCap:not(.roof) .capw > img'); return !!(i&&i.getBoundingClientRect().width>40);},null,{timeout:5000}).then(()=>true).catch(()=>false);
   ok(sh2,'③押すと、いまの絵で切り抜きの画面が出る');
   if(sh2){
     await p.click('#nnCap [data-a="trim"]').catch(()=>{});
     await DRAG(p,'s',null,0.5);
     await p.click('#nnCap [data-a="sel"]').catch(()=>{});
     await p.waitForFunction(b0=>{const e=document.querySelector('#detail .dtimg .dtiw > img'); return !document.getElementById('nnCap')&&e&&e.naturalWidth>0&&Math.abs(e.naturalWidth/e.naturalHeight-b0)>0.3;},before,{timeout:8000}).catch(()=>{});
     const ra=await p.evaluate(RATIO);
     ok(ra>before*1.6,'③上半分を残すと、絵がその形（前より横長）になる',{before,after:ra});
   }
 }
 /* ② 全体を入れる */
 await inp().setInputFiles(PIC);
 const sh3=await p.waitForFunction(()=>!!document.querySelector('#nnCap:not(.roof) [data-a="all"]'),null,{timeout:5000}).then(()=>true).catch(()=>false);
 if(sh3){ await p.click('#nnCap [data-a="all"]');
   await p.waitForFunction(()=>{const e=document.querySelector('#detail .dtimg .dtiw > img'); return !document.getElementById('nnCap')&&e&&e.naturalWidth>0&&Math.abs(e.naturalWidth/e.naturalHeight-1.54)<0.08;},null,{timeout:8000}).catch(()=>{}); }
 const rc=await p.evaluate(RATIO);
 ok(sh3&&Math.abs(rc-1.54)<0.08,'②「全体を入れる」なら、元の形（1.54）のまま入る',rc);
 ok(errs.length===0,'エラーが出ていない（スマホ）',errs.slice(0,3));
 await ctx.close();}
{const ctx=await b.newContext({viewport:{width:1600,height:900}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(()=>{goProperty(props[0].id);}); await p.waitForFunction(()=>!!document.querySelector('#detail input[id^="nnDtImg_"]')); await p.waitForTimeout(600);
 await p.locator('#detail input[id^="nnDtImg_"]').first().setInputFiles(PIC);
 await p.waitForFunction(()=>{const e=document.querySelector('#detail .dtimg .dtiw > img'); return e&&e.naturalWidth>0;},null,{timeout:8000}).catch(()=>{});
 const r=await p.evaluate(()=>{const e=document.querySelector('#detail .dtimg .dtiw > img'); return {cap:!!document.getElementById('nnCap'),ra:e&&e.naturalWidth?Math.round(e.naturalWidth/e.naturalHeight*100)/100:0,btn:[...document.querySelectorAll('#detail .dtimg .dtbar button')].filter(x=>x.textContent.trim()==='切り抜き').length};});
 ok(!r.cap&&Math.abs(r.ra-1.54)<0.08,'⑦パソコン：写真を選ぶとそのまま入る（切り抜きの画面は出ない）',r);
 ok(r.btn===0,'⑦パソコン：「切り抜き」ボタンは出さない',r.btn);
 ok(errs.length===0,'エラーが出ていない（パソコン）',errs.slice(0,3));
 await ctx.close();}
await b.close();
console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
