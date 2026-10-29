/* B5：スマホの詳細「写真」「保管資料」タブに「撮る／選ぶ」の大きなボタンがあり、ドラッグの枠は出ない。
   「撮る」はカメラを直接開く指定（accept=image/* と capture）。PCは今までどおりドラッグの枠。使い方: node _check/pickbtn.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const ph of [true,false]){
const ctx=await b.newContext(ph?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'}:{viewport:{width:1280,height:860},serviceWorkers:'block'});
await ctx.addInitScript(m=>{try{localStorage.setItem('nn_view_mode',m)}catch(_){}}, ph?'mobile':'ichiran');
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const T=ph?'スマホ ':'PC ';
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
for(const tab of ['写真','保管資料']){
  await p.evaluate(t=>{showView('list'); selectedId=props[0].id; openDetailFull(); setTab(t);},tab); await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{const d=document.getElementById('dz'), bs=[...document.querySelectorAll('#detail .nnPickBtns button')].filter(x=>x.offsetParent);
    const hs=[...document.querySelectorAll('#detail .hint')].filter(x=>x.offsetParent).map(x=>x.innerText).join(' ');
    return {dz:!!(d&&d.offsetParent), btns:bs.map(x=>x.textContent.trim()), h:bs.length?Math.round(bs[0].getBoundingClientRect().height):0, dragWord:/ドラッグ/.test(hs)};});
  if(ph){ ok(T+tab+'：撮る・選ぶの大きなボタン（44px以上）', r.btns.length===2&&/撮る/.test(r.btns[0])&&r.h>=44, r);
          ok(T+tab+'：ドラッグの枠・文言が出ない', !r.dz&&!r.dragWord, r); }
  else    ok(T+tab+'：今までどおりドラッグの枠（ボタンは出ない）', r.dz&&r.btns.length===0, r);
}
if(ph){ /* 「撮る」で作られる入力の指定を見る */
  const a=await p.evaluate(()=>{const o=HTMLInputElement.prototype.click; let got=null; HTMLInputElement.prototype.click=function(){ got={accept:this.accept, cap:this.getAttribute('capture')}; };
    setTab('写真'); document.querySelector('#detail .nnPickBtns .cam').click(); HTMLInputElement.prototype.click=o; return got;});
  ok(T+'「撮る」はカメラを直接開く指定', a&&a.accept==='image/*'&&a.cap==='environment', a); }
ok(T+'JSエラーなし', errs.length===0, errs.slice(0,2)); await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
