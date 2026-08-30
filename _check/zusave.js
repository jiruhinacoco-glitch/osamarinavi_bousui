/* ★2026-08-31a 図面の保存を「物件」に紐づけ、現場記録帳から続きと書類を出せるか
   node _check/zusave.js
   前提： python3 -m http.server 8899 --directory <このフォルダ>
   見るところ
   ・保存の窓に「現場記録帳の物件」の一覧が出る（手入力もできる）
   ・保存すると code／bukken が付き、「つづきから」の印（nn_zumen_cur）が残る
   ・もう一度保存すると **上書き**（同じ図面が増えない）
   ・現場記録帳の「作成図面」タブに、その物件の図面だけが出る
   ・「つづきから」で開くと図面が戻り、「書類」で開くとPDFがその場で出る */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const B='http://localhost:8899/';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
const F=process.argv[2]||'zumen_sekisan.html';

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
console.log('== '+F+' ==');
await p.goto(B+F,{waitUntil:'load'}); await p.waitForTimeout(1600);

/* ① 物件一覧が読めている */
const bk=await p.evaluate(()=>({n:(window.NN_BUKKEN||[]).length,
  first:(window.NN_BUKKEN||[])[0]||null}));
ok(bk.n>=100,'現場記録帳の物件一覧が読めている（bukken_list.js）',bk.n+'件');
ok(!!(bk.first&&bk.first.code&&bk.first.name),'物件は番号と名前を持つ',bk.first);

/* ② 図面をかく */
await p.evaluate(()=>{ nnZMenuClose(); state.scaleM=1;
  state.polys=[{pts:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],
    edges:[0,1,2,3].map(()=>nnNewEdge(300,250)),holes:[],lv:0,name:'屋根①'}];
  saveState(); draw(); });

/* ③ 保存の窓：物件を選べる／手入力もできる */
await p.evaluate(()=>nnSaveDwg()); await p.waitForTimeout(300);
const dlg=await p.evaluate(()=>{ const o=document.getElementById('nnSaveBox');
  return {open:!!o, opts:o?o.querySelectorAll('#nnSvB option').length:0,
    text:!!(o&&o.querySelector('#nnSvN')),
    fs:o?getComputedStyle(o.querySelector('#nnSvN')).fontSize:''}; });
ok(dlg.open,'「💾 保存」で窓が開く');
ok(dlg.opts>=101,'物件を一覧から選べる（＋「選ばない」）',dlg.opts+'個');
ok(dlg.text,'図面の名前は手でも書ける');
ok(parseFloat(dlg.fs)>=16,'名前の欄は16px（iPhoneが勝手に拡大しない）',dlg.fs);

/* ④ 物件を選んで保存 → 名前が自動で入る・code が付く */
const pick=await p.evaluate(()=>{ const s=document.getElementById('nnSvB');
  s.value=window.NN_BUKKEN[0].code; s.dispatchEvent(new Event('change'));
  return {code:s.value, name:document.getElementById('nnSvN').value}; });
ok(pick.name===bk.first.name,'物件を選ぶと名前が自動で入る',pick.name);
await p.click('#nnSaveBox .ok'); await p.waitForTimeout(400);
const sv=await p.evaluate(()=>({list:JSON.parse(localStorage.getItem('nn_zumen_saves_v1')||'[]'),
  cur:JSON.parse(localStorage.getItem('nn_zumen_cur')||'null')}));
ok(sv.list.length===1,'1件 保存された',sv.list.length);
ok(sv.list[0].code===pick.code,'物件番号が付く',sv.list[0].code);
ok(sv.list[0].bukken===bk.first.name,'物件名も付く',sv.list[0].bukken);
ok(sv.cur&&sv.cur.id===sv.list[0].id,'「つづきから」の印が残る',sv.cur&&sv.cur.id);

/* ⑤ もう一度保存＝上書き（同じ図面が増えない） */
await p.evaluate(()=>nnSaveDwg()); await p.waitForTimeout(250);
const ck=await p.evaluate(()=>!!document.getElementById('nnSvOv'));
ok(ck,'上書きのチェックが出る（つづきから作業していた図面）');
await p.click('#nnSaveBox .ok'); await p.waitForTimeout(350);
const sv2=await p.evaluate(()=>JSON.parse(localStorage.getItem('nn_zumen_saves_v1')||'[]'));
ok(sv2.length===1,'上書きなので件数は増えない',sv2.length);
ok(sv2[0].id===sv.list[0].id,'同じ図面のまま',sv2[0].id);

/* ⑥ 別の物件で保存＝別の図面として増える */
await p.evaluate(()=>nnSaveDwg()); await p.waitForTimeout(250);
await p.evaluate(()=>{ const s=document.getElementById('nnSvB');
  s.value=window.NN_BUKKEN[1].code; s.dispatchEvent(new Event('change'));
  const c=document.getElementById('nnSvOv'); if(c)c.checked=false; });
