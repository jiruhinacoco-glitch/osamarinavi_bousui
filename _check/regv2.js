/* 2026-09-25i 新規物件登録のやり直し（本人の画像2枚）
   ①選択一覧：長い名前（道北防水工業（株））が1行に収まる
   ②項目名の頭に「・」
   ③ステータスはタグの色（欄の枠・一覧の選択肢とも）
   ④面積は屋根ごと：屋根1つ＝平場・立上り・屋根内周／＋屋根を追加で屋根ごとに同じ3つ＋部位。単位に「n」が出ない。合計・保存・編集で戻る
   ⑤元請を選ぶと支払条件・締め処理日・入金予定日が自動で入り、手で直せる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ok=(c,m,x)=>console.log((c?'○ ':'★NG ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,240):''));
 for(const mode of ['pc','mobile']){
  const ctx=await b.newContext(mode==='pc'?{viewport:{width:1900,height:930},serviceWorkers:'block'}:{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  if(mode==='mobile') await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
  const P=mode+' ';
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo')+'.html',{waitUntil:'load'}); await pg.waitForTimeout(1300);
  await pg.evaluate(()=>{openModal();document.getElementById('modalbg').querySelector('.modal').classList.add('nn-advopen');}); await pg.waitForTimeout(300);
  // ①
  await pg.evaluate(()=>document.querySelector('#modalbg .mp-list').click()); await pg.waitForTimeout(200);
  let q=await pg.evaluate(()=>[...document.querySelectorAll('#nnSelPop .o')].filter(o=>o.offsetHeight>0).map(o=>[o.textContent,o.getBoundingClientRect().height]).filter(x=>/（株）/.test(x[0])));
  const hs=await pg.evaluate(()=>Math.min(...[...document.querySelectorAll('#nnSelPop .o')].map(o=>o.getBoundingClientRect().height)));
  ok(q.length>0&&q.every(x=>x[1]<hs*1.4),P+'①（株）付きの名前も1行',q.slice(0,3));
  await pg.evaluate(()=>nnSelClose());
  // ②
  q=await pg.evaluate(()=>[...document.querySelectorAll('#modalbg .mgrid label')].filter(l=>l.offsetHeight).map(l=>getComputedStyle(l,'::before').content).filter(c=>c!=='"・"').length);
  ok(q===0,P+'②項目名の頭に「・」',q);
  // ③
  await pg.evaluate(()=>{const s=document.getElementById('f_st');s.value='見積済';s.dispatchEvent(new Event('change',{bubbles:true}));});
  q=await pg.evaluate(()=>{const s=document.getElementById('f_st');return {b:getComputedStyle(s).borderTopColor,tag:[...s.options].every(o=>o.getAttribute('data-tag'))};});
  ok(q.tag&&q.b!=='rgb(185, 196, 180)',P+'③ステータスは色の枠（選択肢にもタグの色）',q);
  await pg.evaluate(()=>{const s=document.getElementById('f_st');s.value='引合いあり';s.dispatchEvent(new Event('change',{bubbles:true}));});
  // ④
  q=await pg.evaluate(()=>({k:[...document.querySelectorAll('#f_kouji .rf .arr')].map(r=>r.dataset.k),single:document.getElementById('f_kouji').classList.contains('single'),old:!!document.getElementById('f_faces').offsetParent}));
  ok(q.k.join()==='平場,立上り,屋根内周'&&q.single&&!q.old,P+'④屋根1つ：平場・立上り・屋根内周／旧「内訳」は出ない',q);
  await pg.fill('#f_name','テスト2屋根物件');
  let ins=await pg.$$('#f_kouji .rf:nth-child(1) .arr input'); await ins[0].fill('200'); await ins[1].fill('40'); await ins[2].fill('60');
  await pg.evaluate(()=>document.querySelector('#f_kouji .rfadd').click()); await pg.waitForTimeout(200);
  await pg.fill('#f_kouji .rf:nth-child(1) .rfn','B棟屋上'); await pg.fill('#f_kouji .rf:nth-child(2) .rfn','C棟屋上');
  ins=await pg.$$('#f_kouji .rf:nth-child(2) .arr input'); await ins[0].fill('300'); await ins[1].fill('50'); await ins[2].fill('70');
  await pg.evaluate(()=>{const s=document.querySelector('#f_kouji .rf:nth-child(2) .rfk');s.value=s.options[3].value;s.dispatchEvent(new Event('change',{bubbles:true}));});
  q=await pg.evaluate(()=>({k2:[...document.querySelectorAll('#f_kouji .rf:nth-child(2) .arr')].map(r=>r.dataset.k),m:document.getElementById('f_m').value,ro:document.getElementById('f_m').readOnly,
    units:[...document.querySelectorAll('#f_kouji .u')].map(u=>u.textContent),face:nnFFCollect().map(f=>f.n+':'+f.q+f.un),sum:document.querySelector('#f_kouji .arsum').textContent}));
  ok(q.k2.join()==='平場,立上り,屋根内周'&&q.m==='590'&&q.ro&&q.units.every(u=>/^(㎡|m|か所)$/.test(u))&&q.face.join()==='B棟屋上:240㎡,C棟屋上:350㎡',P+'④2屋根目にも平場・立上り・屋根内周・合計590㎡・単位に「n」なし',q);
  // ⑤
  await pg.fill('#f_fb','2026-09-10');
  await pg.fill('#f_moto','丸彦渡辺建設'); await pg.waitForTimeout(100);
  q=await pg.evaluate(()=>({sh:f_sh.value,sb:f_sb.value,nb:f_nb.value,auto:f_sb.classList.contains('nn-auto')}));
  ok(q.sh==='翌々月10日振込'&&q.sb==='2026-09-30'&&q.nb==='2026-11-10'&&q.auto,P+'⑤元請（末締・翌々月10日払）と完成日9/10→締め9/30・入金11/10',q);
  await pg.fill('#f_nb','2026-11-20'); await pg.fill('#f_moto','大和ライフネクスト'); await pg.waitForTimeout(100);
  q=await pg.evaluate(()=>({sh:f_sh.value,sb:f_sb.value,nb:f_nb.value}));
  ok(q.sb==='2026-09-20'&&q.nb==='2026-11-20'&&q.sh==='翌月末振込',P+'⑤手で直した入金日は元請を変えても残る・ほかは20日締で計算し直し',q);
  await pg.evaluate(()=>saveProperty()); await pg.waitForTimeout(300);
  const id=await pg.evaluate(()=>(props.find(x=>x.name==='テスト2屋根物件')||{}).id);
  await pg.evaluate(id=>openModal(id),id); await pg.waitForTimeout(300);
  q=await pg.evaluate(()=>({n:[...document.querySelectorAll('#f_kouji .rfn')].map(i=>i.value),v:[...document.querySelectorAll('#f_kouji .arr input')].map(i=>i.value).join(','),m:f_m.value}));
  ok(q.n.join()==='B棟屋上,C棟屋上'&&q.v==='200,40,60,300,50,70'&&q.m==='590',P+'④保存して編集で開くと2屋根が戻る',q);
  q=await pg.evaluate(()=>({nb:f_nb.value,sb:f_sb.value})); ok(q.nb==='2026-11-20',P+'⑤手で直した入金日が保存・編集後も残る',q);
  if(process.env.SHOT) await pg.screenshot({path:process.env.SHOT+'_'+mode+'.png'});
  ok(errs.length===0,P+'JSエラーなし',errs);
  await ctx.close();
 }
 await b.close();
})();
