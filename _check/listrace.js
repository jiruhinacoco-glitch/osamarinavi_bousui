/* 現場一覧の「まず14件→残りは次のコマ」の2段組み立てが、
   絞り込みを続けて切り替えたときに古い続きを足してしまわないか。
   （2026-08-24z に見つけた不具合：絞り込んだのに、条件に合わない物件が残って見えた）
   使い方： node _check/listrace.js                                         */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(c,t,v)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(v!==undefined?'  '+JSON.stringify(v):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
await p.waitForTimeout(1200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);

/* ① 絞り込みを立て続けに切り替える（続きが足される前に次を始める） */
const r1=await p.evaluate(async()=>{
  const seq=[['kind','改修'],['kizon','不明'],['kouzou','RC'],['kbn','材工']];
  for(const [k,v] of seq){
    for(const kk of Object.keys(listFil)) listFil[kk].clear();
    listFil[k].add(v); buildChips(); render();
    await new Promise(r=>setTimeout(r,40));      /* ★続きが足される前に次へ */
  }
  await new Promise(r=>setTimeout(r,1200));      /* 落ち着くまで待つ */
  const f=LIST_FIL.find(x=>x.key==='kbn');
  const machi=props.filter(x=>(f.val(x)||'—')==='材工').length;
  const dom=document.querySelectorAll('#list .pcard').length;
  const dup=(()=>{const s=new Set(),d=[];document.querySelectorAll('#list .pcard').forEach(c=>{
    const id=c.dataset.pid; if(s.has(id))d.push(id); s.add(id);}); return d.length;})();
  return {machi, dom, dup};
});
ok(r1.dom===r1.machi,'立て続けに絞り込んでも件数が合う',r1.dom+'/'+r1.machi+'件');
ok(r1.dup===0,'同じ物件が二重に出ない',r1.dup+'件');

/* ② 検索欄に速く打っても同じ */
const r2=await p.evaluate(async()=>{
  for(const kk of Object.keys(listFil)) listFil[kk].clear(); buildChips();
  const s=document.getElementById('q')||document.querySelector('.toolbar input[type=search],.toolbar .search input');
  const word='札幌';
  for(let i=1;i<=word.length;i++){ s.value=word.slice(0,i);
    s.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,30)); }
  await new Promise(r=>setTimeout(r,1400));
  const dom=document.querySelectorAll('#list .pcard').length;
  const machi=filtered().length;
  const dup=(()=>{const st=new Set(),d=[];document.querySelectorAll('#list .pcard').forEach(c=>{
    const id=c.dataset.pid; if(st.has(id))d.push(id); st.add(id);}); return d.length;})();
  s.value=''; s.dispatchEvent(new Event('input',{bubbles:true}));
  return {dom, machi, dup};
});
ok(r2.dom===r2.machi,'検索を速く打っても件数が合う',r2.dom+'/'+r2.machi+'件');
ok(r2.dup===0,'検索でも二重に出ない',r2.dup+'件');
ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
await b.close(); console.log('★NG'+NG);
})();
