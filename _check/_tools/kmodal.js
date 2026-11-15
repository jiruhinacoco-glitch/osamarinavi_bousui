/* 道具：屋根22個・長い名前の現場で「編集」の窓を開き、字のはみ出し・横のはみ出しを数えて写しを撮る（○／★NGなし）
   使い方: node _check/_tools/kmodal.js [写しの置き場] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [nm,opt] of [['pc1366',{viewport:{width:1366,height:768}}],['pc1900',{viewport:{width:1900,height:950}}],['sp',{...devices['iPhone 13']}]]){
 const ctx=await b.newContext(opt); if(nm==='sp') await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','mobile'); }catch(e){} });
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
 await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForFunction(()=>typeof openModal==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1200);
 await p.evaluate(()=>{ const x=props[0]; x.name='札幌市立なんとか中学校 屋上・ペントハウス・庇・バルコニー防水改修工事（第2期）'; const C=['改質アスファルトシート トーチ工法(AS-T1)','ウレタン塗膜 密着工法(X-2)','塩ビシート防水 機械固定(S-M2)'];
   x.areas=Array.from({length:22},(_,i)=>({n:'ROOF'+(i+1)+'：ルーフ'+(i+1)+'の屋根',ko:C[i%3],mk:'田島ルーフィング',ex:'露出アスファルト防水',zm:'ポリマリット',gz:i===5?'堀江防水工業':'',items:[{k:'平場',q:100+i*10,u:'㎡'},{k:'立上り',q:20,u:'㎡'},{k:'屋根内周',q:40,u:'m'}].concat(i===3?[{k:'役物周り',q:3,a:20,u:'か所'}]:[])})); openModal(x.id); });
 await p.waitForTimeout(2000);
 const r=await p.evaluate(()=>{ const R=document.getElementById('modalbg'); const out=[]; const vis=e=>{const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0;};
  [...R.querySelectorAll('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&vis(e)).forEach(e=>{ const ce=getComputedStyle(e); if(ce.textOverflow==='ellipsis') return;
   if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+3) out.push(['中',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),e.scrollWidth-e.clientWidth]);
   let a=e.parentElement; while(a&&a!==R){ const c=getComputedStyle(a); if(/(hidden|clip|auto|scroll)/.test(c.overflowX)) break; a=a.parentElement; }
   if(a&&a!==R&&/(hidden|clip)/.test(getComputedStyle(a).overflowX)){ const q=e.getBoundingClientRect(),A=a.getBoundingClientRect(); const dx=Math.max(0,q.right-A.right-1,A.left-q.left-1); if(dx>3&&q.top<A.bottom-2&&q.bottom>A.top+2) out.push(['外',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),Math.round(dx),String(a.className||a.id).slice(0,22)]); } });
  const ins=[...R.querySelectorAll('input,select')].filter(vis).filter(e=>{ const q=e.getBoundingClientRect(); let a=e.parentElement; while(a&&a!==R){ if(/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) break; a=a.parentElement; } if(!a||a===R) return false; const A=a.getBoundingClientRect(); return q.right>A.right+3; }).map(e=>e.className+'|'+(e.placeholder||'').slice(0,10));
  const m=R.querySelector('.modal'); return {out:out.slice(0,12), n:out.length, ins:ins.slice(0,6), mw:m?[m.scrollWidth,m.clientWidth]:null};});
 console.log('===',nm,'編集の窓','切れ'+r.n,'欄のはみ出し'+r.ins.length,'窓の横',JSON.stringify(r.mw),'エラー'+errs.length); r.out.forEach(x=>console.log('   ',JSON.stringify(x))); r.ins.forEach(x=>console.log('   欄',x));
 await p.screenshot({path:OUT+'/km_'+nm+'.png'});
 await ctx.close(); }
await b.close();})();
