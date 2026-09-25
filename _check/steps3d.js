/* ★2026-09-26c 3D：①工程を選んで見せる ②増し張りを別の色で（本人「AS-T1なら1層目の工程も色を変えられる？」→「①と②を進めて」）
   ① 光の列に「工程」の選び方があり、AS-T1 の工程（プライマー・下層・上層砂付）が並ぶ（下地・端末は出さない）
   ① 「改質アスシート（下層）」を選ぶ → 防水層の面がその工程の色（断面図と同じ層構成の色 #9a8577）
   ① 「上層・砂付」→ 写真の質感のまま／「完成」→ 写真の質感（今まで通り）
   ① 工程の色を変えられる（窓で「工程」を選んでブルー）・別の工程へ移って戻っても覚えている・再読み込みしても残る
   ② 増し張りの色：窓で「増し張り」を選んで色 → 増し張りの面だけその色（本体の防水層は変わらない）／戻すと材料の色
   使い方：node _check/steps3d.js [ファイル名]（http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const exe=fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).map(d=>'/opt/pw-browsers/'+d+'/chrome-linux/chrome')[0];
const file=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c) ng++; };
/* 防水層の見た目の色（nn-rooftex の印 nnAged が付いた材質）。写真があれば「写真」 */
const memCols=()=>{ const s=new Set(); T.scene.traverse(o=>{ const m=o.material; if(!m||Array.isArray(m)||!m.color||!m.userData||m.userData.nnAged===undefined) return;
  s.add(m.map?'写真':'#'+m.color.getHexString()); }); return [...s]; };
const shCols=()=>{ const s=new Set(); T.scene.traverse(o=>{ if(o.name==='nnSheet'&&o.material&&o.material.color) s.add('#'+o.material.color.getHexString()); }); return [...s]; };
(async()=>{const b=await chromium.launch({executablePath:exe,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+file); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.specCode='AS-T1'; state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}]; state.scaleM=1;
  /* 平場の上に 2m角の増し張り（材料の色 #3f3b36） */
  state.d3sheet=[{m:{n:'増し張りテスト',col:'#3f3b36',src:'t'},t:0.004,faces:[{p:[5,0.02,5],n:[0,1,0],u:[1,0,0],v:[0,0,1],pts:[[0,0],[2,0],[2,2],[0,2]]}]}];
  saveState(); setTab('d3'); });
const w3=async()=>{ await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.scene&&T.scene.children.length>3,{timeout:20000}); await p.waitForTimeout(1500); };
await w3();
const col=async()=>p.evaluate(`(${memCols})()`), shc=async()=>p.evaluate(`(${shCols})()`);
const opts=await p.evaluate(()=>{ const s=document.querySelector('#nnSkyBar .stepsel'); return s?[...s.options].map(o=>o.value||'（完成）'):null; });
ok(opts&&opts.join()==='（完成）,アスファルトプライマー,改質アスシート（下層）,改質アスシート（上層・砂付）','① 光の列に工程の選び方（下地・端末は出さない）',opts);
if(!opts){ await b.close(); console.log('★NG '+ng+'件'); return; }
const before=await col(), sh0=await shc();
const pick=async(v)=>{ await p.evaluate((v)=>{ const s=document.querySelector('#nnSkyBar .stepsel'); s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); },v); await p.waitForTimeout(1500); };
await pick('改質アスシート（下層）');
let c=await col();
ok(c.length&&c.every(x=>x==='#9a8577'),'① 下層を選ぶ → 防水層が下層の色 #9a8577',{before,c});
await pick('改質アスシート（上層・砂付）'); c=await col();
ok(c.join()==='写真','① 上層・砂付 → 写真の質感のまま',c);
await pick(''); c=await col();
ok(c.join()==='写真'&&before.join()==='写真','① 完成 → 今まで通り',c);
/* 工程の色を変える */
await pick('改質アスシート（下層）');
await p.evaluate(()=>{ document.querySelector('#nnSkyBar .tcbtn').click(); });
await p.waitForTimeout(200);
const tg=await p.evaluate(()=>[...document.querySelectorAll('#nnTcPanel .tgt button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')));
ok(tg.join()==='保護塗料,工程：改質アスシート（下層）*,増し張り','① 工程を選んでいると、窓の「色を付ける所」が工程になっている',tg);
await p.evaluate(()=>{ [...document.querySelectorAll('#nnTcPanel .chip')].find(c=>c.dataset.n==='ブルー').click(); }); await p.waitForTimeout(1500);
c=await col(); ok(c.length&&c.every(x=>x==='#7f98ad'),'① 工程の色をブルーに変えられる',c);
await pick('アスファルトプライマー'); c=await col(); ok(c.every(x=>x==='#e6dcc6'),'① プライマーはプライマーの色',c);
await pick('改質アスシート（下層）'); c=await col(); ok(c.every(x=>x==='#7f98ad'),'① 下層に戻るとブルーのまま（覚えている）',c);
/* ② 増し張り */
ok(sh0.join()==='#3f3b36','② 増し張りはふだん材料の色',sh0);
await p.evaluate(()=>{ if(!document.querySelector('#nnTcPanel.open')) document.querySelector('#nnSkyBar .tcbtn').click();
  [...document.querySelectorAll('#nnTcPanel .tgt button')].find(b=>b.dataset.tgt==='sh').click();
  [...document.querySelectorAll('#nnTcPanel .chip')].find(c=>c.dataset.n==='ベージュ').click(); }); await p.waitForTimeout(1500);
let s2=await shc(); c=await col();
ok(s2.join()==='#c9b99a'&&c.every(x=>x==='#7f98ad'),'② 増し張りだけベージュ（本体の防水層は変わらない）',{s2,c});
/* 再読み込み */
await p.reload(); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){} setTab('d3');}); await w3();
c=await col(); s2=await shc();
ok(c.every(x=>x==='#7f98ad')&&s2.join()==='#c9b99a','再読み込みしても工程・工程の色・増し張りの色が残る',{c,s2});
await p.evaluate(()=>{ document.querySelector('#nnSkyBar .tcbtn').click(); [...document.querySelectorAll('#nnTcPanel .tgt button')].find(b=>b.dataset.tgt==='sh').click();
  [...document.querySelectorAll('#nnTcPanel .btn')].find(b=>b.dataset.act==='def').click(); }); await p.waitForTimeout(1500);
s2=await shc(); ok(s2.join()==='#3f3b36','② 戻すと材料の色',s2);
ok(!errs.length,'エラーなし',errs.slice(0,3));
await b.close(); console.log(ng?('★NG '+ng+'件'):'すべて○');})();
