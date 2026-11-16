/* 図面・積算：スマホの狭い画面（iPhone SE 縦横・iPhone 13 縦横）で、上の帯のボタン（操作方法・保存・保存済データを開く）が画面の右へ切れない
   平面図／断面図／3D／平面図に戻る。入りきる端末（iPhone 13 横・PC）では縮めない（zoom なし）こと（§1291）。
   使い方: node _check/hdfit.js [ファイル]（直す前の版では SE 横で★NG） */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html'; let NG=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)NG++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const dev of ['iPhone SE (3rd gen) landscape','iPhone SE (3rd gen)','iPhone 13 landscape','iPhone 13','pc']){
 const c=await b.newContext(dev==='pc'?{viewport:{width:1280,height:720}}:{...devices[dev],deviceScaleFactor:1});const p=await c.newPage();const er=[];p.on('pageerror',e=>er.push(e.message));
 await p.goto('http://localhost:8899/'+F);await p.waitForTimeout(1500);
 for(const t of ['zu','sec','d3','zu']){await p.evaluate(t=>{nnZMenuClose();setTab(t)},t);await p.waitForTimeout(t==='d3'?2500:900);
  const r=await p.evaluate(()=>{const W=document.documentElement.clientWidth;
   const out=[...document.querySelectorAll('header button')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return r.right>W+1?(e.id+' '+Math.round(r.right-W)+'px外'):null}).filter(Boolean);
   const z=['hdMode','hdSwap','hdHelp','hdFiles'].map(i=>{const e=document.getElementById(i);return e&&e.style.zoom}).filter(Boolean);return {out,z};});
  ok(!r.out.length,dev+' '+t+' 帯のボタンが画面の右へ切れない'+(r.out.length?' '+r.out.join(','):''));
  if(dev==='iPhone 13 landscape'||dev==='pc') ok(!r.z.length,dev+' '+t+' 入りきるので縮めない'+(r.z.length?' zoom '+r.z[0]:''));
 }
 ok(!er.length,dev+' エラーなし '+(er[0]||''));await c.close();}
await b.close();console.log(NG?'★NG '+NG+'件':'全項目○');})();
