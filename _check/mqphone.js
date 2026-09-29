/* ★2026-09-29k スマホ：材料の数量の箱（#nnMatQty）がツールバーのボタンに重ならない（§550）
   使い方: node _check/mqphone.js [zumen_sekisan.html]
   ○/★NG：スマホたて（393×852）で屋根を1つかいたあと、箱が出ていて、どのボタン・入力欄とも重ならない／画面の中に収まる／JSエラーなし
   （直す前の版では左上に固定で、描画・長方形・中抜きなど21個のボタンに重なっていた） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const vp of [{width:393,height:852},{width:375,height:667}]){
  const p=await (await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>localStorage.removeItem('nn_matqty_pos')); await p.reload(); await p.waitForTimeout(2500);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(400);
  await p.evaluate(()=>{ state.polys=[{pts:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}]; saveState(); try{draw();}catch(_){} });
  await p.waitForFunction(()=>{const d=document.getElementById('nnMatQty'); return d&&d.classList.contains('on');},null,{timeout:8000}).catch(()=>{});
  await p.waitForTimeout(800);
  const r=await p.evaluate(()=>{ const d=document.getElementById('nnMatQty'); if(!d||!d.classList.contains('on')) return null; const a=d.getBoundingClientRect();
    const hit=[...document.querySelectorAll('button, select, input')].filter(x=>{ if(d.contains(x)) return false; const q=x.getBoundingClientRect();
      return q.width>0&&q.height>0&&q.right>a.left+1&&q.left<a.right-1&&q.bottom>a.top+1&&q.top<a.bottom-1&&getComputedStyle(x).visibility!=='hidden'; }).map(x=>x.id||x.textContent.trim().slice(0,8));
    return {hit, inView:a.left>=0&&a.top>=0&&a.right<=document.documentElement.clientWidth&&a.bottom<=document.documentElement.clientHeight}; });
  const L=vp.width+'×'+vp.height;
  ok(L+' 屋根をかくと材料の箱が出る', !!r);
  ok(L+' 箱がボタン・入力欄に重ならない', r&&r.hit.length===0, r&&r.hit.slice(0,6).join(','));
  ok(L+' 箱が画面の中', r&&r.inView);
  ok(L+' JSエラーなし', errs.length===0, errs.join(' / ').slice(0,200));
  await p.context().close();
 }
 await b.close(); console.log(R.join('\n'));
})();
