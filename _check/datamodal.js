/* 材料登録・仕様登録の「データ管理」（CSV書き出し・バックアップ／復元・
   価格表の一括取り込み・全データ削除）が、画面から開けるか。
   ★2026-08-24ag まで、この画面はどこからも開けず、機能が使えなかった。
   使い方: node _check/datamodal.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;
const ok=(t,c,x)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(x!==undefined?'  '+JSON.stringify(x).slice(0,140):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [f,name,nakami] of [
  ['zairyo_toroku.html','材料登録',['CSV','バックアップ','価格表','全データを削除']],
  ['shiyo_toroku.html','仕様登録',['CSV','バックアップ','全削除']],
]){
  const ctx=await b.newContext({viewport:{width:1500,height:950}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
  await p.goto('http://localhost:8899/'+f,{waitUntil:'load'});
  await p.waitForTimeout(2000);
  /* 入口のボタンを探して押す（決め打ちの関数呼び出しではなく、実際に見えるボタンを押す） */
  const btn=await p.evaluate(()=>{
    const e=[...document.querySelectorAll('header button, button')].find(x=>/データ/.test(x.textContent)&&x.offsetParent!==null);
    if(!e) return null;
    e.click(); return (e.textContent||'').trim();
  });
  ok(name+'：画面に「データ」の入口がある', !!btn, btn);
  await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{
    const m=document.getElementById('dataModal');
    return {開いた:!!m&&m.classList.contains('open'),
            中身:m?m.innerText.replace(/\s+/g,' '):''};
  });
  ok(name+'：押すとデータ管理が開く', r.開いた, r.開いた);
  nakami.forEach(k=>ok(name+'：中に「'+k+'」がある', r.中身.indexOf(k)>=0));
  ok(name+'：JSエラーなし', errs.length===0, errs.slice(0,2));
  await ctx.close();
}
await b.close();
console.log('★NG'+NG);
})();
