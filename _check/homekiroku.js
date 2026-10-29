/* A5（第2段・ホーム）：ホームの「施工中・契約済・完成済 物件◯件」が、記録帳で足した・ステータスを変えた・消した物件まで数える。
   記録帳を本当に操作して保存 → ホームを開いて数字を見る。正解は記録帳の props を検査側で数えた値。使い方: node _check/homekiroku.js [ホームのページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'index.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1280,height:860},serviceWorkers:'block'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const nums=async()=>{ await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1500);
  return p.evaluate(()=>{const o={}; document.querySelectorAll('.bukken-banner').forEach(b=>{const l=b.querySelector('.bl'),n=b.querySelector('.bn'); if(l&&n) o[l.textContent.trim()]=parseInt(n.textContent);}); return o;}); };
const h0=await nums();
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1800);
const k0=await p.evaluate(()=>({kou:props.filter(x=>x.status==='施工中').length, kei:props.filter(x=>x.status==='契約済').length, kan:props.filter(x=>x.status==='完成済').length}));
ok('何もしていないときはホームと記録帳が同じ', h0['施工中物件']===k0.kou&&h0['契約済物件']===k0.kei&&h0['完成済物件']===k0.kan, {h0,k0});
/* 施工中を1件足す・完成済の1件を施工中に・施工中の1件を消す */
await p.evaluate(()=>openModal()); await p.waitForTimeout(500);
await p.fill('#f_name','検査 ホームに数える物件'); await p.selectOption('#f_st',{label:'施工中'});
await p.evaluate(()=>{const kb=document.getElementById('f_kb'); kb.value='2026-07-01'; kb.dispatchEvent(new Event('change',{bubbles:true})); const a=document.getElementById('f_amt'); a.value='1000000'; a.dispatchEvent(new Event('input',{bubbles:true}));});
await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); b.click();}); await p.waitForTimeout(1200);
const kanId=await p.evaluate(()=>props.find(x=>x.status==='完成済').id);
await p.evaluate(id=>openModal(id),kanId); await p.waitForTimeout(500); await p.selectOption('#f_st',{label:'施工中'});
await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); b.click();}); await p.waitForTimeout(1200);
const kouId=await p.evaluate(()=>props.find(x=>x.status==='施工中'&&!/^検査/.test(x.name)).id);
await p.evaluate(id=>openModal(id),kouId); await p.waitForTimeout(500); await p.evaluate(()=>nnDeleteProp()); await p.waitForTimeout(800);
const k1=await p.evaluate(()=>({kou:props.filter(x=>x.status==='施工中').length, kei:props.filter(x=>x.status==='契約済').length, kan:props.filter(x=>x.status==='完成済').length}));
ok('記録帳の操作が効いている（検査の前提：施工中+1、完成済-1）', k1.kou===k0.kou+1&&k1.kan===k0.kan-1, {k0,k1});
const h1=await nums();
ok('ホームの施工中が記録帳と同じ', h1['施工中物件']===k1.kou, {h1,k1});
ok('ホームの完成済が記録帳と同じ', h1['完成済物件']===k1.kan, {h1,k1});
ok('ホームの契約済が記録帳と同じ', h1['契約済物件']===k1.kei, {h1,k1});
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
