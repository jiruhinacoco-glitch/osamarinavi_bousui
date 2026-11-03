/* §1014 状態の名前「引合いあり」→「引合い中」。①選択肢に引合い中があり引合いありが無い ②前に「引合いあり」で保存した物件も開くと「引合い中」になり保存し直される
   ③現場一覧のカード・進行のレールに「引合いあり」が出ない。使い方: node _check/hikiaichu.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(2500);
/* 古い名前で保存された物件を1件作る（前のページを閉じてから、次のページの読み込み前に書く＝閉じるときの保存で消されない） */
const q0=await p.evaluate(()=>{const q=JSON.parse(nnPropsJson(props[0]));q.status='引合いあり';q.stRaw='hikiai';return JSON.stringify(q);});
const id0=JSON.parse(q0).id;await p.close();
const p2=await ctx.newPage();await p2.addInitScript(([q,id])=>{if(sessionStorage.getItem('__hdone'))return;sessionStorage.setItem('__hdone','1');sessionStorage.setItem('__hid',id);const k='nn_kirokucho_props_v1';let d={};try{d=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}d.edit=d.edit||{};d.edit[id]=q;localStorage.setItem(k,JSON.stringify(d));},[q0,id0]);
await p2.goto('http://localhost:8899/'+FILE);await p2.waitForTimeout(3500);
const r=await p2.evaluate(()=>{const opts=[...document.querySelectorAll('#f_st option')].map(o=>o.value);const id=+sessionStorage.getItem('__hid');const q=props.find(x=>x.id===id);
 let saved='';try{const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1'));const a=d.edit&&d.edit[id];saved=a?(typeof a==='string'?JSON.parse(a).status:a.status):'';}catch(e){}
 return {opt:opts.includes('引合い中')&&!opts.includes('引合いあり'),mem:q&&q.status,saved,html:/引合いあり/.test(document.getElementById('list').innerText)};});
const ok1=r.opt,ok2=r.mem==='引合い中'&&r.saved==='引合い中',ok3=!r.html;
console.log(ok1?'○':'★NG','①状態の選択肢が「引合い中」');console.log(ok2?'○':'★NG','②古い保存の「引合いあり」も開くと「引合い中」になり保存し直される',JSON.stringify(r));console.log(ok3?'○':'★NG','③現場一覧に「引合いあり」が出ない');
await b.close();})();
