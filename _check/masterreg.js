/* 2026-09-25d 新規顧客登録・新規材料登録（nn_master.js）を端から端まで通す。
   ・現場記録帳：新規物件登録の「元請事業者 ＋新規」→ 新規顧客登録 → 保存で元請欄に入る・客先登録（nn_tokui_v1）に見本5社と一緒に残る
     同じ名前はすぐ登録せず知らせる（標準の確認窓は出さない）・「一覧」に出る
   ・仕様・材料：「＋ 新規材料登録」→ 保存で nn_materials_v1 に入り「登録済み材料」に出る
   ・ホーム：客先登録の「＋元請を追加」→ 同じ登録画面 → 一覧に出る
   ・見た目：現場記録帳の窓と同じ（緑の見出し帯・クリーム地）／最初は詳細入力が畳まれている／窓の外へはみ出さない／スマホの文字16px以上 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,220):''));
 const IPH={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'};
 const look=()=>{const m=document.getElementById('nnReg'),h=m.querySelector('h3'),r=m.getBoundingClientRect();
   const out=[...m.querySelectorAll('*')].filter(e=>{const q=e.getBoundingClientRect();return q.width&&q.right>r.right+1&&getComputedStyle(e).display!=='none';}).map(e=>e.tagName+'.'+e.className);
   const z=r.width/m.offsetWidth; const inp=m.querySelector('input:not([type=hidden])');
   return {bg:getComputedStyle(m).backgroundColor,hd:/linear-gradient/.test(getComputedStyle(h).backgroundImage),title:h.textContent,
     advHidden:!m.querySelector('.advbox').offsetParent,out,font:Math.round(parseFloat(getComputedStyle(inp).fontSize)*z),inView:r.left>=-1&&r.right<=document.documentElement.getBoundingClientRect().right+1};};
 for(const mode of ['mobile','ichiran','pc']){
  const ctx=await b.newContext(mode==='pc'?{viewport:{width:1600,height:900},serviceWorkers:'block'}:IPH);
  if(mode!=='pc') await ctx.addInitScript(m=>{try{localStorage.setItem('nn_view_mode',m)}catch(e){}},mode);
  const P=mode+' ';
  let dialogs=0; ctx.on('page',p=>p.on('dialog',d=>{dialogs++;d.dismiss();}));
  // ---- 現場記録帳
  let pg=await ctx.newPage(); let errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>{dialogs++;d.dismiss();});
  await pg.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>openModal()); await pg.waitForTimeout(300);
  await pg.evaluate(()=>document.querySelector('#modalbg .mp-new').click()); await pg.waitForTimeout(300);
  let q=await pg.evaluate(look);
  ok(q.bg==='rgb(255, 253, 244)'&&q.hd&&q.title==='新規顧客登録',P+'記録帳：＋新規で新規顧客登録（記録帳の窓と同じ見た目）',q);
  ok(q.advHidden&&q.out.length===0&&q.inView,P+'最初は詳細入力が畳まれ、窓の外へはみ出さない',q);
  if(mode==='mobile') ok(q.font>=16,P+'入力欄の文字は16px以上（iPhoneの自動拡大を防ぐ）',q.font);
  await pg.fill('#rg_name','テスト防水建設（株）'); await pg.fill('#rg_tel','011-111-2222');
  await pg.evaluate(()=>document.querySelector('#nnReg .adv').click());
  q=await pg.evaluate(()=>!!document.querySelector('#nnReg .advbox').offsetParent&&/詳細入力を閉じる/.test(document.querySelector('#nnReg .adv').textContent));
  ok(q,P+'「▼ 詳細入力」で開く',q);
  await pg.fill('#rg_nyukin','毎月末締・翌月末払');
  await pg.evaluate(()=>document.querySelector('#nnReg .ok').click()); await pg.waitForTimeout(300);
  q=await pg.evaluate(()=>{const d=JSON.parse(localStorage.getItem('nn_tokui_v1'));return {moto:document.getElementById('f_moto').value,open:document.getElementById('nnRegBg').classList.contains('open'),n:d.moto.length,has:d.moto.some(x=>x.name==='テスト防水建設（株）'&&x.nyukin==='毎月末締・翌月末払'),seed:d.moto.some(x=>x.name==='北王リビングサービス')};});
  ok(q.moto==='テスト防水建設（株）'&&!q.open&&q.has&&q.seed&&q.n===6,P+'保存で元請欄に入り、客先登録に見本5社と一緒に残る',q);
  await pg.evaluate(()=>document.querySelector('#modalbg .mp-new').click()); await pg.waitForTimeout(200);
  await pg.fill('#rg_name','テスト防水建設 株式会社');
  await pg.evaluate(()=>document.querySelector('#nnReg .ok').click()); await pg.waitForTimeout(200);
  q=await pg.evaluate(()=>({warn:document.querySelector('#nnReg .warn').textContent,open:document.getElementById('nnRegBg').classList.contains('open'),n:JSON.parse(localStorage.getItem('nn_tokui_v1')).moto.length}));
  ok(q.open&&/もう登録されています/.test(q.warn)&&q.n===6,P+'同じ会社はすぐ登録せず欄の下で知らせる',q);
  await pg.evaluate(()=>document.querySelector('#nnReg .cancel').click()); await pg.waitForTimeout(200);
  await pg.evaluate(()=>document.querySelector('#modalbg .mp-list').click()); await pg.waitForTimeout(200);
  q=await pg.evaluate(()=>[...document.querySelectorAll('#nnSelPop .o')].map(o=>o.textContent));
  ok(q.includes('テスト防水建設（株）')&&q.includes('北王リビングサービス'),P+'「一覧」に登録した元請が出る（自前の一覧）',q.slice(0,4));
  ok(errs.length===0,P+'記録帳 JSエラーなし',errs);
  await pg.close();
  // ---- 仕様・材料
  pg=await ctx.newPage(); errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>{dialogs++;d.dismiss();});
  await pg.goto('http://localhost:8899/zairyo_toroku.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
  const bt=await pg.evaluate(()=>{const b=[...document.querySelectorAll('header button')].find(x=>/新規材料登録/.test(x.textContent));if(!b)return null;const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width}});
  ok(bt&&bt.w>0,P+'仕様・材料の上帯に「＋ 新規材料登録」',bt);
  if(bt){ if(mode==='pc') await pg.mouse.click(bt.x,bt.y); else await pg.touchscreen.tap(bt.x,bt.y); }
  await pg.waitForTimeout(300);
  q=await pg.evaluate(look);
  ok(q.bg==='rgb(255, 253, 244)'&&q.hd&&q.title==='新規材料登録'&&q.advHidden&&q.out.length===0&&q.inView,P+'新規材料登録（同じ見た目・畳み・はみ出しなし）',q);
  await pg.fill('#rg_mname','テスト改修用プライマー'); await pg.fill('#rg_maker','テスト化学'); await pg.fill('#rg_price','8000');
  await pg.evaluate(()=>document.querySelector('#nnReg .adv').click()); await pg.fill('#rg_cv','16');
  q=await pg.evaluate(()=>document.getElementById('rg_per').textContent); ok(/500円\/kg/.test(q),P+'内容量あたりの単価をその場で表示',q);
  await pg.evaluate(()=>document.querySelector('#nnReg .ok').click()); await pg.waitForTimeout(500);
  q=await pg.evaluate(()=>{const d=JSON.parse(localStorage.getItem('nn_materials_v1'));const it=(d.items||[]).find(x=>x.n==='テスト改修用プライマー');return {it:it&&[it.maker,it.price,it.cv,it.cu,it.ou],shown:document.body.innerText.includes('テスト改修用プライマー'),open:document.getElementById('nnRegBg').classList.contains('open')};});
  ok(q.it&&q.it[0]==='テスト化学'&&q.it[1]===8000&&q.it[2]===16&&!q.open&&q.shown,P+'保存で材料登録に入り、登録済み材料に出る',q);
  ok(errs.length===0,P+'仕様・材料 JSエラーなし',errs);
  await pg.close();
  // ---- ホーム（客先登録）
  pg=await ctx.newPage(); errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>{dialogs++;d.dismiss();});
  await pg.goto('http://localhost:8899/index.html',{waitUntil:'load'}); await pg.waitForTimeout(1000);
  await pg.evaluate(()=>{nnTokuiOpen();nnTokuiTab('shiire');nnTokuiAdd();}); await pg.waitForTimeout(300);
  q=await pg.evaluate(()=>({t:document.querySelector('#nnReg h3').textContent,shi:document.querySelector('#rg_seg button.on').dataset.t,fax:!!document.getElementById('rg_fax')}));
  ok(q.t==='新規顧客登録'&&q.shi==='shiire',P+'ホームの客先登録「＋仕入業者を追加」も同じ登録画面（区分は仕入業者）',q);
  await pg.fill('#rg_name','テスト資材（株）');
  await pg.evaluate(()=>document.querySelector('#nnReg .ok').click()); await pg.waitForTimeout(300);
  q=await pg.evaluate(()=>document.getElementById('nnTokuiBody').innerText.includes('テスト資材（株）')&&document.getElementById('nnTokuiBody').innerText.includes('テスト防水建設')===false);
  ok(q,P+'保存すると客先登録の一覧（仕入業者）にすぐ出る',q);
  ok(errs.length===0,P+'ホーム JSエラーなし',errs);
  ok(dialogs===0,P+'標準の確認窓・警告窓は1回も出ない',dialogs);
  await ctx.close();
 }
 await b.close();
})();
