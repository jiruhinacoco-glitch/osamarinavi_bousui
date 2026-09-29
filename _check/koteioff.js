/* ★2026-09-29e 工程表（ガント）を画面から外した（§543）
   使い方: node _check/koteioff.js [kirokucho_demo.html]
   ○/★NG：①物件の付箋に「工程」が無い ②「施工中物件」の2つの付箋が見えない（PC・スマホ表示）
          ③着工日・完成日の欄は残る ④入金予定の表は出る ⑤JSエラーなし */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'kirokucho_demo.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for(const sp of [0,1]){
  const ctx=await b.newContext(sp?{viewport:{width:393,height:852},isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+F); await p.waitForFunction(()=>typeof props!=='undefined'&&props.length>0);
  const L=sp?'スマホ':'PC';
  const vis=await p.evaluate(()=>['vt_zentai','vt_jisha'].map(id=>{const e=document.getElementById(id); return !!(e&&e.offsetParent&&e.getBoundingClientRect().width>0);}));
  ok(L+' 施工中物件の付箋が見えない', !vis[0]&&!vis[1], JSON.stringify(vis));
  if(!sp){
    const tabs=await p.evaluate(()=>TABS.slice());
    ok('物件の付箋に「工程」が無い', !tabs.includes('工程'), tabs.join(','));
    const f=await p.evaluate(()=>['f_cb','f_fb'].map(id=>!!document.getElementById(id)));
    ok('着工日・完成日の欄は残る', f[0]&&f[1]);
    const ny=await p.evaluate(()=>{showView('dash'); return !!document.querySelector('#dashboard img[src*="hpic_nyukin"]');});
    ok('入金予定の表は出る', ny);
  }
  ok(L+' JSエラーなし', errs.length===0, errs.join(' / ').slice(0,200));
  await ctx.close();
 }
 await b.close(); console.log(R.join('\n'));
})();
