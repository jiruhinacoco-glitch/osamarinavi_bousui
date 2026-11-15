/* 道具：全体の絵の画面（nnRoofBig）を屋根22個の現場で PC1366・スマホで開き、字のはみ出しを数えて写しを撮る（○／★NGなし）
   使い方: node _check/_tools/kbig.js [写しの置き場] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [nm,opt] of [['pc1366',{viewport:{width:1366,height:768}}],['sp',{...devices['iPhone 13']}]]){
 const ctx=await b.newContext(opt); if(nm==='sp') await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','mobile'); }catch(e){} });
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
 await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1200);
 await p.evaluate(()=>{ window.nnPhoto2Of=function(){ return './icons/roofph_2.jpg'; }; const x=props[0]; const C=['改質アスファルトシート トーチ工法(AS-T1)','ウレタン塗膜 密着工法(X-2)','塩ビシート防水 機械固定(S-M2)'];
   x.areas=Array.from({length:22},(_,i)=>({n:'ROOF'+(i+1)+'：ルーフ'+(i+1)+'の屋根',ko:C[i%3],mk:'田島ルーフィング',ex:'露出アスファルト防水',gz:i===5?'堀江防水工業':'',px:.1+.035*i,py:.2+.03*i,items:[{k:'平場',q:100+i*10,u:'㎡'},{k:'立上り',q:20,u:'㎡'}]})); goProperty(x.id); });
 await p.waitForTimeout(1800);
 await p.evaluate(()=>nnRoofBig(props[0].id,'view')); await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{ const R=document.getElementById('nnCap')||document.body; const out=[]; const vis=e=>{const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0&&q.top<innerHeight&&q.bottom>0;};
  [...R.querySelectorAll('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&vis(e)).forEach(e=>{ const ce=getComputedStyle(e); if(ce.textOverflow==='ellipsis') return;
   if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+3) out.push(['中',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),e.scrollWidth-e.clientWidth]);
   let a=e.parentElement; while(a&&a!==R){ const c=getComputedStyle(a); if(/(hidden|clip|auto|scroll)/.test(c.overflowX)) break; a=a.parentElement; }
   if(a&&a!==R&&/(hidden|clip)/.test(getComputedStyle(a).overflowX)){ const q=e.getBoundingClientRect(),A=a.getBoundingClientRect(); const dx=Math.max(0,q.right-A.right-1,A.left-q.left-1); if(dx>3&&q.top<A.bottom-2&&q.bottom>A.top+2) out.push(['外',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),Math.round(dx),String(a.className||a.id).slice(0,22)]); } });
  const se=document.scrollingElement; return {open:!!document.getElementById('nnCap'), out:out.slice(0,12), n:out.length, hsc:se.scrollWidth-se.clientWidth};});
 console.log('===',nm,'全体の絵','開いた'+r.open,'切れ'+r.n,'横'+r.hsc,'エラー'+errs.length); r.out.forEach(x=>console.log('   ',JSON.stringify(x))); if(errs.length) console.log('   ',JSON.stringify(errs.slice(0,2)));
 await p.screenshot({path:OUT+'/kb_'+nm+'.png'});
 /* 屋根の行を1つ押して写真の帯を出す */
 await p.evaluate(()=>{ const tr=document.querySelector('#nnCap .capside tbody tr'); tr&&tr.click(); }); await p.waitForTimeout(800); await p.screenshot({path:OUT+'/kb_'+nm+'_sel.png'});
 await ctx.close(); }
await b.close();})();
