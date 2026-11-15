/* 道具：全ページの最初の画面を PC1366／スマホで開き、エラー・字のはみ出し・横スクロールを数えて写しを撮る（○／★NGなし）
   使い方: node _check/_tools/pscan.js [写しの置き場] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp';
const PAGES=['index','hacchu','genba_map_v36','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku','zumen_sekisan'];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [nm,opt] of [['pc1366',{viewport:{width:1366,height:768}}],['sp',{...devices['iPhone 13']}]]){
 const ctx=await b.newContext(opt);
 for(const pg of PAGES){ const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
  try{ await p.goto('http://localhost:8899/'+pg+'.html',{timeout:20000}); }catch(e){ console.log(pg,'開けない'); await p.close(); continue; }
  await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>{ const out=[]; const vw=document.documentElement.clientWidth; const vis=e=>{const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0) return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0&&q.top<innerHeight&&q.bottom>0;};
   [...document.querySelectorAll('body *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&vis(e)).forEach(e=>{ const ce=getComputedStyle(e); if(ce.textOverflow==='ellipsis') return;
    if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+3&&!/(auto|scroll)/.test(ce.overflowX)) out.push(['中',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),e.scrollWidth-e.clientWidth]);
    let a=e.parentElement; while(a&&a!==document.body){ const c=getComputedStyle(a); if(/(hidden|clip|auto|scroll)/.test(c.overflowX)) break; a=a.parentElement; }
    if(a&&a!==document.body&&/(hidden|clip)/.test(getComputedStyle(a).overflowX)){ const q=e.getBoundingClientRect(),A=a.getBoundingClientRect(); const dx=Math.max(0,q.right-A.right-1,A.left-q.left-1); if(dx>3&&q.top<A.bottom-2&&q.bottom>A.top+2) out.push(['外',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),Math.round(dx),String(a.className||a.id).slice(0,22)]); } });
   const se=document.scrollingElement; return {out:out.slice(0,8), n:out.length, hsc:se.scrollWidth-se.clientWidth};});
  console.log('===',nm,pg,'切れ'+r.n,'横スクロール'+r.hsc,'エラー'+errs.length); r.out.forEach(x=>console.log('   ',JSON.stringify(x))); if(errs.length) console.log('   エラー',JSON.stringify(errs.slice(0,3)));
  await p.screenshot({path:OUT+'/ps_'+nm+'_'+pg+'.png'}); await p.close(); }
 await ctx.close(); }
await b.close();})();
