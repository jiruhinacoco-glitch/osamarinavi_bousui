/* 道具：現場詳細（PC）を「屋根22個・長い名前・長い住所」の現場で開き、字が入れ物の外へはみ出して切れている所を数えて写しを撮る（○／★NGなし） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp', FILE=process.argv[3]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const W of (process.env.WS||"1900,1366").split(",").map(Number)){ const p=await b.newPage({viewport:{width:W,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(900);
await p.evaluate(()=>{ const x=props[0]; x.name='札幌市立なんとか中学校 屋上・ペントハウス・庇・バルコニー防水改修工事（第2期）'; x.addr='北海道札幌市豊平区中の島1条8丁目3-18 北海道病院（地域医療機能推進機構）'; x.kaisu='地下1階地上7階'; x.hosho=10;
 const C=['改質アスファルトシート トーチ工法(AS-T1)','ウレタン塗膜 密着工法(X-2)','塩ビシート防水 機械固定(S-M2)'];
 x.areas=Array.from({length:22},(_,i)=>({n:'ROOF'+(i+1)+'：ルーフ'+(i+1)+'の屋根',ko:C[i%3],mk:'田島ルーフィング',ex:'露出アスファルト防水',zm:'ポリマリット',items:[{k:'平場',q:100+i*10,u:'㎡'},{k:'立上り',q:20,u:'㎡'}]})); goProperty(x.id); });
await p.waitForFunction(()=>document.querySelectorAll('#detail .dgai .dtr').length>=20);
await p.waitForFunction(()=>document.getAnimations().filter(a=>a.playState==='running'&&!a.effect.pseudoElement).length===0,null,{timeout:8000}).catch(()=>{});
await p.waitForTimeout(800);
const r=await p.evaluate(()=>{ const D=document.getElementById('detail'); const out=[]; const vis=e=>{const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0;};
 [...D.querySelectorAll('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&vis(e)).forEach(e=>{
  const ce=getComputedStyle(e); if(ce.textOverflow==='ellipsis') return; const q=e.getBoundingClientRect();
  let a=e.parentElement; while(a&&a!==D){ const c=getComputedStyle(a); if(/(hidden|clip)/.test(c.overflowX)) break; a=a.parentElement; }
  if(a&&a!==D){ const A=a.getBoundingClientRect(); const dx=Math.max(0,q.right-A.right-1); if(dx>3&&q.top<A.bottom&&q.bottom>A.top) out.push([e.tagName+'.'+String(e.className).slice(0,20),e.textContent.trim().slice(0,22),Math.round(dx),String(a.className).slice(0,30)]); }
  if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+3) out.push(['中',e.tagName+'.'+String(e.className).slice(0,20),e.textContent.trim().slice(0,22),e.scrollWidth-e.clientWidth]); });
 return out;});
console.log('=== 詳細 '+W+'px 切れ'+r.length+' エラー'+errs.length); r.slice(0,30).forEach(x=>console.log('  ',JSON.stringify(x)));
await p.screenshot({path:OUT+'/d_'+W+'.png'}); await p.evaluate(()=>{ document.getElementById('detail').scrollTop=600; }); await p.waitForTimeout(500); await p.screenshot({path:OUT+'/d_'+W+'_b.png'});
await p.close(); }
await b.close();})();
