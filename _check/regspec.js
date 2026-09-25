/* 2026-09-25m 新規物件登録：工法の一覧に「マイ仕様」「登録済み材料」も出て、屋根の工法・部位の別工法に選べる（本人「役物周りは PQ-160 かも」） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,240):''));
 for(const mode of ['pc','mobile']){
  const ctx=await b.newContext(mode==='pc'?{viewport:{width:1500,height:860},serviceWorkers:'block'}:{viewport:{width:375,height:812},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');
    localStorage.setItem('nn_specs_v1',JSON.stringify({v:1,items:[{id:'s1',code:'自社仕様',name:'改修ウレタン自社標準',steps:[]}]}));
    localStorage.setItem('nn_materials_v1',JSON.stringify({v:1,items:[{id:'m1',n:'アスクールC PQ-160',maker:'田島ルーフィング',c1:'塗膜防水',ou:'缶',cv:16,cu:'kg'}]}));}catch(e){}});
  const P=mode+' ', pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo')+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>openModal()); await pg.waitForTimeout(300);
  let q=await pg.evaluate(()=>{const s=document.querySelector('#f_kouji .rfk');return [...s.querySelectorAll('optgroup')].map(g=>g.label+':'+g.children.length);});
  ok(q.some(x=>/マイ仕様/.test(x))&&q.some(x=>/登録済み材料/.test(x)),P+'屋根の工法の一覧に マイ仕様・登録済み材料 のまとまり',q);
  await pg.fill('#f_name','テスト仕様物件');
  await pg.evaluate(()=>{const a=document.querySelectorAll('#f_kouji .rf .arr input');a[0].value=200;a[0].dispatchEvent(new Event('input',{bubbles:true}));});
  await pg.evaluate(()=>document.querySelector('#f_kouji .aradd').click()); await pg.waitForTimeout(150);
  await pg.evaluate(()=>[...document.querySelectorAll('#nnSelPop .o')].find(o=>o.textContent.startsWith('役物周り')).click()); await pg.waitForTimeout(150);
  await pg.evaluate(()=>{const r=[...document.querySelectorAll('#f_kouji .arr')].find(x=>x.dataset.k==='役物周り');r.querySelector('input').value=6;r.querySelector('input').dispatchEvent(new Event('input',{bubbles:true}));r.querySelector('.kob').click();}); await pg.waitForTimeout(150);
  q=await pg.evaluate(()=>[...document.querySelectorAll('#nnSelPop .g')].map(g=>g.textContent));
  ok(q.includes('登録済み材料'),P+'部位の「工法」ボタンの一覧にも出る',q);
  await pg.evaluate(()=>[...document.querySelectorAll('#nnSelPop .o')].find(o=>/PQ-160/.test(o.textContent)).click()); await pg.waitForTimeout(150);
  q=await pg.evaluate(()=>({alt:JSON.parse(f_areas.value)[0].items.filter(i=>i.ko).map(i=>i.k+'＝'+i.ko).join(),btn:[...document.querySelectorAll('#f_kouji .kob.set')].map(b=>b.textContent)}));
  ok(/役物周り＝アスクールC PQ-160（田島ルーフィング）/.test(q.alt)&&q.btn[0]==='別',P+'役物周り＝PQ-160 を選べる',q);
  await pg.evaluate(()=>saveProperty()); await pg.waitForTimeout(300);
  q=await pg.evaluate(()=>{const p=props.find(x=>x.name==='テスト仕様物件');return p&&p.areas[0].items.find(i=>i.k==='役物周り');});
  ok(q&&/PQ-160/.test(q.ko||'')&&q.q===6,P+'保存される',q);
  ok(errs.length===0,P+'JSエラーなし',errs);
  await ctx.close();
 }
 await b.close();
})();
