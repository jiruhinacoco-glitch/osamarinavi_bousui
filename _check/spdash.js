/* スマホ表示のダッシュボード：切り替えボタン（全体〜元請別受注）の色が、現場詳細のタブと同じ（ふだん＝緑／選んでいる＝黄色）（2026-11-14zr）。直す前の版（14zq）では★NG。
   ①12個ある ②選んでいない11個は緑・選んでいる1個は黄色 ③字は濃い色（緑・黄色の上で読める） ④ほかのボタンを押すと、押したほうが黄色になり、前のは緑に戻る
   ⑤パソコンは今までどおり（緑にしない）
   使い方: node _check/spdash.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)NG++;};
const M=()=>{const mid=e=>{const g=getComputedStyle(e).backgroundImage.match(/rgb\((\d+), (\d+), (\d+)\)/g)||[]; return (g[Math.floor(g.length/2)]||'rgb(0, 0, 0)').match(/\d+/g).map(Number);};
  const lum=c=>{const m=c.match(/[\d.]+/g).map(Number); return Math.round(0.299*m[0]+0.587*m[1]+0.114*m[2]);};
  return [...document.querySelectorAll('#dashboard .nn-dnav > button')].filter(b=>b.getBoundingClientRect().width>0).map(b=>({t:(b.querySelector('b')||b).textContent.trim(),on:b.classList.contains('on'),c:mid(b),l:lum(getComputedStyle(b.querySelector('b')||b).color)}));};
const isG=c=>c[1]>=180&&c[1]>c[0]+30&&c[1]>c[2]+80, isY=c=>c[0]>=235&&c[1]>=195&&c[2]<=110;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
{const ctx=await b.newContext({...devices['iPhone 13']});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>!!document.getElementById('vt_dash')); await p.waitForTimeout(1500);
 await p.evaluate(()=>document.getElementById('vt_dash').click()); await p.waitForFunction(()=>document.querySelectorAll('#dashboard .nn-dnav > button').length>=12,null,{timeout:8000}).catch(()=>{});
 let m=await p.evaluate(M);
 ok(m.length===12,'①切り替えボタンが12個',m.length);
 const on=m.filter(x=>x.on), off=m.filter(x=>!x.on);
 ok(on.length===1&&isY(on[0].c)&&off.length===11&&off.every(x=>isG(x.c)),'②選んでいない11個は緑・選んでいる1個は黄色',{on:on[0]&&on[0].c,off:off[0]&&off[0].c});
 ok(m.every(x=>x.l<=90),'③字は濃い色',m.map(x=>x.l).slice(0,3));
 const t2=off[3]&&off[3].t;
 await p.evaluate(t=>{[...document.querySelectorAll('#dashboard .nn-dnav > button')].find(b=>(b.querySelector('b')||b).textContent.trim()===t).click();},t2);
 await p.waitForFunction(t=>{const o=document.querySelector('#dashboard .nn-dnav > button.on'); return o&&(o.querySelector('b')||o).textContent.trim()===t;},t2,{timeout:5000}).catch(()=>{});
 m=await p.evaluate(M); const o2=m.filter(x=>x.on);
 ok(o2.length===1&&o2[0].t===t2&&isY(o2[0].c)&&m.filter(x=>!x.on).every(x=>isG(x.c)),'④ほかのボタンを押すと、押したほうが黄色・前のは緑に戻る',{t:t2,on:o2[0]&&o2[0].c});
 ok(errs.length===0,'エラーが出ていない（スマホ）',errs.slice(0,2));
 await ctx.close();}
{const ctx=await b.newContext({viewport:{width:1600,height:900}});
 const p=await ctx.newPage();
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>!!document.getElementById('vt_dash')); await p.waitForTimeout(1500);
 await p.evaluate(()=>document.getElementById('vt_dash').click()); await p.waitForFunction(()=>document.querySelectorAll('#dashboard .nn-dnav > button').length>=12,null,{timeout:8000}).catch(()=>{});
 const m=await p.evaluate(M);
 ok(m.length>=12&&m.filter(x=>!x.on).every(x=>!isG(x.c)),'⑤パソコンは今までどおり（緑にしない）',m[1]&&m[1].c);
 await ctx.close();}
await b.close();
console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
