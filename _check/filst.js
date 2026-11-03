/* §1033 絞り込み：ステータスで完成済に絞ると完成済だけ・件数が合う（スマホ縦・PC2000）。使い方: node _check/filst.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;const ok=(c,m,x)=>{if(!c)NG++;console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):''));};
(async()=>{const b=await chromium.launch();
for(const [nm,opt,ph] of [['縦スマホ',{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2},1],['PC2000',{viewport:{width:2000,height:940}},0]]){
const ctx=await b.newContext({...opt,serviceWorkers:'block'});await ctx.addInitScript(ph=>{if(ph)localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');},ph);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3500);
const settle=async()=>{let last=-1,same=0;for(let k=0;k<40&&same<3;k++){await p.waitForTimeout(250);const c=await p.evaluate(()=>document.querySelectorAll('#list .pcard').length);if(c===last)same++;else{same=0;last=c;}}return last;};
if(ph) await p.click('#spFilBtn');await p.waitForTimeout(500);
await p.locator('#chips .stchip',{hasText:'ステータス'}).click();await p.waitForTimeout(500);
const menu=await p.evaluate(()=>{const m=[...document.querySelectorAll('.dfmenu.open .dfrow, .lfmenu.open .dfrow, .dfmenu.open label, [class*=menu].open [data-v]')].filter(x=>x.offsetWidth);return m.map(x=>x.textContent.trim().slice(0,12));});
const row=await p.evaluate(()=>{const m=[...document.querySelectorAll('.dfmenu.open .dfrow, .dfmenu.open label, [class*=menu].open [data-v]')].filter(x=>x.offsetWidth);const t=m.find(x=>/完成済/.test(x.textContent));if(!t)return null;t.click();return t.textContent.trim();});
await p.waitForTimeout(300);await p.keyboard.press('Escape').catch(()=>{}); await p.evaluate(()=>document.body.click());
const n=await settle();const want=await p.evaluate(()=>props.filter(x=>x.status==='完成済').length);
const allKan=await p.evaluate(()=>[...document.querySelectorAll('#list .pcard')].every(c=>/完成済/.test((c.querySelector('.rhead .status')||{}).textContent||'')));
ok(row&&n===want&&allKan,nm+'：ステータスで「完成済」に絞ると '+want+' 件だけになる',{menu:menu.slice(0,8),row,n,want,allKan});
ok(!errs.length,nm+'：JSエラーなし',errs.slice(0,2));await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
