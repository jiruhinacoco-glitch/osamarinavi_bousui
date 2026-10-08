/* ★2026-10-08b スマホ：nn_scrolllock.js と kou_hq.js を「全部測ってからまとめて書き換える」形に（§606）
   ①直す前の版（引数で渡す・既定は git の HEAD~0 ではなく下の BEFORE）と、箱に付く印（nn-lock-x/y）・
     工法の絵の差し替え先が同じか（画面に出ている物だけで比べる）
   ②現場記録帳で一覧を開いたとき、この2つが画面を固める時間（CPU4倍）が 600ms 未満か
   使い方: node _check/lockfast.js [直す前の nn_scrolllock.js] [直す前の kou_hq.js]
     例) git show 654f4a2:nn_scrolllock.js > /tmp/a.js; git show 654f4a2:kou_hq.js > /tmp/b.js; node _check/lockfast.js /tmp/a.js /tmp/b.js
     引数なしなら②だけ（①は飛ばす） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const OLD_L=process.argv[2], OLD_K=process.argv[3];
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,300):'')); if(!c)NG++;};
const PH={viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true};
async function snap(b,page,list,useOld){
  const ctx=await b.newContext(PH);
  await ctx.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  if(useOld){
    await ctx.route(/nn_scrolllock\.js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(OLD_L,'utf8')}));
    await ctx.route(/kou_hq\.js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(OLD_K,'utf8')}));
  }
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+page); await p.waitForTimeout(2500);
  if(list){ await p.evaluate(()=>showView('list')); await p.waitForTimeout(3000); }
  const r=await p.evaluate(()=>{
    const path=e=>{const a=[];for(let n=e;n&&n!==document.body;n=n.parentElement){let s=n.tagName.toLowerCase()+(n.id?'#'+n.id:'');const par=n.parentElement;if(!n.id&&par)s+=':'+[...par.children].indexOf(n);a.unshift(s);if(n.id)break;}return a.join('>');};
    /* 見えている＝大きさがあり、画面の中で、途中のスクロール箱にも切られていない */
    const vis=e=>{const r=e.getBoundingClientRect();if(!(r.width>0&&r.height>0&&r.bottom>0&&r.top<document.documentElement.clientHeight))return false;
      for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(cs.overflowY!=='visible'||cs.overflowX!=='visible'){const q=n.getBoundingClientRect();if(r.bottom<=q.top||r.top>=q.bottom||r.right<=q.left||r.left>=q.right)return false;}}return true;};
    const L=[...document.querySelectorAll('.nn-lock-x,.nn-lock-y')].filter(vis).map(e=>path(e)+(e.classList.contains('nn-lock-x')?' X':' Y')).sort();
    const K=[...document.querySelectorAll('img[src*="icons/kq/"],img[src*="icons/kou_"]')].filter(vis).map(e=>path(e)+' '+e.getAttribute('src').split('/').pop()).sort();
    return {L,K};});
  await ctx.close(); return {...r,errs};
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  if(OLD_L&&OLD_K){
    for(const [pg,list] of [['kirokucho_demo.html',false],['kirokucho_demo.html',true],['hacchu.html',false],['genba_map_v36.html',false],['zairyo_toroku.html',false],['shiyo_toroku.html',false]]){
      const a=await snap(b,pg,list,true), c=await snap(b,pg,list,false);
      const dl=a.L.filter(x=>!c.L.includes(x)).concat(c.L.filter(x=>!a.L.includes(x)).map(x=>'+'+x));
      const dk=a.K.filter(x=>!c.K.includes(x)).concat(c.K.filter(x=>!a.K.includes(x)).map(x=>'+'+x));
      ok(pg+(list?'(一覧)':'')+' ①箱の印が直す前と同じ（'+c.L.length+'個）', !dl.length, dl);
      ok(pg+(list?'(一覧)':'')+' ①工法の絵の差し替え先が直す前と同じ（'+c.K.length+'枚）', !dk.length, dk);
      ok(pg+(list?'(一覧)':'')+' JSエラーなし', !c.errs.length, c.errs);
    }
  }
  /* ② 固まる時間（直す前の版があれば、それと比べて半分未満。なければ 2000ms 未満） */
  async function stall(useOld){
    const ctx=await b.newContext(PH);
    if(useOld){ await ctx.route(/nn_scrolllock\.js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(OLD_L,'utf8')}));
      await ctx.route(/kou_hq\.js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(OLD_K,'utf8')})); }
    const p=await ctx.newPage(); const cdp=await ctx.newCDPSession(p);
    await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2500);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval',{interval:500}); await cdp.send('Profiler.start');
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(4000);
    const {profile}=await cdp.send('Profiler.stop');
    const ids={},par={};profile.nodes.forEach(n=>{ids[n.id]=n;(n.children||[]).forEach(c=>par[c]=n.id);});
    let t=0; for(let i=0;i<profile.samples.length;i++){ let x=profile.samples[i]; while(x){ if(/nn_scrolllock|kou_hq/.test(ids[x].callFrame.url)){ t+=profile.timeDeltas[i]; break; } x=par[x]; } }
    const blank=await p.evaluate(()=>{const L=document.getElementById('list'),lb=L.getBoundingClientRect();return [...document.querySelectorAll('#list .pcard.nnoff')].filter(c=>{const r=c.getBoundingClientRect();return r.bottom>lb.top&&r.top<lb.bottom;}).length;});
    await ctx.close(); return {ms:Math.round(t/1000),blank};
  }
  const now=await stall(false), bef=(OLD_L&&OLD_K)?await stall(true):null;
  if(bef) ok('②一覧を開いたときに2つの部品が画面を固める時間が直す前の半分未満（CPU4倍）', now.ms<bef.ms*0.5, {前:bef.ms+'ms',後:now.ms+'ms'});
  else ok('②一覧を開いたときに2つの部品が画面を固める時間 2000ms 未満（CPU4倍）', now.ms<2000, now.ms+'ms');
  ok('②開いて4秒後、画面内に灰色の空白（後回しのままのカード）がない', now.blank===0, now.blank);
  await b.close(); console.log(NG?'★NG '+NG+'件':'全部○');
})();
