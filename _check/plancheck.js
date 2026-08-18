const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const U='file:///tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/plan/nn_keikaku.html';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(U,{waitUntil:'load'}); await p.waitForTimeout(600);

  const tabs=await p.$$eval('#tabs button',b=>b.map(x=>x.textContent));
  ok('タブが8つ', tabs.length===8, tabs.join('/'));

  for(const t of ['today','week','month','road','calc','kpi','idea','set']){
    await p.evaluate(k=>go(k),t); await p.waitForTimeout(200);
    const h=await p.evaluate(()=>document.getElementById('main').innerHTML.length);
    const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    ok(t+'：中身がある', h>400, h+'文字');
    ok(t+'：横にはみ出さない', ov<=1, 'はみ出し '+ov+'px');
  }

  // 今日：3つを作る → チェック → 保存
  await p.evaluate(()=>go('today')); await p.waitForTimeout(200);
  await p.click('button:has-text("今日の3つを作る")'); await p.waitForTimeout(300);
  let n=await p.$$eval('#tklist .tk',e=>e.length);
  ok('今日：型からタスクが入る', n>=3, n+'件');
  await p.click('#tklist .tk input[type=checkbox]'); await p.waitForTimeout(250);
  const done=await p.$$eval('#tklist .tk.done',e=>e.length);
  ok('今日：チェックできる', done===1, done+'件');
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(500);
  const n2=await p.$$eval('#tklist .tk',e=>e.length);
  ok('今日：再読み込みしても残る', n2===n, n2+'件');

  // 逆算
  await p.evaluate(()=>go('calc')); await p.waitForTimeout(250);
  const c=await p.evaluate(()=>{const m=D.model,x=calc(m);return {arr:x.arr,inc:x.income,need:needArr(D.goal.income,m)};});
  console.log('逆算:',JSON.stringify(c));
  ok('逆算：ARRが3億前後', c.arr>2.8e8 && c.arr<3.4e8, (c.arr/1e8).toFixed(2)+'億');
  ok('逆算：年収がほぼ1億', Math.abs(c.inc-1e8)/1e8<0.05, (c.inc/1e8).toFixed(3)+'億');
  ok('逆算：必要ARRが表示される', c.need>3e8 && c.need<3.2e8, (c.need/1e8).toFixed(2)+'億');

  // 数字を入れる
  await p.evaluate(()=>go('kpi')); await p.waitForTimeout(250);
  await p.fill('#kCo','7'); await p.fill('#kMrr','140000'); await p.fill('#kDemo','12'); await p.fill('#kDocs','9');
  await p.click('button:has-text("この月を記録する")'); await p.waitForTimeout(350);
  const k=await p.evaluate(()=>D.kpi.length? D.kpi[D.kpi.length-1]:null);
  ok('数字：記録できる', k && k.co===7 && k.mrr===140000, JSON.stringify(k));

  // 週次レビュー
  await p.evaluate(()=>go('week')); await p.waitForTimeout(250);
  await p.fill('#rvK','元請に工程表PDFを出したら好評');
  await p.evaluate(()=>document.getElementById('rvK').dispatchEvent(new Event('change')));
  await p.waitForTimeout(250);
  const rv=await p.evaluate(()=>D.reviews.length);
  ok('週：レビューが保存される', rv===1, rv+'件');
  await p.click('#tklist, .tk input[type=checkbox]').catch(()=>{});

  // 月：下書き
  await p.evaluate(()=>go('month')); await p.waitForTimeout(300);
  await p.click('button:has-text("フェーズから月テーマ")'); await p.waitForTimeout(400);
  const mo=await p.evaluate(()=>Object.keys(D.months).length);
  ok('月：下書きが入る', mo>50, mo+'ヶ月');

  // 書き出し
  await p.evaluate(()=>go('set')); await p.waitForTimeout(250);
  const dl=p.waitForEvent('download',{timeout:8000});
  await p.click('button:has-text("書き出す")');
  const f=await dl; const path=await f.path();
  const j=JSON.parse(require('fs').readFileSync(path,'utf8'));
  ok('設定：JSONが書き出せる', j.kind==='nn_keikaku' && j.data && j.data.kpi.length===1, f.suggestedFilename());

  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