await p.click('#nnSaveBox .ok'); await p.waitForTimeout(350);
const sv3=await p.evaluate(()=>JSON.parse(localStorage.getItem('nn_zumen_saves_v1')||'[]'));
ok(sv3.length===2,'別の物件は別の図面として増える',sv3.length);

/* ⑦ 現場記録帳：その物件の図面だけが出る */
const k=await ctx.newPage(); const kerr=[]; k.on('pageerror',e=>kerr.push(e.message));
await k.goto(B+'kirokucho_demo.html',{waitUntil:'load'}); await k.waitForTimeout(2500);
const r=await k.evaluate(code=>{
  const pp=props.find(x=>x.code===code); selectedId=pp.id;
  openDetailFull(); curTab='作成図面'; renderDetail();
  const rows=[...document.querySelectorAll('.zusv')];
  return {name:pp.name, rows:rows.length,
    nm:rows.length?rows[0].querySelector('.nm').textContent:'',
    docs:[...document.querySelectorAll('.zusv .dc')].map(a=>a.textContent),
    op:rows.length?rows[0].querySelector('.op').getAttribute('href'):'',
    dc:rows.length?rows[0].querySelector('.dc').getAttribute('href'):''};
}, bk.first.code);
ok(kerr.length===0,'現場記録帳でJSエラーが出ない',kerr.slice(0,2));
ok(r.rows===1,'その物件の図面だけが出る（他の物件のは出ない）',r.rows);
ok(r.nm===bk.first.name,'図面の名前が出る',r.nm);
ok(r.docs.join(',')==='平面図,断面詳細図,割付図,見積書','出せる書類が並ぶ',r.docs);
ok(/\?open=/.test(r.op),'「つづきから」のリンクがある',r.op);
ok(/&doc=plan/.test(r.dc),'書類のリンクは doc= 付き',r.dc);

/* 別の物件（図面を紐づけていない物件）には、何も出ない */
const other=await p.evaluate(u=>{ const used=u; 
  return (window.NN_BUKKEN||[]).map(x=>x.code).find(c=>used.indexOf(c)<0)||''; },
  [sv3[0].code, sv3[1].code]);
const r2=await k.evaluate(code=>{ const pp=props.find(x=>x.code===code);
  if(!pp) return -1;
  selectedId=pp.id; openDetailFull(); curTab='作成図面'; renderDetail();
  return document.querySelectorAll('.zusv').length; }, other);
ok(r2===0,'図面を紐づけていない物件には出ない（混ざらない）',{code:other,rows:r2});

/* ⑧ 「つづきから」で開くと図面が戻る */
const p2=await ctx.newPage(); const e2=[]; p2.on('pageerror',e=>e2.push(e.message)); p2.on('dialog',d=>d.accept());
await p2.goto(B+r.op.replace('./',''),{waitUntil:'load'}); await p2.waitForTimeout(2200);
const back=await p2.evaluate(()=>({menu:document.body.classList.contains('nn-zmenu'),
  n:state.polys.length, cur:JSON.parse(localStorage.getItem('nn_zumen_cur')||'null')}));
ok(!back.menu,'つづきからは入口メニューを出さず、そのまま図面へ');
ok(back.n===1,'かいた屋根が戻っている',back.n);
ok(back.cur&&back.cur.id===sv.list[0].id,'その図面が「つづき」として覚えられる');

/* ⑨ 書類のリンクで開くと、その場でPDFが出る */
const p3=await ctx.newPage(); const e3=[]; p3.on('pageerror',e=>e3.push(e.message)); p3.on('dialog',d=>d.accept());
let opened=0;
await p3.addInitScript(()=>{ window.__docLen=0;
  const o=window.open; window.open=function(){ return {document:{write(h){window.__docLen=h.length;},close(){}},focus(){},print(){}}; }; });
await p3.goto(B+r.dc.replace('./',''),{waitUntil:'load'}); await p3.waitForTimeout(3000);
const dl=await p3.evaluate(()=>({len:window.__docLen,
  left:(function(){try{return sessionStorage.getItem('nn_zumen_doc');}catch(_){return null;}})()}));
ok(dl.len>3000,'書類（平面図PDF）がその場で出る',dl.len+'文字');
ok(dl.left===null,'一度出したら印は消える（開くたびに出続けない）',dl.left);
ok(e3.length===0,'書類のリンクでJSエラーが出ない',e3.slice(0,2));

ok(errs.length===0,'図面・積算でJSエラーが出ない',errs.slice(0,3));
console.log(ng?('=== ★NG '+ng+'件'):'全部○');
await b.close(); process.exit(ng?1:0);
})();
