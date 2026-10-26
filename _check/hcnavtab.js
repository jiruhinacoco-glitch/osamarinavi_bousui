/* 発注ページの最初の画面（新規発注／継続発注を選ぶ・body.nn-pick）で、下のメニューが隠れたあと右下の「▲」が出るか（2026-10-26a）
   原因＝選ぶ画面は body の子をほぼ全部隠す指定があり、例外に #navShowTab が無かった。
   ①5秒たってメニューが隠れたら「▲」が見える（押せる＝いちばん上）②押すとメニューが戻る ③選ぶ画面のほかの部品は隠れたまま ④JSエラーなし
   使い方: node _check/hcnavtab.js [ファイル名.html]（直す前の版では①②が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'hacchu.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:8899/'+FILE);
  await p.waitForFunction(()=>{const n=document.getElementById('nav'); return n&&/translateY/.test(n.style.transform);},null,{timeout:9000}).catch(()=>{});
  const r=await p.evaluate(()=>{ const t=document.getElementById('navShowTab'); const bb=t.getBoundingClientRect();
    const hit=bb.width?document.elementFromPoint(bb.left+bb.width/2,bb.top+bb.height/2):null;
    const others=[...document.body.children].filter(e=>!/^(HEADER|NAV|SCRIPT|STYLE)$/.test(e.tagName)&&!['nnPick','toast','nnBtmProbe','navShowTab'].includes(e.id)&&getComputedStyle(e).display!=='none').map(e=>e.id||e.tagName);
    return {pick:document.body.classList.contains('nn-pick'), w:Math.round(bb.width), onTop:!!(hit&&hit.closest('#navShowTab')), others}; });
  ok(r.pick,'選ぶ画面（nn-pick）で始まる',r.pick);
  ok(r.w>0&&r.onTop,'①メニューが隠れたら「▲」が見えて押せる',r);
  if(r.w>0){ await p.tap('#navShowTab'); await p.waitForTimeout(500); }
  const back=await p.evaluate(()=>{const n=document.getElementById('nav'); return n.style.transform;});
  ok(back==='none','②「▲」を押すとメニューが戻る',back);
  ok(!r.others.length,'③選ぶ画面のほかの部品は隠れたまま',r.others);
  ok(!errs.length,'④JSエラーなし',errs.slice(0,2));
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
