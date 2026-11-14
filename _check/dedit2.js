/* PC の現場詳細：屋根の表をその場で直す（第2段・2026-11-16g）。直す前の版では★NG。
   屋根2つ（屋根1：平場560・立上り40／屋根2：平場2000・立上り100）の現場で
   ①屋根名・既存防水・部位ごとの面積の欄が「押すと直せる」印つき
   ②屋根1の屋根名を直す → 表とデータ（p.areas）と端末の保存が変わる ③既存防水（選ぶ欄）を直せる
   ④屋根1の平場 560→600 → 表の合計が 640㎡、総数量（自分で足した値 640+2100=2740）もそろう
   ⑤押しても写真の画面が開かず、編集の窓も残っていない ⑥［元に戻す］で平場が 560 に戻る ⑦開き直しても直した値が残る
   使い方: node _check/dedit2.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1900,height:900}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let first=true;
const open=async()=>{ await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(900);
  if(first){ first=false; await p.evaluate(()=>{ const x=props[0]; const mk=(n,its)=>({n:n,ko:'ウレタン塗膜 密着工法(X-2)',mk:'田島ルーフィング',ex:'不明',items:its});
    x.areas=[mk('屋根1',[{k:'平場',q:560,u:'㎡'},{k:'立上り',q:40,u:'㎡'}]),mk('屋根2',[{k:'平場',q:2000,u:'㎡'},{k:'立上り',q:100,u:'㎡'}])]; nnPropsSave(); }); }
  await p.evaluate(()=>goProperty(props[0].id)); await p.waitForFunction(()=>document.querySelectorAll('#detail .dgai .dtr').length>=2);
  await p.waitForFunction(()=>{const t=document.querySelector('#detail > .dhead').getBoundingClientRect().top; const o=window.__T; window.__T=t; return o!==undefined&&Math.abs(o-t)<0.5;},null,{polling:400}); };
await open();
const st=()=>p.evaluate(()=>{ const x=props[0]; const R=nnRoofsOf(x,true); const rows=[...document.querySelectorAll('#detail .dgai .dtr')];
  let sv=null; try{ const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1')); const a=d.edit&&d.edit[x.id]; sv=a?(typeof a==='string'?JSON.parse(a):a):null; }catch(e){}
  return {n0:x.areas[0].n, ex0:x.areas[0].ex, h0:(x.areas[0].items.find(y=>y.k==='平場')||{}).q, svN0:sv&&sv.areas&&sv.areas[0]&&sv.areas[0].n,
    rowTxt:rows.map(r=>r.textContent.replace(/\s+/g,'')), tot:R.tot, own:x.areas.reduce((s,a)=>s+a.items.filter(y=>['平場','立上り','天端'].includes(y.k)).reduce((t,y)=>t+(+y.q||0),0),0), u0:JSON.stringify(x.areas[0].items[0]),
    modal:document.getElementById('modalbg').classList.contains('open'), photo:[...document.querySelectorAll('#nnPhotoBig, .nnRoofPh, #nnRph')].some(e=>e.offsetParent!==null)}; });
const marks=await p.evaluate(()=>[...document.querySelectorAll('#detail .dtr .nnde2')].map(e=>e.dataset.ef2+(e.dataset.k?':'+e.dataset.k:'')));
ok(marks.filter(m=>m==='n').length===2&&marks.filter(m=>m==='ex').length===2&&marks.includes('q:平場')&&marks.includes('q:立上り'),'①屋根名・既存防水・部位ごとの面積に「押すと直せる」印',marks);
const click=async sel=>{ const r=await p.evaluate(s=>{const e=document.querySelector(s); if(!e) return null; const q=e.getBoundingClientRect(); return [q.left+q.width/2,q.top+q.height/2];},sel); if(r) await p.mouse.click(r[0],r[1]); await p.waitForTimeout(250); return !!r; };
const typeIn=async(v,key)=>{ await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press(key||'Enter'); await p.waitForTimeout(700); };
await click('#detail .dtr[data-ai="0"] > .rn'); await typeIn('北棟屋上');
const s1=await st(); ok(s1.n0==='北棟屋上'&&/北棟屋上/.test(s1.rowTxt[0])&&s1.svN0==='北棟屋上','②屋根名を直すと表・データ・端末の保存が変わる',{n:s1.n0,row:s1.rowTxt[0].slice(0,30),saved:s1.svN0});
await click('#detail .dtr[data-ai="0"] > .kzc'); await p.evaluate(()=>{ const s=document.querySelector('#detail .dtr[data-ai="0"] > .kzc select'); if(!s) return; s.value='露出アスファルト防水'; s.dispatchEvent(new Event('change',{bubbles:true})); }); await p.waitForTimeout(700);
const s2=await st(); ok(s2.ex0==='露出アスファルト防水','③既存防水（選ぶ欄）を直せる',s2.ex0);
await click('#detail .dtr[data-ai="0"] .prt > b.pq[data-k="平場"]'); await typeIn('600');
const s3=await st(); ok(s3.h0===600&&/640㎡/.test(s3.rowTxt[0])&&s3.tot===2740&&s3.own===2740,'④平場 560→600：表の合計 640㎡・総数量 2740（自分で足した値と同じ）',{h:s3.h0,row:s3.rowTxt[0].slice(0,40),tot:s3.tot,own:s3.own});
ok(!s3.modal&&!s3.photo,'⑤写真の画面が開かず、編集の窓も残っていない',{modal:s3.modal,photo:s3.photo});
const und=await p.evaluate(()=>{ const b=document.querySelector('#toast .nnundo'); if(!b) return false; b.click(); return true; }); await p.waitForTimeout(800);
const s4=await st(); ok(und&&s4.h0===560&&/600㎡/.test(s4.rowTxt[0]),'⑥［元に戻す］で平場が 560 に戻る',{und,h:s4.h0});
await open(); const s5=await st();
ok(s5.n0==='北棟屋上'&&s5.ex0==='露出アスファルト防水'&&s5.h0===560,'⑦開き直しても直した値が残る',{n:s5.n0,ex:s5.ex0,h:s5.h0});
ok(errs.length===0,'エラーが出ていない',errs.slice(0,2));
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
