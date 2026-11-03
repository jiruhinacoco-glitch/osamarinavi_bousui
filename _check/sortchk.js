/* §1033 並び替え：「受注金額が大きい順」「数量が大きい順」「利益率が高い順」で一覧が本当にその順になる（PC2000・スマホ縦）。
   検算はカードの表示ではなく props の値で（当の並び替え関数は使わない）。使い方: node _check/sortchk.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
(async()=>{const b=await chromium.launch();
for(const [nm,opt,ph] of [['PC2000',{viewport:{width:2000,height:940}},0],['縦スマホ',{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2},1]]){
const ctx=await b.newContext({...opt,serviceWorkers:'block'});await ctx.addInitScript(ph=>{if(ph)localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');},ph);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
for(const [label,key] of [['受注金額が大きい順','order'],['数量が大きい順','m'],['利益率が高い順','rate']]){
 if(ph){ const open=await p.evaluate(()=>document.getElementById('chips').offsetWidth>0); if(!open) await p.click('#spFilBtn'); await p.waitForTimeout(300);}
 await p.locator('#chips .stchip').last().click();await p.waitForTimeout(400);   /* 並び替えのボタンは一番右（選ぶと文字が選んだ順の名前に変わる） */
 const hit=await p.evaluate(l=>{const t=[...document.querySelectorAll('.dfmenu.open .dfrow, .dfmenu.open label, [class*=menu].open [data-v], [class*=menu].open button')].filter(x=>x.offsetWidth).find(x=>x.textContent.trim().startsWith(l));if(!t)return false;t.click();return true;},label);
 await p.keyboard.press('Escape').catch(()=>{});await p.evaluate(()=>document.body.click());await p.waitForTimeout(1500);
 const r=await p.evaluate(key=>{const v=q=>{if(key==='rate'){const c=(q.mat||0)+(q.jin||0)+(q.keihi||0)+(q.other||0);return (q.order&&c>0)?(q.order-c)/q.order:-1e9;}return +q[key]||0;};
  const ids=[...document.querySelectorAll('#list .pcard')].slice(0,30).map(c=>+c.dataset.pid);const vals=ids.map(id=>v(props.find(x=>x.id===id)));
  let bad=0;for(let i=1;i<vals.length;i++) if(vals[i]>vals[i-1]+1e-9) bad++;return {bad,first:vals.slice(0,5).map(x=>Math.round(x*1000)/1000)};},key);
 const ok=hit&&r.bad===0;if(!ok)NG++;console.log((ok?'○':'★NG')+' '+nm+'：「'+label+'」で先頭30件がその順 '+JSON.stringify(r));}
if(errs.length){NG++;console.log('★NG '+nm+' JSエラー',errs.slice(0,2));}
await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
