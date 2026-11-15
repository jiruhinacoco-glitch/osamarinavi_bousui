/* 道具：写真タブ・保管資料・作成図面に、名前の長い写真・書類を何枚か入れた状態で写しを撮り、字のはみ出しを数える（○／★NGなし）
   使い方: node _check/_tools/kphoto.js [写しの置き場] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const OUT=process.argv[2]||'/tmp';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const W of [1366,1900]){ const p=await b.newPage({viewport:{width:W,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1000);
await p.evaluate(async()=>{ const x=props[0]; window.__pid=x.id;
  /* 見本の写真と、名前の長い書類を本物の保存の入口から入れる */
  const fl=[]; for(let i=1;i<=6;i++){ const r=await fetch('./icons/roofph_'+i+'.jpg'); const bl=await r.blob(); fl.push(new File([bl],'屋上の立上り入隅部分の防水シート張り状況_'+i+'.jpg',{type:'image/jpeg'})); }
  fl.push(new File(['%PDF-1.4'],'御見積書_八軒アパート屋上防水改修工事_第2回改訂版.pdf',{type:'application/pdf'}));
  fl.push(new File(['x'],'施工要領書_改質アスファルトシート常温粘着工法_田島ルーフィング.pdf',{type:'application/pdf'}));
  try{ await nnStoreSubmissionFiles(x.id,fl); }catch(e){ console.log('入れ失敗',e.message); }
  goProperty(x.id); }); await p.waitForTimeout(2500);
for(const tab of ['写真','保管資料','作成図面']){
  await p.evaluate(t=>[...document.querySelectorAll('#detail .dmenu button')].find(b=>b.textContent.trim()===t).click(),tab); await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>{ const D=document.getElementById('detail'); const out=[];
    [...D.querySelectorAll('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.offsetParent&&!e.closest('.dhead,.dsrow,.dmenu')).forEach(e=>{ const ce=getComputedStyle(e); if(ce.textOverflow==='ellipsis') return;
      if(/(hidden|clip)/.test(ce.overflowX)&&e.scrollWidth>e.clientWidth+3) out.push(['中',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,20)]);
      let a=e.parentElement; while(a&&a!==D){ const c=getComputedStyle(a); if(/(hidden|clip)/.test(c.overflowX)) break; a=a.parentElement; }
      if(a&&a!==D){ const q=e.getBoundingClientRect(),A=a.getBoundingClientRect(); if(q.right>A.right+3&&q.top<A.bottom&&q.bottom>A.top) out.push(['外',e.tagName+'.'+String(e.className).slice(0,18),e.textContent.trim().slice(0,20),Math.round(q.right-A.right)]); } });
    return {n:(props.find(x=>x.id===window.__pid).files||[]).length, out:out.slice(0,10)};});
  console.log('===',W,tab,'ファイル'+r.n,'切れ'+r.out.length,JSON.stringify(r.out),'エラー',JSON.stringify(errs.splice(0)));
  await p.screenshot({path:OUT+'/kp_'+W+'_'+tab+'.png'}); }
await p.close(); }
await b.close();})();
