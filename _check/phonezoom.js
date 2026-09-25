/* 2026-09-25e 仕様・材料／材料登録（スマホ）：一覧表示（幅980を縮める）のための1.6〜1.8倍の拡大が、
   スマホ表示（端末の幅のまま）にもかかって全部が大きすぎた（本人「なんか、でかくね？」）。
   ・スマホ表示：一覧・詳細・帯は拡大しない（見た目の大きさ＝本来の大きさ）、一覧の1行は60px以下
   ・一覧表示：今までどおり1.8倍（縮めた画面で文字が小さくなりすぎないように） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,220):''));
 const f0=process.argv[2];
 for(const f of f0?[f0]:['shiyo_toroku','zairyo_toroku']) for(const mode of ['mobile','ichiran']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  await ctx.addInitScript(m=>{try{localStorage.setItem('nn_view_mode',m)}catch(e){}},mode);
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
  const q=await pg.evaluate(()=>{const l=document.getElementById('list');const r=[...l.querySelectorAll('.mrow')].find(x=>x.offsetHeight);
    const sc=e=>e?Math.round(e.getBoundingClientRect().height/e.offsetHeight*100)/100:null;
    return {listZoom:sc(r),rowH:r?Math.round(r.getBoundingClientRect().height):null,tabZoom:sc(document.querySelector('#viewtabs button'))};});
  if(mode==='mobile') ok(q.listZoom<1.1&&q.tabZoom<1.1&&q.rowH<=60,f+' スマホ表示：一覧・帯を拡大しない（1行60px以下）',q);
  else ok(q.listZoom>=1.7,f+' 一覧表示：今までどおり1.8倍',q);
  ok(errs.length===0,f+' '+mode+' JSエラーなし',errs);
  await ctx.close();
 }
 await b.close();
})();
