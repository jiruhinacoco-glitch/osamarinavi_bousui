/* §1235 状態の名前「引合い中」→「引合い」（2026-11-15w 本人「今さらですが引合い中→引合いに」）。直す前の版では★NG。
   （hikiaichu.js を写して、古い保存の名前を「引合い中」にしたもの）
   もとの説明：「引合いあり」→「引合い」。①選択肢に引合いがあり引合いありが無い ②前に「引合いあり」で保存した物件も開くと「引合い」になり保存し直される
   ③現場一覧のカード・進行のレールに「引合いあり」が出ない。使い方: node _check/hikiai2.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(2500);
/* 古い名前で保存された物件を1件作る（前のページを閉じてから、次のページの読み込み前に書く＝閉じるときの保存で消されない） */
const q0=await p.evaluate(()=>{const q=JSON.parse(nnPropsJson(props[0]));q.status='引合い'+'中';q.stRaw='hikiai';return JSON.stringify(q);});
const id0=JSON.parse(q0).id;await p.close();
const p2=await ctx.newPage();await p2.addInitScript(([q,id])=>{if(sessionStorage.getItem('__hdone'))return;sessionStorage.setItem('__hdone','1');sessionStorage.setItem('__hid',id);const k='nn_kirokucho_props_v1';let d={};try{d=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}d.edit=d.edit||{};d.edit[id]=q;localStorage.setItem(k,JSON.stringify(d));},[q0,id0]);
await p2.goto('http://localhost:8899/'+FILE);await p2.waitForTimeout(3500);
const r=await p2.evaluate(()=>{const opts=[...document.querySelectorAll('#f_st option')].map(o=>o.value);const id=+sessionStorage.getItem('__hid');const q=props.find(x=>x.id===id);
 let saved='';try{const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1'));const a=d.edit&&d.edit[id];saved=a?(typeof a==='string'?JSON.parse(a).status:a.status):'';}catch(e){}
 return {opt:opts.includes('引合い')&&!opts.includes('引合い'+'中'),mem:q&&q.status,saved,html:new RegExp('引合い'+'中').test(document.getElementById('list').innerText)};});
const ok1=r.opt,ok2=r.mem==='引合い'&&r.saved==='引合い',ok3=!r.html;
console.log(ok1?'○':'★NG','①状態の選択肢が「引合い」（引合い中は無い）');console.log(ok2?'○':'★NG','②古い保存の「引合い中」も開くと「引合い」になり保存し直される',JSON.stringify(r));console.log(ok3?'○':'★NG','③現場一覧に「引合い中」が出ない');
await b.close();})();
