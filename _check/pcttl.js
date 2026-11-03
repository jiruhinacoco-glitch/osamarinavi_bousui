/* §1037 PC（2列 1500〜2000px・1列 1366）の一覧：長い工事名（4行以上になる名前）が欄の上下で欠けない／進行度の「100%」が棒と同じ行に見える。
   一覧を端から端まで送り、見えているカードを全部測る。直す前の版は★NG。使い方: node _check/pcttl.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
(async()=>{const b=await chromium.launch();
for(const [W,H] of [[1500,900],[1600,900],[2000,940],[1366,768]]){const ctx=await b.newContext({viewport:{width:W,height:H},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);
 await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=90,null,{timeout:30000});await p.waitForTimeout(1500);
 const bad={ttl:[],prog:[]};let seen=0;const total=await p.evaluate(()=>document.querySelectorAll('#list .pcard').length);
 for(let i=0;i<total;i+=2){
  await p.evaluate(i=>{const c=document.querySelectorAll('#list .pcard')[i];c&&c.scrollIntoView({block:'start'});},i);
  await p.waitForFunction(i=>{const c=document.querySelectorAll('#list .pcard')[i];return c&&!c.classList.contains('nnoff');},i,{timeout:5000}).catch(()=>{});
  await p.waitForTimeout(250);
  const r=await p.evaluate(i=>{const out={ttl:[],prog:[]};const cs=[...document.querySelectorAll('#list .pcard')].slice(i,i+2);
   for(const c of cs){if(c.classList.contains('nnoff'))continue;const t=c.querySelector('.rhead .ebox.ttl');if(t){const rg=document.createRange();rg.selectNodeContents(t);const a=rg.getBoundingClientRect(),bx=t.getBoundingClientRect();
     if(a.top<bx.top-1||a.bottom>bx.bottom+1)out.ttl.push(t.textContent.trim().slice(0,14)+' '+Math.round(a.height)+'/'+Math.round(bx.height));}
    const g=c.querySelector('.pcxprog');if(g){const pv=g.querySelector('.pv').getBoundingClientRect(),pg=g.querySelector('.prog').getBoundingClientRect(),gb=g.getBoundingClientRect();
     if(Math.abs((pv.top+pv.bottom)/2-(pg.top+pg.bottom)/2)>6||pv.bottom>gb.bottom+1)out.prog.push(c.dataset.pid||'?');}}
   return out;},i);
  seen+=2;r.ttl.forEach(x=>bad.ttl.includes(x)||bad.ttl.push(x));r.prog.forEach(x=>bad.prog.includes(x)||bad.prog.push(x));}
 const ok=!bad.ttl.length&&!bad.prog.length;if(!ok)NG++;
 console.log((ok?'○':'★NG')+' PC '+W+'×'+H+'：工事名が欠けない・進行度%が棒の横（'+total+'枚）'+(ok?'':' '+JSON.stringify({ttl:bad.ttl.slice(0,5),nttl:bad.ttl.length,prog:bad.prog.length})));await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
