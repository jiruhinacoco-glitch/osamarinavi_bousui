const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
p.on('console',m=>console.log('[c]',m.text()));
p.on('pageerror',e=>console.log('[err]',e.message));
await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);
await p.click('#list .pcard .pmemo'); await p.waitForTimeout(300);
const info=await p.evaluate(()=>{
  const ta=document.querySelector('#list .pcard .pmemo textarea');
  return {has:!!ta, hasBlur: ta? typeof ta.onblur : null, hasKey: ta? typeof ta.onkeydown:null};
});
console.log(info);
await p.keyboard.type('テストメモ2');
await p.evaluate(()=>{ const ta=document.querySelector('#list .pcard .pmemo textarea'); ta.blur(); });
await p.waitForTimeout(600);
console.log('tb:', await p.evaluate(()=>props.find(x=>x.id===+document.querySelector('#list .pcard').dataset.pid).tb));
await b.close();})();
