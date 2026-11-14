/* 「Googleマップ」「Google Earth（3D）」で開くとき、地点マーク（赤いピン）を付けない（2026-11-16d）。直す前の版では★NG。
   国土地理院の住所検索の返事は、この検査の中で用意した値に差し替える（作業場所からは国土地理院につながらないため）。
   ①住所が見つかったとき：Googleマップは「地図の表示だけ」（map_action=map・center=緯度,経度・航空写真）で開く＝検索（search）で開かない
   ②Google Earth も 緯度・経度（@緯度,経度…）で開く
   ③住所が見つからないとき：今までどおり住所の検索で開く（何も開かない、にならない）
   ④施設名（空白のあと・かっこ）を外して問い合わせている
   使い方: node _check/mapopen.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
let asked=[], found=true;
await ctx.route('https://msearch.gsi.go.jp/**',r=>{ asked.push(decodeURIComponent(r.request().url().split('q=')[1]||'')); r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(found?[{geometry:{coordinates:[141.3712,43.0285],type:'Point'},type:'Feature',properties:{title:'札幌市豊平区中の島一条八丁目'}}]:[])}); });
await ctx.route(/https:\/\/(www\.google\.com|earth\.google\.com)\/.*/,r=>r.fulfill({status:200,contentType:'text/html',body:'<html>ok</html>'}));
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof nnMapOpen==='function'); await p.waitForTimeout(800);
const ADDR='北海道札幌市豊平区中の島1条8丁目3−18 北海道病院（地域医療機能推進機構）';
const openUrl=async(k)=>{ const pop=ctx.waitForEvent('page',{timeout:8000}); await p.evaluate(([k,a])=>nnMapOpen(k,a),[k,ADDR]); const pg=await pop;
  /* 空のタブ → 行き先、の順に変わるので、about:blank 以外になるまで待つ */
  for(let i=0;i<60&&(!pg.url()||pg.url()==='about:blank');i++) await p.waitForTimeout(100); const u=pg.url(); await pg.close().catch(()=>{}); return u; };
const m=await openUrl('m');
ok(/map_action=map/.test(m)&&/center=43\.0285,141\.3712/.test(m)&&/basemap=satellite/.test(m)&&!/search/.test(m),'①住所が見つかったとき：Googleマップは「地図の表示だけ」・航空写真で開く（ピンなし）',m);
const e=await openUrl('e');
ok(/earth\.google\.com\/web\/@43\.0285,141\.3712/.test(e)&&!/search/.test(e),'②Google Earth も 緯度・経度で開く',e);
found=false; const f=await openUrl('m');
ok(/maps\/search\/\?api=1&query=/.test(f),'③住所が見つからないとき：今までどおり住所の検索で開く',f);
ok(asked.length>=1&&asked[0]==='北海道札幌市豊平区中の島1条8丁目3-18','④施設名を外し、全角の「−」を「-」にして問い合わせている',asked[0]);
ok(errs.length===0,'エラーが出ていない',errs.slice(0,2));
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
