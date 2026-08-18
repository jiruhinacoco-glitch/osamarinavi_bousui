const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{
  const t=document.body.innerText;
  return {
    total: props.length,
    seal: props.filter(p=>p.hou==='シーリング').length,
    areas: [...new Set(props.map(p=>p.area))].join(' '),
    stats: ['kan','kou','keiyaku','mit','chosa','hikiai'].map(k=>k+':'+props.filter(p=>p.stRaw===k).length).join(' '),
    kpiVisible: !!document.querySelector('.kgrp'),
    defect: props.filter(p=>p.defects&&p.defects.length).length,
  };
});
console.log(JSON.stringify(r,null,1));
console.log('JSエラー:', errs.length?errs.join(' | '):'なし');
// 一覧を開いてみる
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
const n=await p.evaluate(()=>document.querySelectorAll('#list .pcard').length);
console.log('一覧カード数', n);
await b.close();})();
