/* ★2026-10-30a 完成済で実績（材料費など）が未入力の物件があっても、記録帳のダッシュボードが止まらない（§899・デバッグ巡回 A1）
   ③画面で「新規 → 完成済（実績は空）で保存」→ 開き直しても止まらない・4つの箱・NaN なし・完成工事高が1件増える（PC・スマホ）
   使い方: node _check/kanblank.js [ページ]（http://localhost:8899 で配信しておくこと）。直す前の版は①③が落ちる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
const ITEM={id:901,code:'J901',name:'検査用 完成済・実績なし',status:'完成済',stRaw:'kan',moto:'検査建設',kouhou:'ウレタン塗膜 通気緩衝工法(X-1)',hou:'ウレタン塗膜',spec:'X-1',
 m:100,un:'㎡',tan:0,order:1000000,y:[300000,280000,60000,140000],a:null,kb:'2026-05-01',kbD:{__d:'2026-05-01T00:00:00.000Z'},fbD:{__d:'2026-06-30T00:00:00.000Z'},kansei:'2026/06/30',prog:100,jinku:[],extras:[],roofs:[]};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
/* ③ 画面から */
for(const vp of [{width:1280,height:800},{width:393,height:852}]){const ph=vp.width<700; const ctx=await b.newContext({viewport:vp,deviceScaleFactor:ph?2:1,isMobile:ph,hasTouch:ph,serviceWorkers:'block'}); if(ph) await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1500);
 const kan=()=>p.evaluate(()=>{const e=[...document.querySelectorAll('#dashboard .kgrp .kgh')].find(x=>/完成工事高/.test(x.textContent)); return e?+(e.textContent.match(/(\d+)件/)||[])[1]:null;}); const n0=await kan();
 await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&/^＋?\s*新規(作成)?$/.test(e.textContent.trim())); b.click();}); await p.waitForTimeout(800);
 await p.fill('#f_name','検査用 画面から完成済'); await p.selectOption('#f_st',{label:'完成済'}); await p.fill('#f_amt','800000');
 await p.evaluate(()=>{ const set=(id,v)=>{const e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));}; set('f_kb','2026-05-10'); set('f_fb','2026-06-20'); });
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); b.click();}); await p.waitForTimeout(1200);
 await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&e.textContent.trim()==='あとで'); if(b) b.click();}); await p.waitForTimeout(500);
 await p.reload(); await p.waitForTimeout(2000);
 const r=await p.evaluate(()=>({boxes:document.querySelectorAll('#dashboard .kgrp .kgh').length, bad:/NaN|undefined/.test(document.getElementById('dashboard').textContent)})); const n1=await kan();
 ok((ph?'スマホ':'PC')+' ③完成済（実績は空）で保存 → 開き直しても止まらない・NaNなし', errs.length===0&&r.boxes===4&&!r.bad, {errs:errs.slice(0,1),r});
 ok((ph?'スマホ':'PC')+' ③完成工事高が1件増える', n1===n0+1, {n0,n1});
 await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
