/* 材料カタログ（244件）と登録仕様（50件）のデータが欠けていないか
   ★名前・分類・荷姿・単位・工程が抜けると、発注や積算のときに空欄になる。
   使い方: node _check/catalog1.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const errs=[];
/* ── 材料登録 ── */
let p=await b.newPage({viewport:{width:1500,height:950}});
p.on('pageerror',e=>errs.push('材料:'+String(e).slice(0,90))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zairyo_toroku.html',{waitUntil:'load'});
await p.waitForTimeout(1700);
const m=await p.evaluate(()=>{
  const C=CATALOG;
  const ids=C.map(x=>x.i);
  const need=['i','n','c1','pk','ou'];
  return {n:C.length,
    dupId:[...new Set(ids.filter((v,i)=>ids.indexOf(v)!==i))],
    miss:C.filter(x=>need.some(k=>!String(x[k]||'').trim())).map(x=>(x.i||'?')+'→'+need.filter(k=>!String(x[k]||'').trim()).join(',')),
    badCv:C.filter(x=>x.cv!=null && !(+x.cv>0)).map(x=>x.i),
    cvNoUnit:C.filter(x=>x.cv>0 && !String(x.cu||'').trim()).map(x=>x.i),
    cats:[...new Set(C.map(x=>x.c1))].length,
    rows:document.querySelectorAll('#list > *').length};
});
console.log('     材料 '+m.n+'件／大分類 '+m.cats+'種／画面の行 '+m.rows);
ok(m.n>=244,'材料が244件以上 ('+m.n+')');
ok(m.dupId.length===0,'材料の番号（i）に重複が無い '+m.dupId.slice(0,4).join(','));
ok(m.miss.length===0,'名前・分類・荷姿・単位がすべてある '+m.miss.slice(0,3).join(' / '));
ok(m.badCv.length===0,'換算の数（cv）が0や負になっていない '+m.badCv.slice(0,4).join(','));
ok(m.cvNoUnit.length===0,'換算の数があるのに単位が無いものが無い '+m.cvNoUnit.slice(0,4).join(','));
ok(m.rows>50,'画面に一覧が出ている ('+m.rows+'行)');
await p.close();
/* ── 仕様登録 ── */
p=await b.newPage({viewport:{width:1500,height:950}});
p.on('pageerror',e=>errs.push('仕様:'+String(e).slice(0,90))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/shiyo_toroku.html',{waitUntil:'load'});
await p.waitForTimeout(1700);
const s=await p.evaluate(()=>{
  const S=SPECS;
  const codes=S.map(x=>x.code);
  const need=['code','name','cat','src','ap'];
  const badStep=[];
  S.forEach(x=>{ if(!Array.isArray(x.steps)||!x.steps.length){ badStep.push(x.code+'（工程なし）'); return; }
    x.steps.forEach(st=>{ if(!String(st.no||'').trim()||!String(st.w||'').trim()) badStep.push(x.code+'（工程の番号か作業名が空）'); }); });
  return {n:S.length,
    dup:[...new Set(codes.filter((v,i)=>codes.indexOf(v)!==i))],
    miss:S.filter(x=>need.some(k=>!String(x[k]||'').trim())).map(x=>(x.code||'?')+'→'+need.filter(k=>!String(x[k]||'').trim()).join(',')),
    badStep:[...new Set(badStep)],
    cats:[...new Set(S.map(x=>x.cat))],
    rows:document.querySelectorAll('#list > *').length};
});
console.log('     仕様 '+s.n+'件／分類 '+s.cats.length+'種／画面の行 '+s.rows);
ok(s.n>=50,'仕様が50件以上 ('+s.n+')');
ok(s.dup.length===0,'仕様の記号に重複が無い '+s.dup.slice(0,4).join(','));
ok(s.miss.length===0,'記号・名前・分類・出典・適用がすべてある '+s.miss.slice(0,3).join(' / '));
ok(s.badStep.length===0,'工程の番号と作業名がすべてある '+s.badStep.slice(0,3).join(' / '));
ok(s.rows>20,'画面に一覧が出ている ('+s.rows+'行)');
await p.close();
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
