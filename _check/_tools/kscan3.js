/* 道具：ダッシュボードの左の項目を全部・表一覧を、いくつかの幅で開いて字のはみ出しを数え、写しを撮る（○／★NGなし） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp', FILE=process.argv[3]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const chk=async(p,tag)=>{ await p.waitForFunction(()=>document.getAnimations().filter(a=>a.playState==='running'&&!a.effect.pseudoElement&&a.effect.getTiming().iterations!==Infinity).length===0,null,{timeout:5000}).catch(()=>{}); await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{ const out=[]; const vis=e=>{const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0&&q.top<innerHeight&&q.bottom>0;};
   [...document.querySelectorAll('main *, #dashboard *, #list *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&vis(e)).forEach(e=>{
    const ce=getComputedStyle(e); if(ce.textOverflow==='ellipsis') return; const q=e.getBoundingClientRect();
    let a=e.parentElement; while(a&&a!==document.body){ const c=getComputedStyle(a); if(/(hidden|clip)/.test(c.overflowX)) break; a=a.parentElement; }
    if(a&&a!==document.body){ const A=a.getBoundingClientRect(); const dx=Math.max(0,q.right-A.right-1,A.left-q.left-1); if(dx>3&&q.top<A.bottom-2&&q.bottom>A.top+2) out.push([e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),Math.round(dx),String(a.className||a.id).slice(0,25)]); } });
   const seen=new Set(); return out.filter(x=>{const k=x[0]+x[3]; if(seen.has(k)) return false; seen.add(k); return true;}).slice(0,12);});
  console.log('=== '+tag+' 切れ'+r.length); r.forEach(x=>console.log('  ',JSON.stringify(x))); await p.screenshot({path:OUT+'/k3_'+tag+'.png'}); };
const {devices}=require('/opt/node22/lib/node_modules/playwright');
for(const W of (process.env.WS||'1600,1280').split(',')){ const ctx=W==='sp'?await b.newContext({...devices['iPhone 13']}):await b.newContext({viewport:{width:+W,height:860}}); if(W==='sp') await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','mobile'); }catch(e){} }); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof props!=='undefined'); await p.waitForTimeout(1200);
 await p.evaluate(()=>showView('dash')); await p.waitForTimeout(800);
 const ks=await p.evaluate(()=>[...document.querySelectorAll('#dashboard .nn-dnav button[data-k]')].map(b=>b.dataset.k+':'+b.textContent.trim().slice(0,8)));
 for(const k of ks){ await p.evaluate(k=>document.querySelector('#dashboard .nn-dnav button[data-k="'+k+'"]').click(),k.split(':')[0]); await chk(p,W+'_dash_'+k.split(':')[1]); }
 await p.evaluate(()=>showView('list')); await p.waitForTimeout(500);
 const tb=await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/表一覧/.test(x.textContent)&&x.offsetParent); if(b){ b.click(); return true;} return false;}); await p.waitForTimeout(800); await chk(p,W+'_表一覧');
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/^カード/.test(x.textContent.trim())&&x.offsetParent); b&&b.click(); });
 console.log('エラー',W,JSON.stringify(errs)); await p.close(); }
await b.close();})();
