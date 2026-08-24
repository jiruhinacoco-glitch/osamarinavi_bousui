/* 3Dの土台（WebGL）を取り上げられて戻ったとき、建物が真っ黒にならないか
   使い方: node _check/ctxlost.js        （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const CLIP={x:380,y:280,width:360,height:240};
const dark=async p=>{ const buf=await p.screenshot({clip:CLIP});
  // 画素の明るさを数える（外部ライブラリを使わずPNGを読むのは大変なので、ページ側で数える）
  return buf; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1400,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
let ng=0; const ok=(c,m)=>{ console.log((c?'○ ':'★NG ')+m); if(!c)ng++; };

await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}; document.getElementById('tl_sample').click();});
await p.waitForTimeout(600);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(2500);

/* 3Dの絵の「暗い画素の割合」を数える
   ★キャンバスを drawImage で読むと真っ黒になる（preserveDrawingBuffer が false のため、
     描き終わった直後に中身が捨てられる）。同じ場で描き直して readPixels で読むこと。 */
const darkPct=()=>p.evaluate(()=>{
  const g=T.renderer.getContext();
  T.renderer.render(T.scene,T.camera);          /* いま描く */
  const w=T.renderer.domElement.width, h=T.renderer.domElement.height;
  const x=Math.floor(w*0.3), y=Math.floor(h*0.3), ww=Math.floor(w*0.4), hh=Math.floor(h*0.4);
  const buf=new Uint8Array(ww*hh*4);
  g.readPixels(x,y,ww,hh,g.RGBA,g.UNSIGNED_BYTE,buf);
  let n=0; for(let i=0;i<buf.length;i+=4){ if((buf[i]*0.3+buf[i+1]*0.59+buf[i+2]*0.11)<40) n++; }
  return Math.round(n/(ww*hh)*1000)/10;
});

ok(await p.evaluate(()=>!!(T&&T.renderer&&T.renderer.domElement._nnCtxWired)), '受け口が付いている');
const p0=await darkPct(); ok(p0<8, '正常時は黒くない（暗い画素 '+p0+'%）');

/* わざと土台を取り上げる */
const prevented=await p.evaluate(()=>new Promise(res=>{
  const c=T.renderer.domElement, g=c.getContext('webgl2')||c.getContext('webgl');
  c.addEventListener('webglcontextlost', e=>res(e.defaultPrevented), {once:true});
  window.__ext=g.getExtension('WEBGL_lose_context'); window.__ext.loseContext();
  setTimeout(()=>res('来なかった'),3000);
}));
ok(prevented===true, '取り上げられたとき preventDefault を呼んでいる（'+prevented+'）');
ok(await p.evaluate(()=>window.nnGLLost===1), '休んでいる印が立つ');

await p.evaluate(()=>{try{window.__ext.restoreContext()}catch(e){}});
await p.waitForTimeout(2500);
await p.evaluate(()=>{T.rev=(T.rev|0)+1;}); await p.waitForTimeout(1200);
ok(await p.evaluate(()=>window.nnGLLost===0), '戻ったら印が下りる');
ok(await p.evaluate(()=>!!(T.scene&&T.scene.environment)), '空の光が作り直されている');
const p1=await darkPct();
ok(p1<8, '戻ったあとも黒くない（暗い画素 '+p1+'%・直す前は29.8%だった）');
ok(Math.abs(p1-p0)<5, '正常時とほぼ同じ絵（差 '+Math.round(Math.abs(p1-p0)*10)/10+'%）');
ok(await p.evaluate(()=>T.renderer.info.render.triangles>1000), '建物が描かれている');
ok(errs.length===0, 'JSエラーなし'+(errs.length?' → '+errs.slice(0,2).join(' / '):''));

console.log(ng? ('\n★NG '+ng+'件') : '\n全部○');
await b.close(); process.exit(ng?1:0);
})();
