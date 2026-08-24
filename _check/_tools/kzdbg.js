const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
p.on('pageerror',e=>console.log('[err]',e.message));
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
await p.evaluate(()=>{ localStorage.setItem('nn_zumen_saves_v1', JSON.stringify([{id:'sabc',name:'テスト',date:'2026/8/13',data:'{}'}])); });
await p.evaluate(()=>{ showView('list'); }); await p.waitForTimeout(800);
await p.evaluate(()=>{ goProperty(props[0].id); }); await p.waitForTimeout(500);
console.log(await p.evaluate(()=>({tab:curTab, fn:typeof window.nnZuSaves,
  tabs:[...document.querySelectorAll('.tabs button')].map(x=>x.textContent.trim()).join('/')})));
await p.evaluate(()=>{ curTab='作成図面'; renderDetail(); }); await p.waitForTimeout(500);
console.log(await p.evaluate(()=>({dz:!!document.getElementById('dz'),
  txt:/図面・積算で保存した図面/.test(document.body.innerText),
  hint:(document.querySelector('#detail')||{}).innerText?.slice(0,0)||'',
  body:document.querySelector('.dropzone')? 'dz ok':'no dz'})));
await b.close();})();
