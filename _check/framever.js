/* ダッシュボードのパネルの「四隅の金具」（§67r）が、版名つきのURLで読めているか
   ★同じ名前で絵を差し替えることがあるので、URLに版名（?v=…）が要る（§66）。
   使い方: node _check/framever.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1200,height:900}});
const reqs=[]; p.on('request',r=>{ if(/frame_c_/.test(r.url())) reqs.push(r.url().split('/').pop()); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
await p.waitForTimeout(2500);
const d=await p.evaluate(()=>{
  const el=document.querySelector('#dashboard .dpanel');
  const cs=getComputedStyle(el,'::before');   /* 角の絵は ::before に置いてある */
  return { ver:(typeof NN_VER!=='undefined'?NN_VER:'?'),
    bg:cs.backgroundImage,
    cs:cs.getPropertyValue('--cs').trim(),
    vars:['tl','tr','bl','br'].map(k=>getComputedStyle(document.documentElement).getPropertyValue('--nnc-'+k).trim()) };
});
const uniq=[...new Set(reqs)];
console.log('     読みに行った絵:', uniq.join(' ')||'（なし）');
ok(uniq.length===4,'四隅の絵を4枚読む ('+uniq.length+'枚)');
ok(uniq.every(u=>u.includes('?v=')),'どれも版名つきのURL');
ok(uniq.every(u=>u.includes('?v='+d.ver)),'版名がいまの版と同じ ('+d.ver+')');
ok(/frame_c_tl/.test(d.bg)&&/frame_c_br/.test(d.bg),'パネルの背景に四隅の絵が入っている');
ok(parseFloat(d.cs)>10,'金具の大きさ --cs が入っている ('+d.cs+')');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
