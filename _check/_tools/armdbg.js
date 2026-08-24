const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);
await p.click('#list .pcard .pph label.phhint'); await p.waitForTimeout(400);
console.log('armed:', await p.evaluate(()=>document.querySelectorAll('#list .pcard.armed').length));
console.log('handler:', await p.evaluate(()=>{
  // pointerdown capture が phhint で止まっているか
  const lb=document.querySelector('#list .pcard .pph label.phhint');
  let reached=false;
  const l=document.getElementById('list');
  const probe=()=>{reached=true;};
  l.addEventListener('pointerdown',probe);
  const r=lb.getBoundingClientRect();
  lb.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+5,clientY:r.top+5,bubbles:true,pointerId:9}));
  l.removeEventListener('pointerdown',probe);
  return {reachedList:reached};
}));
await b.close();})();
