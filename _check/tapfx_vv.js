/* ★§725 タップの光・なぞりの光：iPhone でキーボードが出る／指で拡大して「見えている部分（visualViewport）」がずれているときは出さない
   （本人の動画：押した所と関係ない場所に光の跡が出た）
   ① ふだんは押すと光（.tapfx）が出る
   ② 見えている部分がずれているとき（offsetTop=250）は押しても光が出ない・なぞっても光の線を描かない
   直す前の版では ② が★NG。  使い方: node _check/tapfx_vv.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,300):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ window.__vvOff=0; const P=VisualViewport.prototype, d=Object.getOwnPropertyDescriptor(P,'offsetTop'); Object.defineProperty(P,'offsetTop',{get(){ return window.__vvOff||d.get.call(this); }}); });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  const tap=()=>p.evaluate(()=>{ const ev=t=>document.body.dispatchEvent(new PointerEvent(t,{pointerId:3,clientX:200,clientY:400,bubbles:true,pointerType:'touch',isPrimary:true,buttons:1})); ev('pointerdown'); const n=document.querySelectorAll('.tapfx').length; ev('pointerup'); return n; });
  const n1=await tap(); ok('① ふだんは押すと光が出る', n1>=1, n1);
  await p.waitForTimeout(700); await p.evaluate(()=>{ window.__vvOff=250; });
  const n2=await tap();
  const tr=await p.evaluate(async()=>{ const ev=(t,x,y)=>window.dispatchEvent(new PointerEvent(t,{pointerId:4,clientX:x,clientY:y,bubbles:true,pointerType:'touch',isPrimary:true,buttons:1})); ev('pointerdown',100,300); for(let i=1;i<=8;i++) ev('pointermove',100+i*15,300); await new Promise(r=>setTimeout(r,60));
    const cs=[...document.querySelectorAll('canvas')].filter(c=>getComputedStyle(c).position==='fixed'&&c.width>300); let lit=0; cs.forEach(c=>{ const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; for(let i=3;i<d.length;i+=4*97) if(d[i]>0){ lit++; break; } }); ev('pointerup',220,300); return {n:cs.length,lit}; });
  ok('② 見えている部分がずれているときは光も線も出ない', n2===0&&tr.lit===0, {n2,tr});
  ok('③ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
