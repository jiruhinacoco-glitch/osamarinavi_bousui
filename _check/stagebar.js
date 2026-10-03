/* 図面・積算：上の帯の「表示（下地／既存防水／施工後）」切り替えが、ほかのボタン（💾保存・開く・操作方法など）に重ならないか
   PC 4幅 × 平面図／割付図／3D。帯に入りきらないときは押し縮めずに下へ浮かせる（§576）。
   使い方: node _check/stagebar.js [ファイル]（直す前の版では 1440px などの3Dで★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const w of [1280,1440,1600,1920]){
 const p=await b.newPage({viewport:{width:w,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
 await p.click('.zmGoB[data-go="zu"]'); await p.waitForFunction(()=>typeof loadSample==='function'); await p.evaluate('loadSample()');
 for(const t of ['zu','wf','d3','zu']){
  await p.evaluate(t=>setTab(t),t); await p.waitForTimeout(t==='d3'?2500:800);
  const r=await p.evaluate(()=>{
   const sb=document.getElementById('nnStageBar'); if(!sb||getComputedStyle(sb).display==='none') return {none:1};
   const mine=[...sb.querySelectorAll('button,i')].map(e=>e.getBoundingClientRect()).filter(q=>q.width>0);
   const others=[...document.querySelectorAll('header button, header h1, #hdMode, #toolbar .tbtn, #toolbar .tsel, #toolbar select')]
     .filter(e=>!sb.contains(e)&&e.offsetParent).map(e=>[e.id||e.textContent.trim().slice(0,8),e.getBoundingClientRect()]).filter(x=>x[1].width>0);
   const hit=[]; for(const a of mine) for(const [n,o] of others){ const ix=Math.min(a.right,o.right)-Math.max(a.left,o.left), iy=Math.min(a.bottom,o.bottom)-Math.max(a.top,o.top); if(ix>1&&iy>1) hit.push(n); }
   /* 切り替えの中身が枠からはみ出していないか（押し縮められていないか） */
   return {hit:[...new Set(hit)], squeezed:Math.max(0,...[...sb.querySelectorAll("button,i")].map(e=>e.getBoundingClientRect().right))>sb.getBoundingClientRect().right+2, where:sb.classList.contains('flt')?'浮き':'帯の中'};
  });
  if(r.none){ console.log('－ '+w+' '+t+' 切り替えなし'); continue; }
  const ok=!r.hit.length&&!r.squeezed; if(!ok)NG++;
  console.log((ok?'○ ':'★NG ')+w+'px '+t+' '+r.where+(r.hit.length?' 重なり:'+r.hit.join(','):'')+(r.squeezed?' 押し縮め':''));
 }
 if(errs.length){NG++;console.log('★NG JSエラー',errs[0]);}
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
