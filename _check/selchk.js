/* 全ページで select の実効サイズを測る／ライブラリのタグ削除と釣り合いを確認 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PAGES=['index.html','kirokucho_demo.html','zumen_sekisan.html','genba_map_v36.html','hacchu.html','kokkosho.html','camera.html','library.html','shiyo_toroku.html','yougo.html','zairyo_toroku.html'];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  for(const f of PAGES){
    const p = await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await p.waitForTimeout(900);
    const m = await p.evaluate(()=>{
      const sels=[...document.querySelectorAll('select')].filter(s=>s.offsetParent!==null);
      const inputs=[...document.querySelectorAll('input[type=text],input:not([type])')].filter(s=>s.offsetParent!==null);
      return { nSel:sels.length, selFs:[...new Set(sels.map(s=>getComputedStyle(s).fontSize))],
               nInp:inputs.length, inpFs:[...new Set(inputs.map(s=>getComputedStyle(s).fontSize))] };
    });
    const bad = m.selFs.some(v=>parseFloat(v)>15);
    console.log((bad?'★NG':'○')+' '+f+'  select '+m.nSel+'個 '+JSON.stringify(m.selFs)+'  入力欄 '+m.nInp+'個 '+JSON.stringify(m.inpFs)+(errs.length?'  JSエラー:'+errs[0]:''));
    await p.close();
  }
  // ライブラリ：タグが消えたか・釣り合い
  const p = await ctx.newPage();
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/library.html',{waitUntil:'load'}); await p.waitForTimeout(900);
  const lib = await p.evaluate(()=>{
    const ex=document.querySelectorAll('.exs .ex').length;
    const sel=document.querySelector('.filterbar select');
    const ttl=document.querySelector('.ltt');
    const bar=document.querySelector('.filterbar').getBoundingClientRect();
    const list=document.querySelector('.llist').getBoundingClientRect();
    return { ex, selFs:sel?getComputedStyle(sel).fontSize:'-', ttlFs:ttl?getComputedStyle(ttl).fontSize:'-',
             listTop:+list.top.toFixed(1), barBottom:+bar.bottom.toFixed(1), rows:document.querySelectorAll('.lrow').length };
  });
  console.log('--- ライブラリ ---');
  console.log((lib.ex===0?'○':'★NG')+' 検索例タグが消えた  残り'+lib.ex+'個');
  console.log((parseFloat(lib.selFs)<parseFloat(lib.ttlFs)?'○':'★NG')+' プルダウン('+lib.selFs+') < 一覧の見出し('+lib.ttlFs+')');
  console.log('一覧の開始位置 '+lib.listTop+'px（絞り込み帯の下端 '+lib.barBottom+'）／行数 '+lib.rows);
  await p.screenshot({path:'sel_lib.png'});
  await browser.close();
})();
