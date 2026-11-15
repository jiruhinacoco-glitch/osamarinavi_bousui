/* 道具：屋根22個・長い工事名・長い住所の現場を、PCの一覧（2列のカード）とスマホの一覧・詳細で開き、字のはみ出しを数えて写しを撮る（○／★NGなし）
   使い方: node _check/_tools/kscan4.js [写しの置き場] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp';
const SETUP=()=>{ const x=props[0]; x.name='札幌市立なんとか中学校 屋上・ペントハウス・庇・バルコニー防水改修工事（第2期）'; x.addr='北海道札幌市豊平区中の島1条8丁目3-18 北海道病院（地域医療機能推進機構）'; x.kaisu='地下1階地上7階'; x.hosho=10;
 const C=['改質アスファルトシート トーチ工法(AS-T1)','ウレタン塗膜 密着工法(X-2)','塩ビシート防水 機械固定(S-M2)'];
 x.areas=Array.from({length:22},(_,i)=>({n:'ROOF'+(i+1)+'：ルーフ'+(i+1)+'の屋根',ko:C[i%3],mk:'田島ルーフィング',ex:'露出アスファルト防水',zm:'ポリマリット',gz:i===5?'堀江防水工業':'',items:[{k:'平場',q:100+i*10,u:'㎡'},{k:'立上り',q:20,u:'㎡'}]})); };
const SCAN=(root)=>{ const R=document.querySelector(root)||document.body; const out=[]; const vis=e=>{const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0&&q.top<innerHeight&&q.bottom>0;};
 [...R.querySelectorAll('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&vis(e)).forEach(e=>{ const ce=getComputedStyle(e); if(ce.textOverflow==='ellipsis') return;
  if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+3) out.push(['中',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),e.scrollWidth-e.clientWidth]);
  let a=e.parentElement; while(a&&a!==document.body){ const c=getComputedStyle(a); if(/(hidden|clip|auto|scroll)/.test(c.overflowX)) break; a=a.parentElement; }
  if(a&&a!==document.body&&/(hidden|clip)/.test(getComputedStyle(a).overflowX)){ const q=e.getBoundingClientRect(),A=a.getBoundingClientRect(); const dx=Math.max(0,q.right-A.right-1,A.left-q.left-1); if(dx>3&&q.top<A.bottom-2&&q.bottom>A.top+2) out.push(['外',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,18),Math.round(dx),String(a.className||a.id).slice(0,22)]); } });
 const se=document.scrollingElement; return {out:out.slice(0,12), n:out.length, hsc:se.scrollWidth-se.clientWidth}; };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ALL=[['pc1600',{viewport:{width:1600,height:900}}],['pc1900',{viewport:{width:1900,height:950}}],['sp',{...devices['iPhone 13']}],['sp360',{...devices['Galaxy S8']}],['ipad',{...devices['iPad (gen 7)']}],['ipadL',{...devices['iPad (gen 7) landscape']}]];
for(const [nm,opt] of ALL.filter(x=>!process.env.ONLY||process.env.ONLY.split(',').includes(x[0]))){
 const ctx=await b.newContext(opt); if(/^sp/.test(nm)) await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','mobile'); }catch(e){} });
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
 await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1200);
 await p.evaluate(SETUP); await p.evaluate(()=>{ if(typeof showView==='function') showView('list'); if(typeof render==='function') render(); }); await p.waitForTimeout(1500);
 let r=await p.evaluate(SCAN,'#list'); console.log('===',nm,'一覧','切れ'+r.n,'横'+r.hsc,'エラー'+errs.length); r.out.forEach(x=>console.log('   ',JSON.stringify(x)));
 await p.screenshot({path:OUT+'/k4_'+nm+'_一覧.png'});
 await p.evaluate(()=>goProperty(props[0].id)); await p.waitForTimeout(2000);
 r=await p.evaluate(SCAN,'#detail'); console.log('===',nm,'詳細','切れ'+r.n,'横'+r.hsc,'エラー'+errs.length); r.out.forEach(x=>console.log('   ',JSON.stringify(x)));
 await p.screenshot({path:OUT+'/k4_'+nm+'_詳細.png'}); if(/^sp|ipad/.test(nm)){ await p.evaluate(()=>{ const d=document.getElementById('detail'); (d.scrollHeight>d.clientHeight?d:document.scrollingElement).scrollTop=700; }); await p.waitForTimeout(600); r=await p.evaluate(SCAN,'#detail'); console.log('===',nm,'詳細(下)','切れ'+r.n); r.out.forEach(x=>console.log('   ',JSON.stringify(x))); await p.screenshot({path:OUT+'/k4_'+nm+'_詳細下.png'}); }
 if(errs.length) console.log('   エラー',JSON.stringify(errs.slice(0,3)));
 await ctx.close(); }
await b.close();})();
