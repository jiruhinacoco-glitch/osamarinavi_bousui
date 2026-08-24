/* 【道具】オフライン対応（サービスワーカー）を入れたら本当に圏外で開けるかを確かめる。
   ★いまは NN_USE_SW=false（切ってある）ので、この道具は
     「true にしたコピー」を別の場所に作って確かめる作りになっている。
   使い方：
     mkdir -p /tmp/swtest && cp -r *.html *.js *.css *.json ver.txt icons vendor /tmp/swtest/
     cd /tmp/swtest && sed -i 's/const NN_USE_SW=false;/const NN_USE_SW=true;/' *.html
     nohup python3 -m http.server 8901 >/dev/null 2>&1 &
     node _check/_tools/swoffline.js
   2026-08-24ac の結果：全11ページとも圏外で開けた（取れないのは ver.txt だけ＝想定どおり）。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PAGES=['index.html','kirokucho_demo.html','zumen_sekisan.html','genba_map_v36.html','hacchu.html',
 'library.html','yougo.html','kokkosho.html','camera.html','shiyo_toroku.html','zairyo_toroku.html'];
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1400,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8901/index.html',{waitUntil:'load'});
const reg=await p.evaluate(async()=>{ try{ const r=await navigator.serviceWorker.ready; return !!r.active; }catch(e){ return 'ERR:'+e.message; } });
console.log('サービスワーカーが動き出した:', reg);
/* 全ページを一度ずつ開いて、端末に保存させる */
for(const f of PAGES){ try{ await p.goto("http://localhost:8901/"+f,{waitUntil:"load"}); }catch(_){ } await p.waitForTimeout(1100); }
await p.waitForTimeout(3000);
console.log('--- ここから圏外 ---');
await ctx.setOffline(true);
for(const f of PAGES){
  const errs=[]; const h=e=>errs.push(e.message.slice(0,60)); p.on('pageerror',h);
  let ok=true; try{ await p.goto('http://localhost:8901/'+f,{waitUntil:'load'}); }catch(e){ ok=false; }
  await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>({m:document.body?document.body.innerText.replace(/\s+/g,'').length:0,
    e:document.querySelectorAll('body *').length})).catch(()=>({m:0,e:0}));
  p.off('pageerror',h);
  const bad=(!ok)||r.m<50||errs.length>0;
  console.log((bad?'★NG ':'○   ')+f.padEnd(22)+'文字'+String(r.m).padStart(6)+' 部品'+String(r.e).padStart(6)+(errs.length?'  JS:'+errs[0]:''));
}
await b.close();
})();
