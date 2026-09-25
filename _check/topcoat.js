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
/* ⑧ 詳細カラー設定：押すと六角形の色が出る・押すと3Dがその色 */
await p.evaluate(()=>{ if(!document.querySelector('#nnTcPanel.open')) document.querySelector('#nnSkyBar .tcbtn').click();
  const a=[...document.querySelectorAll('#nnTcPanel .btn')].find(b=>b.dataset.act==='adv'); if(a) a.click(); });
await p.waitForTimeout(300);
if(!(await p.$('#nnTcPanel svg.hex'))){ ok(false,'⑧ 「詳細カラー設定」ボタンと六角形の色がある'); await b.close(); console.log('★NG '+ng+'件'); return; }
const hx=await p.evaluate(()=>({n:document.querySelectorAll('#nnTcPanel svg.hex polygon[data-hx]').length, g:document.querySelectorAll('#nnTcPanel svg.hex rect[data-hx]').length, base:document.querySelectorAll('#nnTcPanel .grid .chip').length}));
ok(hx.n===127&&hx.g>=10&&hx.base>=10,'⑧ 詳細カラー設定で六角形の色が出る（見本の色もそのまま）',hx);
const want=await p.evaluate(()=>{ const g=[...document.querySelectorAll('#nnTcPanel svg.hex polygon[data-hx]')][40]; const c=g.getAttribute('data-hx');
  g.dispatchEvent(new MouseEvent('click',{bubbles:true})); return c; });
await p.waitForTimeout(1500);
c=await p.evaluate(`(${memCols})()`);
ok(c.length&&c.every(x=>x===want),'⑧ 六角形の色を押すと3Dがその色',{want,c});
/* ⑩ 窓の上に他のボタン（メニュー・向き・方向表示）がかぶらない */
const cov=await p.evaluate(()=>{ const P=document.getElementById('nnTcPanel'), b=P.getBoundingClientRect(); let bad=0,n=0; for(let fx=0.05;fx<1;fx+=0.15) for(let fy=0.03;fy<1;fy+=0.08){ const x=b.left+b.width*fx, y=b.top+Math.min(b.height,innerHeight-b.top-2)*fy; if(y>innerHeight-1) continue; n++; const e=document.elementFromPoint(x,y); if(!e||!P.contains(e)) bad++; } return {n,bad}; });
ok(cov.n>20&&cov.bad===0,'⑩ 窓の上に他のボタンがかぶらない',cov);
/* ⑪ 窓は画面（3Dの枠）の下にはみ出さない・見出しで移動・右下の角で大きさ変更・閉じて開いても同じ */
const box=()=>p.evaluate(()=>{ const P=document.getElementById('nnTcPanel'), w=document.getElementById('three-wrap'), b=P.getBoundingClientRect(), r=w.getBoundingClientRect(), s=P.querySelector('svg.hex');
  return {l:Math.round(b.left),t:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height),bottom:Math.round(b.bottom),wrapBottom:Math.round(r.bottom),hexW:s?Math.round(s.getBoundingClientRect().width):0}; });
let g0=await box();
ok(g0.bottom<=g0.wrapBottom,'⑪ 詳細カラー設定を開いても窓が下にはみ出さない',g0);
const hd=await p.evaluate(()=>{ const h=document.querySelector('#nnTcPanel h5').getBoundingClientRect(); return {x:h.left+40,y:h.top+h.height/2}; });
await p.mouse.move(hd.x,hd.y); await p.mouse.down(); await p.mouse.move(hd.x-120,hd.y+30,{steps:6}); await p.mouse.up();
let g1=await box();
ok(Math.abs((g1.l-g0.l)+120)<=2&&Math.abs((g1.t-g0.t)-30)<=2,'⑪ 見出し帯をつかんで移動（左120・下30）',{g0,g1});
if(!(await p.$('#nnTcPanel .rz'))){ ok(false,'⑪ 右下の角（大きさ変更のつまみ）がある'); await b.close(); console.log('★NG '+ng+'件'); return; }
const rz=await p.evaluate(()=>{ const h=document.querySelector('#nnTcPanel .rz').getBoundingClientRect(); return {x:h.left+h.width/2,y:h.top+h.height/2}; });
await p.mouse.move(rz.x,rz.y); await p.mouse.down(); await p.mouse.move(rz.x-50,rz.y-120,{steps:6}); await p.mouse.up();
let g2=await box();
ok(Math.abs((g2.w-g1.w)+50)<=2&&Math.abs((g2.h-g1.h)+120)<=2&&g2.hexW<g1.hexW,'⑪ 右下の角で小さくすると窓も六角形も縮む',{g1,g2});
await p.evaluate(()=>{ document.querySelector('#nnTcPanel h5 button').click(); document.querySelector('#nnSkyBar .tcbtn').click(); });
await p.waitForTimeout(200);
let g3=await box();
ok(g3.l===g2.l&&g3.t===g2.t&&g3.w===g2.w&&g3.h===g2.h,'⑪ 閉じて開いても同じ位置・大きさ',{g2,g3});
/* ⑨ ユーザー設定：赤・緑・青の数字で合わせる */
await p.evaluate(()=>{ [...document.querySelectorAll('#nnTcPanel .adv .tabs button')].find(b=>b.dataset.act==='tuser').click(); });
await p.waitForTimeout(300);
await p.evaluate(()=>{ const set=(id,v)=>{ const e=document.getElementById(id); e.value=v; };
  set('tcR',18); set('tcG',52); set('tcB',86); document.getElementById('tcB').dispatchEvent(new Event('change',{bubbles:true})); });
await p.waitForTimeout(1500);
c=await p.evaluate(`(${memCols})()`);
const hexv=await p.evaluate(()=>(document.getElementById('tcHex')||{}).value);
ok(c.length&&c.every(x=>x==='#123456')&&hexv==='#123456','⑨ ユーザー設定：RGB 18,52,86 → 3Dが #123456・色番号の欄も同じ',{c,hexv});
ok(!errs.length,'エラーなし',errs.slice(0,3));
await b.close(); console.log(ng?('★NG '+ng+'件'):'すべて○');})();
