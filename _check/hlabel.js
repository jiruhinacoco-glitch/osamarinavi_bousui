/* ★2026-09-29n H◯◯◯ の札を押すと立上り高さを直せる（§553）
   使い方: node _check/hlabel.js [zumen_sekisan.html]
   ○/★NG（PC・スマホたて）：①H札を押すと数字パッド（題名に「立上り高さ」・今の値）→ 500 でその辺だけ H500（ほかの辺は H300 のまま）
          ②辺そのもの（札から離れた所）を押すと今までどおり辺の選択（数字パッドは出ない） ③JSエラーなし */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const ph of [0,1]){
  const ctx=await b.newContext(ph?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const L=ph?'スマホ':'PC';
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(2500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(300);
  await p.evaluate(()=>{ state.polys=[{pts:[{x:2,y:6},{x:14,y:6},{x:14,y:16},{x:2,y:16}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}]; state.active=0; saveState(); setTool('none'); draw();
    window.__asks=[]; window.nnNumAsk=function(t,init,fn){ window.__asks.push({t,init}); fn('500'); }; });
  await p.waitForTimeout(500);
  const tapAt=async(x,y)=>{ if(ph) await p.touchscreen.tap(x,y); else await p.mouse.click(x,y); await p.waitForTimeout(300); };
  const lab=await p.evaluate(()=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect(), k=r.width/(cv.width/devicePixelRatio);
    const h=(typeof nnLabHit!=='undefined'?nnLabHit:[]).find(q=>q.kind==='hdim'&&q.i===0);
    const pd=(typeof nnLabHit!=='undefined'?nnLabHit:[]).find(q=>q.kind==='pdim'&&q.i===0);
    return h?{x:r.left+h.x*k, y:r.top+h.y*k, ex:r.left+gx2px(5)*k, ey:r.top+gy2px(6)*k}:null; });
  ok(L+' H札に当たりがある', !!lab);
  if(lab){
    await tapAt(lab.x,lab.y);
    const r1=await p.evaluate(()=>({asks:window.__asks.slice(), hs:state.polys[0].edges.map(e=>e.h)}));
    ok(L+' ①H札→数字パッド（立上り高さ・今の値300）→その辺だけ H500', r1.asks.length===1&&/立上り/.test(r1.asks[0].t)&&String(r1.asks[0].init)==='300'&&r1.hs.join()==='500,300,300,300', JSON.stringify(r1));
    await p.evaluate(()=>{ window.__asks=[]; setTool('sel',1); });
    await tapAt(lab.ex,lab.ey);
    const r2=await p.evaluate(()=>({asks:window.__asks.length, sel:sel&&typeof sel==='object'?{p:sel.p,e:sel.e}:sel}));
    ok(L+' ②辺そのものを押すと今までどおり辺の選択（数字パッドは出ない）', r2.asks===0&&r2.sel&&r2.sel.e===0, JSON.stringify(r2));
  }
  ok(L+' ③JSエラーなし', errs.length===0, errs.join(' / ').slice(0,200));
  await ctx.close();
 }
 await b.close(); console.log(R.join('\n'));
})();
