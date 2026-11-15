/* 道具：現場詳細の各タブ（概要・写真・保管資料・作成図面・人工情報・追加工事）とダッシュボードで、
   字が「囲みの枠（.panel など）」の外へはみ出して隣に重なっているところを数える（○／★NGなし）。
   overflow:visible ではみ出す型は kscan 系では見つからないので、この道具で見る。
   使い方: node _check/_tools/kpanel.js [写しの置き場] [ファイル] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp', FILE=process.argv[3]||'kirokucho_demo.html';
const ENVS=[['ipad',{...devices['iPad (gen 7)']}],['ipadL',{...devices['iPad (gen 7) landscape']}],['pc1366',{viewport:{width:1366,height:900}}],['pc1900',{viewport:{width:1900,height:950}}],['sp',{...devices['iPhone 13']}]];
const SCAN=()=>{ const out=[]; const vis=e=>{ const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0; };
  const BOX='.panel,.card,.dpanel,.kgrp,.dbox,.box,section,.dsec,.dtb';
  [...document.querySelectorAll('#detail *, #dashboard *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&vis(e)).forEach(e=>{
    const b=e.parentElement&&e.parentElement.closest(BOX); if(!b||!vis(b)) return; const q=e.getBoundingClientRect(), B=b.getBoundingClientRect();
    const dx=Math.max(q.right-B.right, B.left-q.left); if(dx>3) out.push([e.tagName+'.'+String(e.className).slice(0,16), e.textContent.trim().slice(0,16), Math.round(dx), String(b.className).slice(0,20)]); });
  return out; };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [nm,opt] of ENVS.filter(x=>!process.env.ONLY||process.env.ONLY.split(',').includes(x[0]))){
  const ctx=await b.newContext(opt); if(nm==='sp') await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','mobile'); }catch(e){} });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ if(typeof showView==='function') showView('dashboard'); }); await p.waitForTimeout(1500);
  let r=await p.evaluate(SCAN); console.log('===',nm,'ダッシュボード','はみ出し'+r.length); r.slice(0,8).forEach(x=>console.log('   ',JSON.stringify(x)));
  await p.evaluate(()=>goProperty(props[0].id)); await p.waitForTimeout(1800);
  const tabs=await p.evaluate(()=>[...document.querySelectorAll('#detail .dmenu button')].filter(x=>x.offsetParent).map(x=>x.textContent.trim()));
  for(let i=0;i<tabs.length;i++){
    await p.evaluate(i=>{ const bs=[...document.querySelectorAll('#detail .dmenu button')].filter(x=>x.offsetParent); bs[i]&&bs[i].click(); },i); await p.waitForTimeout(1300);
    r=await p.evaluate(SCAN); console.log('===',nm,'詳細:'+tabs[i],'はみ出し'+r.length); r.slice(0,8).forEach(x=>console.log('   ',JSON.stringify(x)));
    if(r.length) await p.screenshot({path:OUT+'/kp_'+nm+'_'+i+'.png',fullPage:false}); }
  if(errs.length) console.log('   エラー',JSON.stringify(errs.slice(0,3)));
  await ctx.close(); }
await b.close();})();
