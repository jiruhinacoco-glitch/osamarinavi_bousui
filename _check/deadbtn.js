/* 押しても何も起きないボタンを総当たりで探す（画面の変化・保存の変化・移動をすべて見る）
   ★「躯体GL+」のように、見た目はあるのに何も起きないボタンを見つけるための道具。
   ★指の操作に近づけるため pointerdown → pointerup → click の順に流す
     （絞り込みチップなどは pointerdown で反応するので、click だけだと誤判定する）。
   ★確認の窓（confirm）は「いいえ」で閉じるので、消す系のボタンは「無反応」と出る。これは正しい。
   ★別のタブを開くボタン（PDF）も、このページは変わらないので「無反応」と出る。
   使い方: node _check/deadbtn.js                （全11ページ）
           node _check/deadbtn.js zumen_sekisan.html  （1ページだけ） */
/* 押しても何も起きないボタンを探す（画面の変化・保存の変化・移動をすべて見る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PAGES=process.argv[2]?[process.argv[2]]:
  ['zumen_sekisan.html','kirokucho_demo.html','hacchu.html','zairyo_toroku.html','shiyo_toroku.html',
   'library.html','yougo.html','kokkosho.html','camera.html','index.html','genba_map_v36.html'];
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of PAGES){
  const ctx=await b.newContext({viewport:{width:1500,height:900}});
  const p=await ctx.newPage();
  p.on('dialog',d=>d.dismiss().catch(()=>{}));      /* 確認は「いいえ」＝壊さない */
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));
  await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
  if(f==='zumen_sekisan.html'){ await p.evaluate(()=>{const s=document.getElementById('tl_sample'); if(s)s.click();}); await p.waitForTimeout(500); }

  const res=await p.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const btns=[...document.querySelectorAll('button,[role=button],.btn,.tbtn')]
      .filter(e=>e.offsetParent!==null && e.getBoundingClientRect().width>4)
      /* ページを移動するボタンは対象外（移動そのものが目的なので「無反応」ではない） */
      .filter(e=>!e.closest('nav') && !e.closest('#nav') && !/nn-back|navGo|location/.test(
        (e.className||'')+' '+(e.getAttribute('onclick')||'')));
    const dead=[], seen=new Set();
    let mut=0;
    const mo=new MutationObserver(ms=>{ mut+=ms.length; });
    mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
    const lsDump=()=>{ let s=''; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);
      s+=k+':'+(localStorage.getItem(k)||'').length+';'; } return s; };
    for(const el of btns){
      const label=(el.textContent||'').trim().slice(0,14)||el.id||el.className.slice(0,18)||'?';
      const key=(el.id||'')+'|'+label; if(seen.has(key))continue; seen.add(key);
      const url0=location.href, ls0=lsDump();
      mut=0;
      /* ★指の操作に近づける：pointerdown で反応する部品（絞り込みチップ等）があるため、
         click だけだと「無反応」と誤判定する */
      try{ const r=el.getBoundingClientRect();
        const o={bubbles:true,cancelable:true,pointerId:1,clientX:r.left+r.width/2,clientY:r.top+r.height/2};
        el.dispatchEvent(new PointerEvent('pointerdown',o));
        el.dispatchEvent(new PointerEvent('pointerup',o));
        el.click();
      }catch(e){}
      await sleep(180);
      if(location.href!==url0){ location.href=url0; await sleep(600); continue; }
      if(mut===0 && lsDump()===ls0) dead.push((el.id?'#'+el.id+' ':'')+'「'+label+'」');
      await sleep(30);
    }
    mo.disconnect();
    return {全:btns.length, 無反応:dead};
  }).catch(e=>({err:e.message.slice(0,90)}));

  if(res.err){ console.log('★ '+f+' : '+res.err); }
  else{
    console.log((res.無反応.length?'△ ':'○ ')+f.padEnd(22)+'ボタン'+String(res.全).padStart(3)+
      ' / 無反応 '+res.無反応.length);
    res.無反応.slice(0,14).forEach(x=>console.log('        '+x));
  }
  if(errs.length) console.log('        JS '+[...new Set(errs)].slice(0,2).join(' / '));
  await ctx.close();
}
await b.close();
})();
