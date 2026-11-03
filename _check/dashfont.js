/* §1017 ダッシュボード：見出し・金額の字に太いフチ（-webkit-text-stroke）が無い／金額は帯の色のべた字／矢印は普通の書体／内訳は順位・札・横棒の並び。
   使い方: node _check/dashfont.js [kirokucho_demo.html]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:2000,height:1000},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','dash');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
await p.evaluate(()=>toggleDtl('mitsumori'));await p.waitForTimeout(800);
const r=await p.evaluate(()=>{const st=e=>getComputedStyle(e);const hs=[...document.querySelectorAll('#dashboard .kgrp .kgh')],vs=[...document.querySelectorAll('#dashboard .kgrp .kgv')];
 const sw=e=>parseFloat(st(e).webkitTextStrokeWidth)||0;const ar=document.querySelector('#dashboard .kgv .ar2');
 return {hStroke:Math.max(...hs.map(sw)),vStroke:Math.max(...vs.map(sw)),vWhite:vs.filter(v=>st(v).color==='rgb(255, 255, 255)').length,arFont:ar?st(ar).fontFamily.slice(0,20):'',
  rows:document.querySelectorAll('#dtlbox .drow3').length,rk:document.querySelectorAll('#dtlbox .drow3 .drk').length,bars:document.querySelectorAll('#dtlbox .drow3 .dbar i').length,chips:document.querySelectorAll('#dtlbox .dchip').length};});
const ok1=r.hStroke===0&&r.vStroke===0&&r.vWhite===0,ok2=!/NNHead/.test(r.arFont)&&r.arFont,ok3=r.rows>3&&r.bars>3&&r.chips>3;
console.log(ok1?'○':'★NG','見出し・金額に太いフチが無く、金額は色のべた字',JSON.stringify(r));console.log(ok2?'○':'★NG','矢印は普通の書体');console.log(ok3?'○':'★NG','内訳は順位・情報の札・横棒の並び');
await b.close();})();
