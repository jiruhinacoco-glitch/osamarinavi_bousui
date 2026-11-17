/* 工程表（ガント）：保存が壊れていても、施工中のタブが開けるか
   ★2026-08-24ag 保存が「行の並び（配列）」でない形だと、開いた瞬間に
     rows.forEach is not a function で止まり、施工中のタブが二度と開かなくなっていた。
   使い方：node _check/gantt1.js
   ★物件番号 43 は「施工中」の先頭。物件データを入れ替えたらここも直すこと。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const K='nn_kirokucho_sched_v2';
const cases=[
 ['保存が配列',        '[1,2,3]'],
 ['保存が文字',        '"あ"'],
 ['gが物',            '{"43":{"g":{"a":1},"m":null}}'],
 ['gが文字',           '{"43":{"g":"ああ"}}'],
 ['gが空の並び',       '{"43":{"g":[]}}'],
 ['行がnull混じり',    '{"43":{"g":[null,{"name":"あ","start":"2026-08-01","end":"2026-08-05"},3]}}'],
 ['行に日付が無い',    '{"43":{"g":[{"name":"あ"}]}}'],
 ['壊れたJSON',        '{{{'],
];
let ng=0;
for(const [label,v] of cases){
  const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,60)));
  await p.addInitScript(([k,val])=>{try{localStorage.setItem(k,val);}catch(_){}},[K,v]);
  await p.goto('http://localhost:8899/kirokucho_demo.html');
  await p.waitForTimeout(1400);
  const r=await Promise.race([
    p.evaluate(()=>{try{ showView('jisha');
      const a=document.querySelectorAll('#schedview .gtbl td').length;
      showView('zentai');
      const c=document.querySelectorAll('#schedview .gtbl td').length;
      showView('list');
      return {自社:a,全体:c};
    }catch(e){return '★例外 '+e.message;}}),
    new Promise(r=>setTimeout(()=>r('★固まった'),12000))]);
  /* ★2026-11-17 一覧は「まず14件→残りは次のコマ」の2段構え（§95）で、さらに工法の絵が届くと1回描き直す（kiSchedule）。
     800ms 固定で数えると描き直しの途中（14件）に当たって★NGが出た。時間でなく「100件そろう」を待つ（そろわなければ★NG）
     ★「一瞬100件」で止めると、そのあと絵が届いて描き直した瞬間（14件）を数えてしまう。0.3秒ごとに3回続けて100件なら、そろったとみなす（最大約8秒） */
  { let ok2=0; for(let i=0;i<30&&ok2<3;i++){ const c=await p.evaluate(()=>document.querySelectorAll('#list .pcard').length).catch(()=>-1); ok2=(c===100)?ok2+1:0; await p.waitForTimeout(300); } }
  const n=await p.evaluate(()=>document.querySelectorAll('#list .pcard').length).catch(()=>-1);
  if(r&&typeof r==='object')r.一覧=n;
  const ok = r && typeof r==='object' && r.自社>0 && r.全体>0 && r.一覧===100 && !errs.length;
  if(!ok)ng++;
  console.log((ok?'○   ':'★NG ')+label.padEnd(14), JSON.stringify(r), errs[0]||'');
  await p.close();
}
console.log('★NG'+ng);
await b.close();
})();
