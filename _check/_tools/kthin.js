/* 道具：入力欄（input/select/textarea）が細すぎて実際には入力できないところを探す（○／★NGなし）。
   見た目の「切れ」検査では見つからない型（§1270：iPad縦の登録の窓で右の列が幅21px）。
   ダッシュボード・現場一覧・詳細の各タブ・編集の窓を、iPad縦/横・PC1366・スマホ360で開き、幅40px未満の欄を数える。
   使い方: node _check/_tools/kthin.js [ファイル] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const ENVS=[['ipad',{...devices['iPad (gen 7)']}],['ipadL',{...devices['iPad (gen 7) landscape']}],['pc1366',{viewport:{width:1366,height:900}}],['sp360',{...devices['Galaxy S8']}]];
const THIN=(min)=>[...document.querySelectorAll('input,select,textarea')].filter(e=>{ if(!e.offsetParent) return false; if(/^(checkbox|radio|file|hidden|color|range)$/.test(e.type)) return false; const c=getComputedStyle(e); if(c.visibility==='hidden'||+c.opacity===0) return false; const q=e.getBoundingClientRect(); return q.width>0&&q.width<min&&q.height>0; }).map(e=>(e.id||e.name||e.className||e.placeholder||e.type).toString().slice(0,18)+':'+Math.round(e.getBoundingClientRect().width));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [nm,opt] of ENVS.filter(x=>!process.env.ONLY||process.env.ONLY.split(',').includes(x[0]))){
  const ctx=await b.newContext(opt); if(nm==='sp360') await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','mobile'); }catch(e){} });
  const p=await ctx.newPage(); await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
  const show=async(lab)=>{ const r=await p.evaluate(THIN,40); console.log('===',nm,lab,'細い欄'+r.length, r.length?JSON.stringify(r.slice(0,8)):''); };
  await p.evaluate(()=>showView('dash')); await p.waitForTimeout(1200); await show('ダッシュボード');
  await p.evaluate(()=>{ showView('list'); }); await p.waitForTimeout(1200); await show('現場一覧');
  await p.evaluate(()=>goProperty(props[0].id)); await p.waitForTimeout(1800);
  const tabs=await p.evaluate(()=>[...document.querySelectorAll('#detail .dmenu button')].filter(x=>x.offsetParent).map(x=>x.textContent.trim()));
  for(let i=0;i<tabs.length;i++){ await p.evaluate(i=>{ const bs=[...document.querySelectorAll('#detail .dmenu button')].filter(x=>x.offsetParent); bs[i]&&bs[i].click(); },i); await p.waitForTimeout(1200); await show('詳細:'+tabs[i]); }
  await p.evaluate(()=>openModal(props[0].id)); await p.waitForTimeout(1500); await show('編集の窓');
  await ctx.close(); }
await b.close();})();
