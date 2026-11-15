/* 道具（○／★NGは出さない）：現場記録帳の主な画面を開き、①エラー ②字の見切れ（文字の入った部品が、見えなくする入れ物の外にはみ出す）③画面の横からのはみ出し を数える。
   使い方: node _check/_tools/kscan.js [出力の写しの置き場] [kirokucho_demo.html] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp', FILE=process.argv[3]||'kirokucho_demo.html';
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const CASES=(process.env.ONLY==='sp'?[]:[['pc1900',{viewport:{width:1900,height:950}}],['pc1366',{viewport:{width:1366,height:768}}]]).concat([['sp',{...devices['iPhone 13']}]]);
for(const [nm,opt] of CASES){
  const ctx=await b.newContext(opt); if(nm==='sp') await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','mobile'); }catch(e){} }); const p=await ctx.newPage();   /* スマホ向けの見た目で撮る */ const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
  const scan=async(view)=>{ await p.waitForTimeout(900);
    const r=await p.evaluate(()=>{ const vw=document.documentElement.clientWidth; const z=parseFloat(getComputedStyle(document.documentElement).zoom)||1; const out=[]; const side=[];
      const vis=e=>{ const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0) return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0&&q.bottom>0&&q.top<innerHeight*1.0; };
      const leaves=[...document.querySelectorAll('body *')].filter(e=>{ if(!e.childNodes.length) return false; const t=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length; return t>0&&vis(e); });
      leaves.forEach(e=>{ const q=e.getBoundingClientRect(); let a=e.parentElement; while(a&&a!==document.body){ const c=getComputedStyle(a); if(/(hidden|clip)/.test(c.overflowX+c.overflowY)) break; a=a.parentElement; }
        const ce=getComputedStyle(e); const ell=ce.textOverflow==='ellipsis';
        /* 自分の中で字が切れている */
        if(!ell&&/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+2) out.push(['中で切れ',e.tagName+'.'+String(e.className).slice(0,30),e.textContent.trim().slice(0,20),e.scrollWidth-e.clientWidth]);
        if(a&&a!==document.body){ const A=a.getBoundingClientRect(); const dx=Math.max(0,q.right-A.right-1,A.left-q.left-1), dy=Math.max(0,q.bottom-A.bottom-1,A.top-q.top-1);
          if((dx>3||dy>3)&&!ell) out.push(['外へ切れ',e.tagName+'.'+String(e.className).slice(0,30),e.textContent.trim().slice(0,20),Math.round(dx)+'x'+Math.round(dy),String(a.className||a.id).slice(0,25)]); }
        if(q.right>vw*z+2) side.push([e.tagName+'.'+String(e.className).slice(0,25),e.textContent.trim().slice(0,15),Math.round(q.right-vw*z)]); });
      const se=document.scrollingElement; return {out:out.slice(0,40), n:out.length, side:side.slice(0,8), hsc:se.scrollWidth-se.clientWidth}; });
    console.log('\n=== '+nm+' / '+view+'  見切れ'+r.n+'  横はみ出し'+r.side.length+'  ページ横スクロール'+r.hsc+'px  エラー'+errs.length);
    r.out.forEach(x=>console.log('  ',JSON.stringify(x))); r.side.forEach(x=>console.log('  横',JSON.stringify(x)));
    if(errs.length) console.log('  エラー',JSON.stringify(errs.splice(0)));
    await p.screenshot({path:OUT+'/ks_'+nm+'_'+view+'.png'}); };
  await p.evaluate(()=>{ if(typeof showView==='function') showView('list'); }); await scan('一覧');
  await p.evaluate(()=>{ if(typeof showView==='function') showView('dash'); }); await scan('ダッシュボード');
  await p.evaluate(()=>{ if(typeof showView==='function') showView('list'); goProperty(props[0].id); }); await scan('詳細_概要');
  const tabs=await p.evaluate(()=>[...document.querySelectorAll('#detail .dmenu button')].map(b=>b.textContent.trim()));
  for(let i=1;i<tabs.length;i++){ await p.evaluate(i=>document.querySelectorAll('#detail .dmenu button')[i].click(),i); await scan('詳細_'+tabs[i]); }
  await p.evaluate(()=>{ if(typeof openModal==='function') openModal(props[0].id); }); await scan('編集の窓');
  await ctx.close(); }
await b.close(); })();
