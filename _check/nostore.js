/* 端末の保存（localStorage）がまったく使えないとき、全11ページが今までどおり開けるか。
   プライベートブラウズや「サイトのデータをブロック」設定の端末で起きる。
   読み書きの両方が例外を投げる状態を作り、
   ①ページの処理が途中で止まっていないか（JSエラー0）
   ②中身が普段より減っていないか（部品の数を普段と見くらべる）を見る。
   使い方： node _check/nostore.js                                          */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PAGES=['index.html','kirokucho_demo.html','zumen_sekisan.html','genba_map_v36.html','hacchu.html',
 'library.html','yougo.html','kokkosho.html','camera.html','shiyo_toroku.html','zairyo_toroku.html'];
let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

async function open1(f, kill){
  const ctx=await b.newContext({viewport:{width:1400,height:900}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
  if(kill) await p.addInitScript(()=>{
    const boom=()=>{ const e=new Error('SecurityError'); e.name='SecurityError'; throw e; };
    try{ Object.defineProperty(window,'localStorage',{get:()=>({getItem:boom,setItem:boom,removeItem:boom,
      key:boom,clear:boom,get length(){return boom();}})}); }catch(_){}
  });
  let ok=true;
  try{ await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); }catch(e){ ok=false; }
  await p.waitForTimeout(2000);
  const r=await p.evaluate(()=>({
    moji:document.body?document.body.innerText.replace(/\s+/g,'').length:0,
    el:document.querySelectorAll('body *').length
  })).catch(()=>({moji:0,el:0}));
  await ctx.close();
  return {ok, errs:[...new Set(errs)], ...r};
}

for(const f of PAGES){
  const nor=await open1(f,false);      /* 普段（保存が使える） */
  const kil=await open1(f,true);       /* 保存がまったく使えない */
  const err = kil.errs.length>0;
  const heru = nor.el>0 && kil.el < nor.el*0.85;   /* 部品が15%以上減った＝中身が組み上がっていない */
  const bad = (!kil.ok)||kil.moji<50||err||heru;
  if(bad)NG++;
  console.log((bad?'★NG ':'○   ')+f.padEnd(22)
    +'部品 '+String(kil.el).padStart(6)+' / 普段 '+String(nor.el).padStart(6)
    +'  文字'+String(kil.moji).padStart(6)
    +(err?'  JS: '+kil.errs.slice(0,2).join(' / '):'')
    +(heru?'  ★中身が減った':''));
}
await b.close();
console.log('★NG'+NG);
})();
