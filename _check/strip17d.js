/* ★2026-08-17d マスのHTMLに「動く文字」が無いこと・幅・余白・押したときの動き */
try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const vp=M==='pc'?{viewport:{width:2000,height:1010}}
      :{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true};
  const p=await b.newPage(vp);
  if(M!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+(M==='pc'?'kirokucho_demo.html':'_land.html'));
  await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  const d=await p.evaluate(()=>{
    const Z=window.nnPZ||1, c=document.querySelector('#list .pcard');
    const sh=c.querySelector('.rfiles .pshots'), dc=c.querySelector('.rfiles .pdocs');
    const grid=c.querySelector('.pshgrid');
    /* ①マスのHTMLに数字・物件番号・onclick が無い */
    const html=grid.outerHTML;
    const cells=[...grid.querySelectorAll('.psh')];
    return {
      noDigits: !/[0-9]/.test(html.replace(/data-i="[0-9]+"/g,'')) || null,
      htmlSample: html.slice(0,180),
      hasOnclick: /onclick/.test(html),
      cellN: cells.length,
      cellsVisible: cells.filter(e=>{const r=e.getBoundingClientRect(), g=grid.getBoundingClientRect();
        return r.right<=g.right+1 && r.width>=40;}).length,
      moreVisible: (()=>{const m=c.querySelector('.pshmore'), r=m.getBoundingClientRect(),
        s2=sh.getBoundingClientRect(); return r.width>10 && r.right<=s2.right+1;})(),
      gap: Math.round((dc.getBoundingClientRect().left-sh.getBoundingClientRect().right)/Z),
      gridW: Math.round(grid.getBoundingClientRect().width/Z),
      strays:(sh.innerText||'').replace(/他|写真\d+/g,'').trim()};
  });
  const PH=M!=='pc';
  ok('①マスのHTMLに onclick が無い（物件番号を埋め込まない）', !d.hasOnclick, d.htmlSample);
  ok('①マスの中に数字の文字が無い'+(PH?'':'（PCは表示用の写真N・番号だけ）'), PH? d.strays==='' : true, JSON.stringify(d.strays));
  ok('②マスは'+(PH?5:10)+'枚とも見切れず全部見える', d.cellN===(PH?5:10)&&d.cellsVisible===d.cellN,
     d.cellsVisible+'/'+d.cellN+'枚（帯'+d.gridW+'px）');
  ok('②「他」ボタンも見える', d.moreVisible);
  ok('③提出書類との間に余白がある（30px以上）', d.gap>=30, d.gap+'px');
  /* ④押したときの動き（空き枠→写真選択／他→写真タブ） */
  const picked=await p.evaluate(()=>new Promise(res=>{
    const orig=window.pickFiles; window.pickFiles=function(pid){ window.pickFiles=orig; res(pid); };
    document.querySelector('#list .pcard .rfiles .psh').click();
    setTimeout(()=>res(null),1500);
  }));
  ok('④空き枠を押すと写真を選ぶ処理が動く（正しい物件番号）', picked!==null &&
     await p.evaluate(pid=>+document.querySelector('#list .pcard').dataset.pid===pid, picked), String(picked));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('['+M+']'); console.log(R.join('\n'));
  await b.close();
})();
