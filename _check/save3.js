/* 現場記録帳・材料登録・発注の「保存されるもの」が開き直しても戻るか
   使い方: node _check/save3.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,ex)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(ex!==undefined?'  '+JSON.stringify(ex):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1500,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));

/* ===== 現場記録帳 ===== */
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2200);
const pid=await p.evaluate(()=>{
  const id=props[0].id;
  /* 不具合タグ */
  if(window.nnDefSave) nnDefSave(props[0].code||('J'+String(id).padStart(3,'0')), ['fukure','rosui']);
  else { const K='nn_kirokucho_def_v1'; const o=JSON.parse(localStorage.getItem(K)||'{}');
         o[props[0].code||('J'+String(id).padStart(3,'0'))]=['fukure','rosui'];
         localStorage.setItem(K,JSON.stringify(o)); }
  /* 屋根・部位の内訳 */
  if(window.nnFacesSave) nnFacesSave(props[0].name, [
    {n:'屋上A',ko:'塩ビシート 機械的固定工法（S-M2）',sp:'S-M2',q:520,un:'㎡'},
    {n:'塔屋',ko:'ウレタン塗膜防水 通気緩衝工法（X-1）',sp:'X-1',q:80,un:'㎡'},
    {n:'目地',ko:'シーリング',sp:'',q:120,un:'m'}]);
  /* 工程の編集 */
  const K2='nn_kirokucho_gantt_v1';
  try{ const o=JSON.parse(localStorage.getItem(K2)||'{}'); o['__test']=[{n:'試験工程',s:'2026-09-01',e:'2026-09-05'}];
       localStorage.setItem(K2,JSON.stringify(o)); }catch(_){}
  return props[0].code||('J'+String(id).padStart(3,'0'));
});
const nm=await p.evaluate(()=>props[0].name);
await p.reload({waitUntil:'load'}); await p.waitForTimeout(2400);
const k=await p.evaluate(([pid,nm])=>{
  const def=(window.nnDefOf?nnDefOf(pid):JSON.parse(localStorage.getItem('nn_kirokucho_def_v1')||'{}')[pid])||[];
  const fc=(window.nnFaceList?nnFaceList(nm):null);
  const g=JSON.parse(localStorage.getItem('nn_kirokucho_gantt_v1')||'{}');
  return {tag:def, faces:fc?fc.length:0, 合計:fc?fc.filter(x=>x.un==='㎡').reduce((a,x)=>a+x.q,0):0,
          m単位:fc?fc.filter(x=>x.un==='m').length:0, gantt:!!g['__test']};
},[pid,nm]);
ok(Array.isArray(k.tag)&&k.tag.join(',')==='fukure,rosui','記録帳：不具合タグが戻る',k.tag);
ok(k.faces===3,'記録帳：屋根・部位の内訳が3面とも戻る',k.faces);
ok(k.合計===600,'記録帳：㎡の合計が合う（520+80）',k.合計);
ok(k.m単位===1,'記録帳：単位が m の面も残る（合計に混ぜない）',k.m単位);
ok(k.gantt,'記録帳：工程の編集が残る',k.gantt);

/* ===== 材料登録：単価の変更と、価格改定の履歴（§148） ===== */
await p.goto('http://localhost:8899/zairyo_toroku.html',{waitUntil:'load'}); await p.waitForTimeout(2000);
await p.evaluate(()=>{ const r=document.querySelector('#list .mrow'); if(r)r.click(); });
await p.waitForTimeout(800);
const z=await p.evaluate(()=>{
  let inp=document.getElementById('d_price');
  if(!inp) return {なし:1};
  /* ★履歴は「前の単価があったとき」だけ残る（0円→値を入れただけでは改定ではない）。
     なので、まず単価を入れて保存し、そのあと値上げして保存する。 */
  inp.value='6800'; inp.dispatchEvent(new Event('change',{bubbles:true}));
  if(window.saveDetail) saveDetail();
  /* ★保存すると詳細が作り直されるので、欄を取り直してから2回目を入れる */
  inp=document.getElementById('d_price');
  inp.value='7300'; inp.dispatchEvent(new Event('change',{bubbles:true}));
  if(window.saveDetail) saveDetail();
  return {前:6800, 後:7300};
});
ok(!z.なし,'材料登録：単価の欄がある',z);
await p.reload({waitUntil:'load'}); await p.waitForTimeout(2200);
const z2=await p.evaluate(want=>{
  const raw=localStorage.getItem('nn_materials_v1')||'';
  let items=[]; try{ const o=JSON.parse(raw); items=o.items||o||[]; }catch(_){}
  const hit=(items||[]).find(x=>+x.price===want);
  return {保存あり:raw.length>10, 単価が残る:!!hit, 履歴:hit&&hit.hist?hit.hist.length:0};
}, z.後);
ok(z2.保存あり,'材料登録：保存が残っている',z2.保存あり);
ok(z2.単価が残る,'材料登録：変えた単価が開き直しても残る',z2);
ok(z2.履歴>=1,'材料登録：価格改定の履歴（前の単価）が残る（§148）',z2.履歴);

/* ===== 発注：履歴 ===== */
await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'}); await p.waitForTimeout(2000);
await p.evaluate(()=>{ const h=JSON.parse(localStorage.getItem('nn_hacchu_hist')||'[]');
  h.push({id:'TEST-1', name:'検査用', date:'2026-08-24', items:[{n:'材料A',q:5,p:1000}]});
  if(window.nnSet) nnSet('nn_hacchu_hist',JSON.stringify(h)); else localStorage.setItem('nn_hacchu_hist',JSON.stringify(h)); });
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1800);
const h=await p.evaluate(()=>{ const a=JSON.parse(localStorage.getItem('nn_hacchu_hist')||'[]');
  return a.some(x=>x.id==='TEST-1'); });
ok(h,'発注：履歴が残る',h);
ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
