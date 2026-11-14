/* 物件の登録画面：「＋部位を追加」が押せる（2026-11-16c 本人「部位追加ができなくなっている」）。直す前の版では★NG。
   ①ボタンの真ん中の点で、いちばん手前にあるのがボタン ②押すと部位を選ぶ一覧が開き、選ぶと部位が1つ増える
   使い方: node _check/aradd.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1900,height:950}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof openModal==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1000);
await p.evaluate(()=>openModal()); await p.waitForFunction(()=>!!document.querySelector('#f_kouji .aradd')&&document.querySelector('#f_kouji .aradd').offsetParent!==null,null,{timeout:10000});
await p.waitForTimeout(500);
const n0=await p.evaluate(()=>document.querySelectorAll('#f_kouji .arr').length);
const bt=await p.evaluate(()=>{const e=document.querySelector('#f_kouji .aradd'); const q=e.getBoundingClientRect(); const t=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2); return {x:q.left+q.width/2,y:q.top+q.height/2,top:t&&(t===e||e.contains(t)), what:t&&(t.tagName+'.'+t.className)};});
ok(bt.top,'①ボタンの真ん中で、いちばん手前にあるのがボタン',bt);
await p.mouse.click(bt.x,bt.y);
/* 開いた一覧（openPick の select）から、いちばん上の部位を選ぶ */
const picked=await p.waitForFunction(()=>{ const s=[...document.querySelectorAll('select')].find(x=>/部位を選ぶ/.test(x.innerHTML)&&x.options.length>1); return !!s; },null,{timeout:3000}).then(()=>true).catch(()=>false);
if(picked){ await p.evaluate(()=>{ const s=[...document.querySelectorAll('select')].find(x=>/部位を選ぶ/.test(x.innerHTML)&&x.options.length>1); s.value=s.options[1].value; s.dispatchEvent(new Event('change',{bubbles:true})); }); await p.waitForTimeout(400); }
const n1=await p.evaluate(()=>document.querySelectorAll('#f_kouji .arr').length);
ok(picked&&n1===n0+1,'②押すと部位を選ぶ一覧が開き、選ぶと部位が1つ増える',{一覧:picked,前:n0,後:n1});
ok(errs.length===0,'エラーが出ていない',errs.slice(0,2));
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
