/* ★2026-09-26 3Dの「施工後」に保護塗料の色（本人の指示）
   ① 光のボタン列に「保護塗料」ボタンがある
   ② 見本の色を押す → 3Dの防水層がその色になる（防水層の材質の色を直接数える）
   ③ 「自分の色」に名前を付けて保存 → 一覧に出る・保存キー nn_mycolors_v1
   ④ 材料に色を付ける → 材料登録の保存に col3d が入り、「材料登録の色」に出る
   ⑤ 工法の標準の色に戻す → 元の色に戻る
   ⑥ 再読み込みしても選んだ色が残る
   ⑦ メーカーの色名が入っていない（見本は一般的な色の名前だけ）
   使い方：node _check/topcoat.js [ファイル名]（http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const exe=fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).map(d=>'/opt/pw-browsers/'+d+'/chrome-linux/chrome')[0];
const file=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c) ng++; };
/* 防水層（sheet/vinyl/coat の材質）の色を数える。検査したい関数（nnMemColor）は使わない */
/* 防水層の材質＝質感を貼る仕組み（nn-rooftex）が nnAged の印を付けたもの。見た目の色＝写真があれば「写真」、無ければ材質の色 */
const memCols=()=>{ const s=new Set(); T.scene.traverse(o=>{ const m=o.material; if(!m||Array.isArray(m)||!m.color||!m.userData||m.userData.nnAged===undefined) return;
  s.add(m.map?'写真':'#'+m.color.getHexString()); }); return [...s]; };
(async()=>{const b=await chromium.launch({executablePath:exe,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1400,height:900},serviceWorkers:'block'}); const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+file); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('nn_materials_v1',JSON.stringify({v:1,items:[{n:'テスト保護塗料',maker:'テスト社'}]})); });
await p.reload(); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
await p.evaluate(()=>setTab('d3')); await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.scene&&T.scene.children.length>3,{timeout:20000}); await p.waitForTimeout(1500);
const before=await p.evaluate(`(${memCols})()`);
const btn=await p.$('#nnSkyBar .tcbtn'); ok(!!btn,'① 光の列に「保護塗料」ボタン');
if(!btn){ await b.close(); console.log('★NG '+ng+'件'); return; }
await btn.click(); await p.waitForTimeout(200);
const names=await p.evaluate(()=>[...document.querySelectorAll('#nnTcPanel .grid .chip span')].map(e=>e.textContent));
ok(names.length>=8&&!names.some(n=>/サーモ|ファイン|SP|田島|ダイフレックス|AGC|ヤマデ/.test(n)),'⑦ 見本は一般的な色の名前だけ',names);
await p.evaluate(()=>{ [...document.querySelectorAll('#nnTcPanel .chip')].find(c=>c.dataset.n==='ブルー').click(); });
await p.waitForTimeout(1500);
let c=await p.evaluate(`(${memCols})()`);
ok(c.length&&c.every(x=>x==='#7f98ad'),'② 見本「ブルー」→ 防水層がその色',{before,after:c});
await p.evaluate(()=>{ if(!document.querySelector('#nnTcPanel.open')) document.querySelector('#nnSkyBar .tcbtn').click();
  const pk=document.getElementById('tcPick'); pk.value='#a1b2c3'; document.getElementById('tcName').value='テストの色';
  [...document.querySelectorAll('#nnTcPanel .btn')].find(b=>b.dataset.act==='my').click(); });
await p.waitForTimeout(1500);
const my=await p.evaluate(()=>({ls:JSON.parse(localStorage.getItem('nn_mycolors_v1')||'[]'), shown:[...document.querySelectorAll('#nnTcPanel .my .chip span')].map(e=>e.textContent)}));
c=await p.evaluate(`(${memCols})()`);
ok(my.ls.length===1&&my.ls[0].n==='テストの色'&&my.ls[0].c==='#a1b2c3'&&my.shown.includes('テストの色')&&c.length&&c.every(x=>x==='#a1b2c3'),'③ 自分の色に保存・一覧に出る・3Dもその色',{my,c});
await p.evaluate(()=>{ if(!document.querySelector('#nnTcPanel.open')) document.querySelector('#nnSkyBar .tcbtn').click();
  document.getElementById('tcPick').value='#445566'; const s=document.getElementById('tcMat'); s.value='0';
  [...document.querySelectorAll('#nnTcPanel .btn')].find(b=>b.dataset.act==='mat').click(); });
await p.waitForTimeout(1500);
const mat=await p.evaluate(()=>({d:JSON.parse(localStorage.getItem('nn_materials_v1')), shown:[...document.querySelectorAll('#nnTcPanel .lb')].map(e=>e.textContent)}));
ok(mat.d&&mat.d.v===1&&mat.d.items[0].col3d==='#445566'&&mat.d.items[0].n==='テスト保護塗料'&&mat.shown.includes('材料登録の色'),'④ 材料に色（保存の形はそのまま）',mat);
await p.reload(); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>setTab('d3')); await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.scene&&T.scene.children.length>3,{timeout:20000}); await p.waitForTimeout(1500);
c=await p.evaluate(`(${memCols})()`);
ok(c.length&&c.every(x=>x==='#445566'),'⑥ 再読み込みしても残る',c);
await p.evaluate(()=>{ document.querySelector('#nnSkyBar .tcbtn').click(); [...document.querySelectorAll('#nnTcPanel .btn')].find(b=>b.dataset.act==='def').click(); });
await p.waitForTimeout(1500);
c=await p.evaluate(`(${memCols})()`);
ok(JSON.stringify(c.sort())===JSON.stringify(before.sort()),'⑤ 工法の標準の色に戻る',{before,c});
ok(!errs.length,'エラーなし',errs.slice(0,3));
await b.close(); console.log(ng?('★NG '+ng+'件'):'すべて○');})();
