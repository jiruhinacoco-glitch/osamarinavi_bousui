/* PC の現場詳細：編集ボタンを押さずに、その場で直す（第1段・2026-11-16f）。直す前の版では★NG。
   ①工事名・工事場所・請負金額・構造・階数・工事種別・提出保証年数の7つの欄が「押すと直せる」印つき
   ②工事名を押す→入力→Enter で、画面の表示と物件のデータが変わり、端末に保存される
   ③Esc で取り消すと元のまま ④階数・保証年数・請負金額も直せる ⑤工事種別（選ぶ欄）も直せる
   ⑥［元に戻す］で前の値に戻る ⑦開き直しても直した値が残る
   使い方: node _check/dedit.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1900,height:900}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const open=async()=>{ await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(900);
  await p.evaluate(()=>goProperty(props[0].id)); await p.waitForFunction(()=>!!document.querySelector('#detail.lay2 .dt1 > .dkv'));
  await p.waitForFunction(()=>{const t=document.querySelector('#detail > .dhead').getBoundingClientRect().top; const o=window.__T; window.__T=t; return o!==undefined&&Math.abs(o-t)<0.5;},null,{polling:400}); };
await open();
const id0=await p.evaluate(()=>props[0].id);
const fs=await p.evaluate(()=>[...document.querySelectorAll('#detail .nnde')].map(e=>e.dataset.ef).sort());
ok(JSON.stringify(fs)===JSON.stringify(['addr','hosho','kaisu','kind','kouzou','name','order']),'①7つの欄に「押すと直せる」印',fs);
const cell=async f=>{ const r=await p.evaluate(f=>{const e=document.querySelector('#detail .nnde[data-ef="'+f+'"]'); if(!e) return null; const q=e.getBoundingClientRect(); return [q.left+q.width/2,q.top+q.height/2];},f); if(r) await p.mouse.click(r[0],r[1]); await p.waitForTimeout(200); return !!r; };
const typeIn=async(v,key)=>{ await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press(key||'Enter'); await p.waitForTimeout(400); };
const st=()=>p.evaluate(id=>{ const q=props.find(x=>x.id===id); let saved=null; try{ const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1')); const a=d.edit&&d.edit[id]; saved=a?(typeof a==='string'?JSON.parse(a):a):null; }catch(e){}
  const tx=s=>{const e=document.querySelector(s); return e?e.textContent.trim():null;};
  return {name:q.name, kaisu:q.kaisu, hosho:q.hosho, order:q.order, kind:q.kind, sName:saved&&saved.name, sKaisu:saved&&saved.kaisu, tName:tx('#detail .dt1 > .nm > b.t'), tKaisu:tx('#detail .dt1 > .dkv > b.lr.le'), tHosho:tx('#detail .dsrow .dtb.hs > b'), tKind:tx('#detail .dt1 > .dtb.st > b.lr')};},id0);
const s0=await st();
await cell('name'); const inp=await p.evaluate(()=>!!document.querySelector('#detail .nnde[data-ef="name"] input.nndi'));
await typeIn('テスト工事その場'); const s1=await st();
ok(inp&&s1.name==='テスト工事その場'&&s1.tName==='テスト工事その場'&&s1.sName==='テスト工事その場','②工事名：押す→入力→Enter で表示・データ・端末の保存が変わる',{inp,name:s1.name,t:s1.tName,saved:s1.sName});
await cell('name'); await typeIn('取り消されるはず','Escape'); const s2=await st();
ok(s2.name==='テスト工事その場'&&s2.tName==='テスト工事その場','③Esc で取り消すと元のまま',{name:s2.name,t:s2.tName});
await cell('kaisu'); await typeIn('地上5階'); await cell('hosho'); await typeIn('10'); await cell('order'); await typeIn('1234567');
const s3=await st();
ok(s3.kaisu==='地上5階'&&s3.tKaisu==='地上5階'&&s3.hosho===10&&/10年/.test(s3.tHosho)&&s3.order===1234567,'④階数・保証年数・請負金額も直せる',{kaisu:s3.kaisu,tk:s3.tKaisu,hosho:s3.hosho,th:s3.tHosho,order:s3.order});
const k0=s3.kind||'改修', k1=k0==='新築'?'改修':'新築';
await cell('kind'); await p.evaluate(v=>{ const s=document.querySelector('#detail .nnde[data-ef="kind"] select'); if(!s) return; s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); },k1); await p.waitForTimeout(400);
const s4=await st(); ok(s4.kind===k1&&s4.tKind===k1,'⑤工事種別（選ぶ欄）も直せる',{前:k0,後:s4.kind,t:s4.tKind});
await cell('name'); await typeIn('元に戻す前');
const und=await p.evaluate(()=>{ const b=document.querySelector('#toast .nnundo'); if(!b) return false; b.click(); return true; }); await p.waitForTimeout(400);
const s5=await st(); ok(und&&s5.name==='テスト工事その場'&&s5.tName==='テスト工事その場','⑥［元に戻す］で前の値に戻る',{und,name:s5.name});
await open(); const s6=await st();
ok(s6.name==='テスト工事その場'&&s6.kaisu==='地上5階'&&s6.hosho===10&&s6.kind===k1,'⑦開き直しても直した値が残る',{name:s6.name,kaisu:s6.kaisu,hosho:s6.hosho,kind:s6.kind});
ok(errs.length===0,'エラーが出ていない',errs.slice(0,2));
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
