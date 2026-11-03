/* §1033 カードに写真を入れる→カードに出る→読み込み直しても残る（スマホ縦・PC2000）。写真は /tmp/k/ph.jpg を作って使う。使い方: node _check/cardphoto.js [kirokucho_demo.html] */
try{require('child_process').execSync("python3 -c \"from PIL import Image; Image.new('RGB',(800,600),(80,140,200)).save('/tmp/k/ph.jpg')\"",{stdio:'ignore'});}catch(e){try{require('fs').mkdirSync('/tmp/k',{recursive:true});require('child_process').execSync("python3 -c \"from PIL import Image; Image.new('RGB',(800,600),(80,140,200)).save('/tmp/k/ph.jpg')\"");}catch(_){}}
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;const ok=(c,m,x)=>{if(!c)NG++;console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):''));};
(async()=>{const b=await chromium.launch();
for(const [nm,opt,ph] of [['縦スマホ',{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2},1],['PC2000',{viewport:{width:2000,height:940}},0]]){
const ctx=await b.newContext({...opt,serviceWorkers:'block'});await ctx.addInitScript(ph=>{if(ph)localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');},ph);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3500);
const pid=await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .pcard')].find(c=>c.querySelector('.pph.none'));return c?c.dataset.pid:null;});
if(!pid){ok(false,nm+'：写真の無いカードが見つからない');continue;}
await p.setInputFiles('#list .pcard[data-pid="'+pid+'"] input.phinp','/tmp/k/ph.jpg');await p.waitForTimeout(2000);
const a=await p.evaluate(pid=>{const c=document.querySelector('#list .pcard[data-pid="'+pid+'"]');const ph=c.querySelector('.pph');const img=ph.querySelector('img');return {has:ph.classList.contains('has'),src:(img&&img.src||'').slice(0,30)};},pid);
ok(a.has&&/^(blob:|data:)/.test(a.src),nm+'：写真を入れるとカードに出る',a);
await p.reload();await p.waitForTimeout(3500);
const b2=await p.evaluate(pid=>new Promise(r=>{const t0=Date.now();(function chk(){const c=document.querySelector('#list .pcard[data-pid="'+pid+'"]');const ph=c&&c.querySelector('.pph');const img=ph&&ph.querySelector('img');const ok=ph&&ph.classList.contains('has')&&img&&/^(blob:|data:)/.test(img.src);if(ok||Date.now()-t0>6000)r({has:!!(ph&&ph.classList.contains('has')),src:(img&&img.src||'').slice(0,30)});else setTimeout(chk,300);})();}),pid);
ok(b2.has&&/^(blob:|data:)/.test(b2.src),nm+'：読み込み直しても写真が残る',b2);
ok(!errs.length,nm+'：JSエラーなし',errs.slice(0,2));await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
