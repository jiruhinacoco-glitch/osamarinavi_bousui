/* 大きな写真を入れても、ちゃんと小さくなって保存されるか・記憶を食いつぶさないか。
   ★いまのスマホの写真は1枚10MBを超える。読み込み方が悪いと古い端末で落ちる。
   ★ブラウザが直に読む道（createImageBitmap）と、昔ながらの道の両方を確かめる。
   使い方: node _check/photoimg.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;
const ok=(t,c,x)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(x!==undefined?'  '+JSON.stringify(x).slice(0,130):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const 直に of [true,false]){
  const ctx=await b.newContext({viewport:{width:1500,height:950}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
  if(!直に) await p.addInitScript(()=>{ try{ delete window.createImageBitmap; }catch(_){ window.createImageBitmap=undefined; } });
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(2000);
  const r=await p.evaluate(async()=>{
    /* 4000×3000 のでかい写真を作る */
    const c=document.createElement('canvas'); c.width=4000; c.height=3000;
    const g=c.getContext('2d');
    for(let i=0;i<40;i++){ g.fillStyle='hsl('+(i*9)+',70%,50%)'; g.fillRect(i*100,0,100,3000); }
    const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',0.9));
    const file=new File([blob],'ためし.jpg',{type:'image/jpeg'});
    /* 実際の入口（写真を入れる処理）を通す */
    const pid=props[0].id;
    nnPhotoFile(pid, file);
    const out=await new Promise(res=>{ let n=0;
      const iv=setInterval(()=>{ const v=nnPhotoOf(props[0]);
        if(v){ clearInterval(iv); res(v); } else if(++n>80){ clearInterval(iv); res('（返ってこない）'); } }, 100); });
    if(typeof out!=='string'||out.indexOf('data:image/jpeg')!==0) return {ng:'小さくできなかった', out:String(out).slice(0,40)};
    const im=new Image(); await new Promise(res=>{ im.onload=res; im.onerror=res; im.src=out; });
    return {幅:im.width, 高さ:im.height, 種類:out.slice(0,15), 重さKB:Math.round(out.length/1024)};
  });
  const name=直に?'ブラウザが直に読む道':'昔ながらの道';
  if(r.ng){ ok(name+'：写真を小さくできる', false, r); }
  else{
    ok(name+'：横640pxに収まる', r.幅<=640 && r.幅>0, r.幅);
    ok(name+'：たてよこの比が保たれる', Math.abs(r.幅/r.高さ - 4000/3000)<0.02, [r.幅,r.高さ]);
    ok(name+'：JPEGで保存される', r.種類.indexOf('data:image/jpe')===0, r.種類);
    ok(name+'：保存の重さが200KB以下', r.重さKB<=200, r.重さKB+'KB');
  }
  ok(name+'：JSエラーなし', errs.length===0, errs.slice(0,2));
  await ctx.close();
}
/* 何枚も続けて入れても記憶が増え続けないか */
const ctx2=await b.newContext({viewport:{width:1500,height:950}});
const p2=await ctx2.newPage(); p2.on('dialog',d=>d.accept());
const cdp=await ctx2.newCDPSession(p2); await cdp.send('Performance.enable');
await p2.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
await p2.waitForTimeout(2000);
const heap=async()=>{ await cdp.send('HeapProfiler.collectGarbage').catch(()=>{});
  const m=await cdp.send('Performance.getMetrics'); const x=m.metrics.find(v=>v.name==='JSHeapUsedSize');
  return x?Math.round(x.value/1048576):0; };
const shot=await p2.evaluate(async()=>{
  const c=document.createElement('canvas'); c.width=4000; c.height=3000;
  const g=c.getContext('2d'); g.fillStyle='#789'; g.fillRect(0,0,4000,3000);
  const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',0.9));
  const file=new File([blob],'ためし.jpg',{type:'image/jpeg'});
  for(let i=0;i<8;i++){ nnPhotoFile(props[i].id, file); await new Promise(r=>setTimeout(r,120)); }
  return true;
});
const h1=await heap();
await p2.evaluate(async()=>{
  const c=document.createElement('canvas'); c.width=4000; c.height=3000;
  const g=c.getContext('2d'); g.fillStyle='#789'; g.fillRect(0,0,4000,3000);
  const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',0.9));
  const file=new File([blob],'ためし.jpg',{type:'image/jpeg'});
  for(let i=8;i<16;i++){ nnPhotoFile(props[i].id, file); await new Promise(r=>setTimeout(r,120)); }
});
const h2=await heap();
ok('8枚ずつ2回入れても記憶が増え続けない（+8MB以内）', (h2-h1)<=8, {前:h1+'MB', 後:h2+'MB'});
await b.close();
console.log('★NG'+NG);
})();
