/* 道具：工事情報印刷（exportPDF）を、屋根22個・長い名前の現場で開き、A4横で紙に出した形（PDF）と写しを作って、字の見切れを数える（○／★NGなし）
   使い方: node _check/_tools/kpdf.js [写しの置き場] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:1366,height:900}}); const p=await ctx.newPage();
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForFunction(()=>typeof exportPDF==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1200);
await p.evaluate(()=>{ const x=props[0]; x.name='札幌市立なんとか中学校 屋上・ペントハウス・庇・バルコニー防水改修工事（第2期）'; x.addr='北海道札幌市豊平区中の島1条8丁目3-18 北海道病院（地域医療機能推進機構）'; x.kaisu='地下1階地上7階'; x.hosho=10;
  const C=['改質アスファルトシート トーチ工法(AS-T1)','ウレタン塗膜 密着工法(X-2)','塩ビシート防水 機械固定(S-M2)'];
  x.areas=Array.from({length:22},(_,i)=>({n:'ROOF'+(i+1)+'：ルーフ'+(i+1)+'の屋根',ko:C[i%3],mk:'田島ルーフィング',ex:'露出アスファルト防水',zm:'ポリマリット',gz:i===5?'堀江防水工業':'',items:[{k:'平場',q:100+i*10,u:'㎡'},{k:'立上り',q:20,u:'㎡'}].concat(i===3?[{k:'役物周り',q:3,a:20,u:'か所'}]:[])})); });
const pop=ctx.waitForEvent('page'); await p.evaluate(()=>{ window.print=()=>{}; exportPDF(props[0].id); }); const w=await pop; await w.waitForLoadState(); await w.evaluate(()=>{ window.print=()=>{}; }); await w.waitForTimeout(1500);
const r=await w.evaluate(()=>{ const out=[]; [...document.querySelectorAll('body *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).forEach(e=>{ const ce=getComputedStyle(e); if(ce.display==='none') return;
   if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+2&&ce.textOverflow!=='ellipsis') out.push([e.tagName+'.'+String(e.className).slice(0,15),e.textContent.trim().slice(0,20),e.scrollWidth-e.clientWidth]); });
  return {out:out.slice(0,15), n:out.length, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth};});
console.log('=== 印刷の画面 切れ'+r.n, '横', r.sw, r.cw); r.out.forEach(x=>console.log('   ',JSON.stringify(x)));
await w.emulateMedia({media:'print'}); await w.pdf({path:OUT+'/kpdf.pdf',format:'A4',landscape:true,printBackground:true});
const r2=await w.evaluate(()=>{ const out=[]; [...document.querySelectorAll('body *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).forEach(e=>{ const ce=getComputedStyle(e); if(ce.display==='none') return;
   if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+2&&ce.textOverflow!=='ellipsis') out.push([e.tagName+'.'+String(e.className).slice(0,15),e.textContent.trim().slice(0,20),e.scrollWidth-e.clientWidth]); });
  return {out:out.slice(0,15), n:out.length};});
console.log('=== 紙の形（print） 切れ'+r2.n); r2.out.forEach(x=>console.log('   ',JSON.stringify(x)));
await w.setViewportSize({width:1123,height:794}); await w.screenshot({path:OUT+'/kpdf.png',fullPage:true});
await b.close();})();
