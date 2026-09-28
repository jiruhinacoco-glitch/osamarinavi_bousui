/* ★2026-09-28c 材料の数量を常に表示（§536）
   仕様×形状×数量 → プライマー缶・下張り巻・砂付巻・増し張り巻。検算はこの検査の中で自分で計算する。
   node _check/matqty.js [zumen_sekisan.html]   前提： python3 -m http.server 8899 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:2000,height:1100}})).newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
try{
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1200);
await p.evaluate(()=>{ localStorage.removeItem('nn_specs_v1'); localStorage.removeItem('nn_materials_v1'); localStorage.removeItem('nn_matqty_mode'); try{nnZMenuClose();}catch(_){}});
/* 10m×8m・立上り300・天端250（AS-T1）＝ 平場80＋立上り 36×0.3＝10.8＋天端 36×0.25＝9（外周で数える本体の計算に合わせ、面積は本体の値を使う） */
await p.evaluate(()=>{ state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[]; state.d3sheet=[]; state.specCode='AS-T1';
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); saveState(); recalc(); draw(); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3000);
const E=await p.evaluate(()=>{ const d=nnEstimateData(); return {h:d.hira,t:d.tachi,e:d.tenba}; });
const A=E.h+E.t+E.e;
ok(Math.abs(E.h-80)<0.01,'平場80㎡（前提）',E);
const txt=async()=>p.evaluate(()=>{ const d=document.getElementById('nnMatQty'); return d&&d.classList.contains('on')?d.textContent:''; });
const want={pr:Math.ceil(A*0.2/17), sita:Math.ceil(A*1.1/8), suna:Math.ceil(A*1.1/8), sh:Math.ceil(A*0.5/18)};
let t=await txt();
ok(!!t,'3Dの画面に材料の数量が出ている');
ok(t.includes('プライマー'+want.pr+'缶'),'プライマー '+want.pr+'缶（'+A.toFixed(1)+'㎡×0.2kg÷17kg）',t);
ok(t.includes('下張り'+want.sita+'巻')&&t.includes('砂付'+want.suna+'巻'),'下張り・砂付 各'+want.sita+'巻（×1.10÷8㎡）',t);
ok(t.includes('増し張り0巻'),'増し張りは0（まだ貼っていない）',t);
/* 置き場所：「昼画面」の左で、ツールバーのボタンと重ならない */
const pos=await p.evaluate(()=>{ const d=document.getElementById('nnMatQty').getBoundingClientRect(), day=document.getElementById('tl_day').getBoundingClientRect();
  let hit=null; document.querySelectorAll('#toolbar button').forEach(b=>{ const r=b.getBoundingClientRect(); if(r.width>0&&b.id!=='tl_day'&&r.right>d.left&&r.left<d.right&&r.bottom>d.top&&r.top<d.bottom) hit=b.textContent.trim(); });
  return {right:Math.round(d.right), dayLeft:Math.round(day.left), top:Math.round(d.top), dayTop:Math.round(day.top), hit}; });
ok(pos.right<=pos.dayLeft&&Math.abs(pos.top-pos.dayTop)<3&&!pos.hit,'「昼画面」の左・同じ高さ・ボタンに重ならない',pos);
/* 増し張り：車止め（増し貼り0.6㎡）を2個 → 1.2㎡×1.10÷8 */
await p.evaluate(()=>{ nnBplatePanel(); document.querySelector('#nnBpBox [data-a=put]').click(); nnPlaceAtGrid(3,3); nnBplatePanel(); document.querySelector('#nnBpBox [data-a=put]').click(); nnPlaceAtGrid(6,4); recalc(); });
await p.waitForTimeout(600); t=await txt();
const m2=Math.ceil(((2*(400+400)*300+400*400-200*200)/1e6*2)*1.1/8);
ok(t.includes('増し張り'+m2+'巻'),'役物まわりの増し貼り 1.2㎡ → 増し張り '+m2+'巻',t);
/* 自社の仕様（同じ記号）があればそちら：プライマー 0.6kg/㎡ */
await p.evaluate(()=>{ localStorage.setItem('nn_specs_v1', JSON.stringify({v:1,items:[{id:'x1',code:'AS-T1',name:'自社',updatedAt:Date.now(),
  steps:[{no:'1',w:'プライマー塗り',matId:'M003',matName:'水性プライマーAS',u:0.6},{no:'2',w:'改質アスファルトシート（非露出）',matId:'M068',matName:'ポリマリット25',u:null}]}]})); recalc(); });
await p.waitForTimeout(600); t=await txt();
ok(t.includes('プライマー'+Math.ceil(A*0.6/17)+'缶')&&!t.includes('砂付'),'自社の仕様を優先（プライマー0.6kg/㎡・工程も自社のもの）',t);
/* 自社の材料の荷姿（1缶14kg）があればそちら */
await p.evaluate(()=>{ localStorage.setItem('nn_materials_v1', JSON.stringify({items:[{id:'u1',catalogId:'M003',n:'水性プライマーAS（小缶）',ou:'缶',cv:14,cu:'kg'}]})); recalc(); });
await p.waitForTimeout(600); t=await txt();
ok(t.includes('プライマー'+Math.ceil(A*0.6/14)+'缶'),'自社で登録した荷姿（14kg缶）で数える',t);
/* 見出しを押すと くわしく（計算の内わけ）→ たたむ */
await p.evaluate(()=>document.querySelector('#nnMatQty .mh').click()); await p.waitForTimeout(200);
ok(await p.evaluate(()=>{const d=document.getElementById('nnMatQty'); return d.classList.contains('open')&&getComputedStyle(d.querySelector('.md')).display!=='none'&&/重ね代/.test(d.textContent);}),'くわしく：計算の内わけが出る');
await p.evaluate(()=>document.querySelector('#nnMatQty .mh').click()); await p.waitForTimeout(200);
ok(await p.evaluate(()=>{const d=document.getElementById('nnMatQty'); return d.classList.contains('mini')&&getComputedStyle(d.querySelector('.mg')).display==='none';}),'もう一度押すと たたむ');
await p.evaluate(()=>{ document.querySelector('#nnMatQty .mh').click(); localStorage.removeItem('nn_specs_v1'); localStorage.removeItem('nn_materials_v1'); });
ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
}catch(e){ ok(false,'途中で止まった（機能が無い）',String(e.message).slice(0,120)); }
console.log('★NG',ng); await b.close();
})();
