/* §1033 スマホのカードのプルダウン（区分・区分2・元請）で値を変える→データ・札・端末への保存。使い方: node _check/spcardsel.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;const ok=(c,m,x)=>{if(!c)NG++;console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):''));};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3500);
/* 屋根の並びのカードの「区分」「区分2」は .spc の中の札。プルダウン（spsel）で選ぶ */
const r=await p.evaluate(async()=>{const c=document.querySelector('#list .pcard');nnTtlFitSp([c]);const pid=+c.dataset.pid;
 const pick=(sel,val)=>{if(!sel)return false;sel.value=val;sel.dispatchEvent(new Event('change',{bubbles:true}));return true;};
 const s1=c.querySelector('.spc1 select.spsel'),s2=c.querySelector('.spc2 select.spsel'),sm=c.querySelector('[data-f="moto"] select.spsel');
 const o={has:[!!s1,!!s2,!!sm]};
 o.a=pick(s1,'材のみ');await new Promise(r=>setTimeout(r,700));
 let c2=document.querySelector('#list .pcard[data-pid="'+pid+'"]');nnTtlFitSp([c2]);o.s2=pick(c2.querySelector('.spc2 select.spsel'),'新築');await new Promise(r=>setTimeout(r,700));
 c2=document.querySelector('#list .pcard[data-pid="'+pid+'"]');nnTtlFitSp([c2]);const smm=c2.querySelector('[data-f="moto"] select.spsel');const mv=smm?[...smm.options].map(x=>x.value).find(v=>v&&v!==props.find(x=>x.id===pid).moto&&!/追加|新規|＋/.test(v)):null;o.mv=mv;o.m=pick(smm,mv);await new Promise(r=>setTimeout(r,700));
 const q=props.find(x=>x.id===pid);c2=document.querySelector('#list .pcard[data-pid="'+pid+'"]');nnTtlFitSp([c2]);
 let saved=null;try{const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1'));const e=d.edit&&d.edit[pid];saved=e?JSON.parse(e):null;}catch(e){}
 return {...o,kbn:q.kbn,kind:q.kind,moto:q.moto,card:[(c2.querySelector('.spc1 .sptag')||{}).textContent,(c2.querySelector('.spc2 .sptag')||{}).textContent,(c2.querySelector('[data-f="moto"]')||{}).textContent],saved:saved&&[saved.kbn,saved.kind,saved.moto]};});
console.log(JSON.stringify(r));
ok(r.kbn==='材のみ'&&/材のみ/.test(r.card[0]||''),'①カードの「区分」で材のみに変わる（データと札）',[r.kbn,r.card[0]]);
ok(r.kind==='新築'&&/新築/.test(r.card[1]||''),'②カードの「区分2」で新築に変わる',[r.kind,r.card[1]]);
ok(r.moto===r.mv&&(r.card[2]||'').includes(r.mv||'@@'),'③カードの「元請」を選び直せる',[r.moto,r.card[2]]);
ok(r.saved&&r.saved[0]==='材のみ'&&r.saved[1]==='新築'&&r.saved[2]===r.mv,'④3つとも端末に保存される',r.saved);
ok(!errs.length,'⑤JSエラーなし',errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
