/* §1011 スマホ一覧（屋根の並び）：元請の欄を広く（33%）・区分/区分2は右へ詰める。使い方: node _check/motowide.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const c0=[...document.querySelectorAll('#list .pcard')].slice(0,4);if(window.nnTtlFitSp)nnTtlFitSp(c0);const cs=c0.filter(c=>c.classList.contains('rfm'));if(!cs.length)return [{none:1}];return cs.map(c=>{const R=e=>e.getBoundingClientRect();const m=c.querySelector('.prow.r1 > .ebox[data-f="moto"]'),a=c.querySelector('.spc1'),b=c.querySelector('.spc2'),h=c.querySelector('.spsum > .horder');
 const mi=m.querySelector('i');const hi=c.querySelector(':scope > .sptan > i');
 return {moto:Math.round(R(m).width),motoFs:getComputedStyle(m).fontSize,motoCut:m.scrollWidth>m.clientWidth+1,lblEdge:Math.round(R(mi).right-R(hi).right),
  k1:Math.round(R(a).width),k2:Math.round(R(b).width),gap:Math.round(R(b).left-R(a).right),right:Math.round(R(c).right-R(b).right),
  tagCut:[...c.querySelectorAll('.spc .sptag')].some(t=>R(t).right>R(t.closest('.spc')).right+0.5),overlapMotoK1:R(m).right>R(a).left+0.5};});});
let ng=0;for(const o of r){const ok=o.moto>=120&&!o.motoCut&&o.gap>=-1&&o.gap<=1&&!o.tagCut&&!o.overlapMotoK1&&o.right<=3;if(!ok)ng++;console.log(ok?'○':'★NG','元請を広く・区分は右へ',JSON.stringify(o));}
console.log(ng?'★NG 元請の欄 '+ng+'件':'○ 元請の欄 全部OK');await b.close();})();
