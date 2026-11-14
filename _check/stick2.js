/* PC の現場詳細：下へスクロールしても、帯（工事名〜工事場所）・屋根数の段・タブの段（概要〜追加工事）が上に残る（2026-11-15t）。直す前の版では★NG。
   ①スクロール前：3つが上から順にすき間なく並ぶ
   ②下へ送っても（100px以上送れたとき）、3つとも詳細の画面の上はしから同じ位置に残る（重ならず、すき間なく順に）
   使い方: node _check/stick2.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const W of [1900,1366]){
const p=await b.newPage({viewport:{width:W,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1000);
await p.evaluate(()=>goProperty(props[0].id)); await p.waitForFunction(()=>!!document.querySelector('#detail.lay2 > .dmenu'));
await p.waitForFunction(()=>{const t=document.querySelector('#detail > .dhead').getBoundingClientRect().top; const o=window.__T; window.__T=t; return o!==undefined&&Math.abs(o-t)<0.5;},null,{polling:400});
const m=()=>p.evaluate(()=>{ const D=document.getElementById('detail'), z=parseFloat(getComputedStyle(document.documentElement).zoom)||1, top=D.getBoundingClientRect().top;
  const R=s=>{const e=D.querySelector(s); const q=e.getBoundingClientRect(); return [Math.round((q.top-top)/z*10)/10, Math.round((q.bottom-top)/z*10)/10];};
  return {h:R(':scope > .dhead'), s:R(':scope > .dsrow'), m:R(':scope > .dmenu'), st:D.scrollTop, sh:D.scrollHeight-D.clientHeight};});
const a=await m();
const seq=x=>Math.abs(x.s[0]-x.h[1])<=1.5&&Math.abs(x.m[0]-x.s[1])<=1.5;
ok(Math.abs(a.h[0])<=12&&seq(a),'['+W+'] ①スクロール前：帯・屋根数の段・タブが上から順に並ぶ',a);
await p.evaluate(()=>{ const D=document.getElementById('detail'); D.scrollTop=600; }); await p.waitForTimeout(300);
const c=await m();
ok(c.st>=100&&Math.abs(c.h[0])<=1&&seq(c),'['+W+'] ②下へ送っても3つとも上に残る（順に・すき間なし）',c);
ok(errs.length===0,'['+W+'] エラーが出ていない',errs.slice(0,2));
await p.close(); }
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
