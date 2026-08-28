/* 国交省仕様のデータが欠けていないか（29仕様）
   ★記号・工法・名前・表番号・出典ページ・工程が1つでも抜けると、表がスカスカになる。
   ★同じ記号が2つあるのは正しい（新築と改修で同じ記号を使う）。
     ただし「同じ記号かつ同じ新築/改修」は誤り。
   使い方: node _check/kokdata.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/kokkosho.html',{waitUntil:'load'});
await p.waitForTimeout(1600);
const r=await p.evaluate(()=>{
  const S=SPECIES;
  const need=['id','mode','hou','group','code','method','name','table','page'];
  const miss=S.filter(x=>need.some(k=>!x[k])).map(x=>(x.code||x.id)+'→'+need.filter(k=>!x[k]).join(','));
  const ids=S.map(x=>x.id), dupId=[...new Set(ids.filter((c,i)=>ids.indexOf(c)!==i))];
  const pairs=S.map(x=>x.mode+'/'+x.code);
  const dupPair=[...new Set(pairs.filter((c,i)=>pairs.indexOf(c)!==i))];
  /* ★工程（steps）が無い仕様がある。まとめて載せている行（「A-1〜B-2」など）で、
     そちらは注記（notes）に中身が入り、画面には「概要収録 › 原文参照」と出る。
     だから「工程も注記も両方とも空」だけを誤りとする。 */
  const noSteps=S.filter(x=>(!Array.isArray(x.steps)||!x.steps.length)
                          &&(!Array.isArray(x.notes)||!x.notes.length)).map(x=>x.code);
  const badStep=[];
  S.forEach(x=>(x.steps||[]).forEach(st=>{ if(!st.mat) badStep.push(x.code); }));
  const hous=[...new Set(S.map(x=>x.hou))];
  const badHou=hous.filter(h=>!HOU[h]);
  /* 表番号は「表9.3.1」のほか、改修では「3.6節」のように節で示すものもある */
  const badTbl=S.filter(x=>!/^表\d|^\d+(\.\d+)*節/.test(x.table)).map(x=>x.code+':'+x.table);
  const badCg=[]; const parts=new Set(CG_PARTS.map(x=>x.id));
  S.forEach(x=>(x.cg||[]).forEach(c=>{ if(!parts.has(c)) badCg.push(x.code+':'+c); }));
  return {n:S.length, miss, dupId, dupPair, noSteps, badStep:[...new Set(badStep)], hous, badHou,
    badTbl, badCg:[...new Set(badCg)],
    shin:S.filter(x=>x.mode==='shin').length, kai:S.filter(x=>x.mode!=='shin').length,
    qa:(typeof QA!=='undefined')?QA.length:-1,
    qaMiss:(typeof QA!=='undefined')?QA.filter(x=>!x.q||!x.a||!x.ref).length:-1,
    emptyCell:[...document.querySelectorAll('tbody tr')]
      .map(tr=>[...tr.children].map(td=>td.textContent.trim()))
      .filter(c=>c.length>=4 && !c[3]).length,
    rowN:document.querySelectorAll('tbody tr').length};
});
console.log('     仕様 '+r.n+'件（新築'+r.shin+'・改修'+r.kai+'）／工法 '+r.hous.join(',')+'／Q&A '+r.qa+'件');
ok(r.n>=29,'仕様が29件以上ある ('+r.n+')');
ok(r.miss.length===0,'記号・工法・名前・表番号・出典がすべてある '+r.miss.slice(0,3).join(' / '));
ok(r.dupId.length===0,'id の重複が無い '+r.dupId.join(','));
ok(r.dupPair.length===0,'「同じ新築/改修で同じ記号」が無い '+r.dupPair.join(','));
ok(r.noSteps.length===0,'工程と注記が両方とも空の仕様が無い '+r.noSteps.slice(0,4).join(','));
ok(r.badStep.length===0,'工程の材料名が抜けていない '+r.badStep.slice(0,4).join(','));
ok(r.badHou.length===0,'工法の色・名前がすべて定義ずみ '+r.badHou.join(','));
ok(r.badTbl.length===0,'表番号が「表◯」か「◯.◯節」の形 '+r.badTbl.slice(0,3).join(' / '));
ok(r.badCg.length===0,'図の部位（cg）がすべて定義ずみ '+r.badCg.slice(0,3).join(' / '));
ok(r.qa>=10,'Q&Aが10件以上 ('+r.qa+')');
ok(r.qaMiss===0,'Q&Aに質問・答え・出典がそろっている ('+r.qaMiss+'件もれ)');
ok(r.rowN>=29,'画面の表に29行以上ある ('+r.rowN+')');
ok(r.emptyCell===0,'画面で「工程」の欄が空っぽの行が無い ('+r.emptyCell+'行)');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
