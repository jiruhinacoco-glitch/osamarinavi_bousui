/* 2026-09-25k 新規物件登録の作り直し（本人の指摘①〜⑬）を端から端まで通す（PC・スマホ）
   ①見出し18px以上・太字 ③区切り見出しに「■」 ④入力枠の角は2px以下 ⑤元請の「▼」で一覧
   ⑧工事区分（新築・改修…）を選べる ⑨⑪改修＝屋根ごとに 構造体→既存防水→新規防水 の順／新築は既存防水を出さない
   ⑦新規防水の絵が出る ⑩部位ごとに別の工法を選べる（内訳に分かれて保存） ⑫屋根ごとに既存防水が別 ⑬構造体も屋根ごと
   ⑥部位は2列 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,240):''));
 for(const mode of ['pc','mobile']){
  const ctx=await b.newContext(mode==='pc'?{viewport:{width:1500,height:860},serviceWorkers:'block'}:{viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
  const P=mode+' ', pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo')+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1300);
  await pg.evaluate(()=>openModal()); await pg.waitForTimeout(300);
  let q=await pg.evaluate(()=>{const t=document.getElementById('modalTitle'),cs=getComputedStyle(t);
    return {fs:parseFloat(cs.fontSize),fw:+cs.fontWeight,sq:[...document.querySelectorAll('#modalbg .msec')].filter(m=>m.offsetHeight).every(m=>/■/.test(getComputedStyle(m,'::before').content)),
      rad:Math.max(...[...document.querySelectorAll('#modalbg input,#modalbg select')].filter(e=>e.offsetHeight).map(e=>parseFloat(getComputedStyle(e).borderTopLeftRadius)))};});
  ok(q.fs>=18&&q.fw>=800&&q.sq&&q.rad<=2,P+'①③④見出し・■・角2px',q);
  await pg.evaluate(()=>document.querySelector('#modalbg .mp-dd').click()); await pg.waitForTimeout(150);
  q=await pg.evaluate(()=>document.getElementById('nnSelPop').classList.contains('open')); ok(q,P+'⑤元請の▼で一覧が開く',q); await pg.evaluate(()=>nnSelClose());
  q=await pg.evaluate(()=>{const b=[...document.querySelectorAll('#f_kouji .kseg button')].map(x=>x.textContent);const rf=document.querySelector('#f_kouji .rf');
    const labs=[...rf.querySelectorAll('.rfspec label')].map(l=>l.textContent);const cols=new Set([...rf.querySelectorAll('.arr')].map(a=>Math.round(a.getBoundingClientRect().left))).size;
    return {b,labs,cols,on:(document.querySelector('#f_kouji .kseg .on')||{}).textContent};});
  ok(q.b.join()==='新築,改修,増改築,部分補修'&&q.on==='改修',P+'⑧工事区分を選べる（はじめは改修）',q);
  ok(q.labs.join('|')==='構造体|既存防水|新規防水（工法）',P+'⑨⑪⑬屋根ごとに 構造体→既存防水→新規防水 の順',q.labs);
  ok(q.cols===2,P+'⑥部位は2列',q.cols);
  await pg.evaluate(()=>{const s=document.querySelector('#f_kouji .rfk');s.value='改質アスファルトシート トーチ工法(AS-T1)';s.dispatchEvent(new Event('change',{bubbles:true}));});
  q=await pg.evaluate(()=>document.querySelector('#f_kouji .rfk').parentNode.querySelector('img').getAttribute('src')); ok(/kou_|\/kq\/torch/.test(q||''),P+'⑦新規防水の絵が出る',q);
  await pg.fill('#f_name','テスト区分物件');
  await pg.evaluate(()=>{const e=document.querySelector('#f_kouji .rf .rfe');e.value='露出アスファルト防水';e.dispatchEvent(new Event('change',{bubbles:true}));});
  let ins=await pg.$$('#f_kouji .rf:nth-child(1) .arr input'); await ins[0].fill('300'); await ins[1].fill('60');
  await pg.waitForTimeout(400);
  q=await pg.evaluate(()=>{const rf=document.querySelector('#f_kouji .rf');const im=s=>rf.querySelector(s).parentNode.querySelector('img');return {z:im('.rfz').getAttribute('src'),zw:im('.rfz').naturalWidth,e:im('.rfe').getAttribute('src'),ew:im('.rfe').naturalWidth};});
  ok(/kz_rc/.test(q.z)&&q.zw>0&&/kizon_as_roshutsu/.test(q.e)&&q.ew>0,P+'2026-09-25n 構造体・既存防水の欄にも絵',q);
  // ⑩ 立上りだけ別工法
  await pg.evaluate(()=>document.querySelectorAll('#f_kouji .rf:nth-child(1) .kob')[1].click()); await pg.waitForTimeout(150);
  await pg.evaluate(()=>{const o=[...document.querySelectorAll('#nnSelPop .o')].find(x=>/ウレタン塗膜 密着/.test(x.textContent));o.click();}); await pg.waitForTimeout(150);
  await pg.evaluate(()=>document.querySelector('#f_kouji .rfadd').click()); await pg.waitForTimeout(150);
  await pg.evaluate(()=>{const rf=document.querySelector('#f_kouji .rf:nth-child(2)');const e=rf.querySelector('.rfe');e.value='ゴムシート防水';e.dispatchEvent(new Event('change',{bubbles:true}));const z=rf.querySelector('.rfz');z.value='S';z.dispatchEvent(new Event('change',{bubbles:true}));});
  ins=await pg.$$('#f_kouji .rf:nth-child(2) .arr input'); await ins[0].fill('100');
  q=await pg.evaluate(()=>({faces:nnFFCollect().map(f=>f.n+':'+f.ko+':'+f.q),m:f_m.value,alt:document.querySelector('#f_kouji .rf .rfalt').textContent}));
  await pg.waitForTimeout(400);
  const kb=await pg.evaluate(()=>{const b=document.querySelector('#f_kouji .kob.set img');return b&&{src:b.getAttribute('src'),w:b.naturalWidth};});
  ok(kb&&/ure_micchaku|kou_ure/.test(kb.src)&&kb.w>0,P+'2026-09-25n 別工法の部位ボタンに工法の絵',kb);
  ok(q.faces.length===3&&q.faces.some(f=>/立上り:ウレタン塗膜 密着工法\(X-2\):60/.test(f))&&q.m==='460'&&/立上り＝/.test(q.alt),P+'⑩立上りだけ別工法→内訳が屋根×工法に分かれる・合計460㎡',q);
  await pg.evaluate(()=>{[...document.querySelectorAll('#f_kouji .kseg button')].find(b=>b.textContent==='新築').click();});
  q=await pg.evaluate(()=>({ex:!!document.querySelector('#f_kouji .rfe').offsetParent,kind:f_kind.value,kizon:f_kizon.value}));
  ok(!q.ex&&q.kind==='新築'&&q.kizon==='新設（既存なし）',P+'⑨新築：既存防水は出さず「新設（既存なし）」',q);
  await pg.evaluate(()=>{[...document.querySelectorAll('#f_kouji .kseg button')].find(b=>b.textContent==='改修').click();});
  await pg.evaluate(()=>saveProperty()); await pg.waitForTimeout(300);
  q=await pg.evaluate(()=>{const p=props.find(x=>x.name==='テスト区分物件');return p&&{kind:p.kind,kizon:p.kizon,kouzou:p.kouzou,a:p.areas.map(r=>[r.kz,r.ex,r.ko,r.items.map(i=>i.k+(i.ko?'*':'')).join('/')])};});
  ok(q&&q.kind==='改修'&&q.kizon==='露出アスファルト防水'&&q.a[1][0]==='S'&&q.a[1][1]==='ゴムシート防水'&&/立上り\*/.test(q.a[0][3]),P+'⑫⑬屋根ごとの構造体・既存防水・部位の別工法が保存される',q);
  const id=await pg.evaluate(()=>props.find(x=>x.name==='テスト区分物件').id);
  await pg.evaluate(id=>openModal(id),id); await pg.waitForTimeout(300);
  q=await pg.evaluate(()=>({ex:[...document.querySelectorAll('#f_kouji .rfe')].map(e=>e.value),z:[...document.querySelectorAll('#f_kouji .rfz')].map(e=>e.value),set:document.querySelectorAll('#f_kouji .kob.set').length}));
  ok(q.ex.join()==='露出アスファルト防水,ゴムシート防水'&&q.z.join()==='RC,S'&&q.set===1,P+'編集で開くと屋根ごとの仕様・別工法が戻る',q);
  ok(errs.length===0,P+'JSエラーなし',errs);
  await ctx.close();
 }
 await b.close();
})();
