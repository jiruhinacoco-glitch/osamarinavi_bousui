const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1600); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(600);

  ok('役物のパネルが出る', await p.evaluate(()=>!!document.getElementById('nnPartsBox')));
  ok('見本が3件入っている', await p.evaluate(()=>window.nnPartsLib().length)===3, String(await p.evaluate(()=>window.nnPartsLib().length)));

  /* ① 置く */
  /* ★高さのある「架台」で試す（ドレンは高さ0なので3Dでは箱を出さないのが正しい） */
  await p.evaluate(()=>{ document.querySelector('#nnPartsBox button[data-a="place"][data-id="p2"]').click(); });
  await p.waitForTimeout(200);
  const cvb=await (await p.$('#cv')).boundingBox();
  await p.mouse.click(cvb.x+cvb.width*0.42, cvb.y+cvb.height*0.45);
  await p.waitForTimeout(400);
  const n1=await p.evaluate(()=>(state.parts||[]).length);
  ok('図面に置ける', n1===1, n1+'個');
  ok('操作バーが出る', await p.evaluate(()=>document.getElementById('nnPartBar').classList.contains('on')));

  /* ② 回す・複製 */
  await p.evaluate(()=>document.querySelector('#nnPartBar button[data-b="rot"]').click());
  await p.waitForTimeout(150);
  ok('90°回る', await p.evaluate(()=>state.parts[0].r)===90);
  await p.evaluate(()=>document.querySelector('#nnPartBar button[data-b="dup"]').click());
  await p.waitForTimeout(200);
  ok('複製できる', await p.evaluate(()=>state.parts.length)===2);

  /* ③ 積算に乗る */
  const qt=await p.evaluate(()=>{ const e=document.getElementById('nnPartsQt'); return e?e.innerText:''; });
  ok('積算に役物の表が出る', /役物|架台/.test(qt) && /個/.test(qt), qt.replace(/\n/g,' / ').slice(0,80));
  ok('増し貼り・シールの合計が出る', /増し貼り/.test(qt) && /シール/.test(qt));

  /* ④ 3Dに出る */
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1500);
  const n3=await p.evaluate(()=>T.group.children.filter(c=>c.name==='nnPart').length);
  ok('3Dに役物が出る', n3===2, n3+'個');

  /* ⑤ 登録の追加と保存 */
  await p.evaluate(()=>setTab('draw')); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('nnPartAdd').click(); });
  await p.waitForTimeout(200);
  await p.evaluate(()=>{
    const set=(f,v)=>{ const el=document.querySelector('#nnPartsBox [data-f="'+f+'"]');
      el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
    set('name','テスト架台'); set('w','800'); set('d','400'); set('h','250'); set('price','15000');
    document.getElementById('nnPartSave').click();
  });
  await p.waitForTimeout(300);
  ok('新しく登録できる', await p.evaluate(()=>window.nnPartsLib().length)===4);
  ok('端末に保存される', await p.evaluate(()=>{
    const o=JSON.parse(localStorage.getItem('nn_zumen_parts_v1')||'{}');
    return (o.items||[]).some(x=>x.name==='テスト架台'); }));

  /* ⑥ 再読み込みしても残る */
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1800); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  ok('再読み込み後も登録が残る', await p.evaluate(()=>window.nnPartsLib().some(x=>x.name==='テスト架台')));
  ok('再読み込み後も置いた役物が残る', await p.evaluate(()=>(state.parts||[]).length)===2,
     String(await p.evaluate(()=>(state.parts||[]).length)));

  /* ⑦ 削除 */
  await p.evaluate(()=>{ window.confirm=()=>true;
    document.querySelector('#nnPartsBox button[data-a="rm"]').click(); });
  await p.waitForTimeout(300);
  ok('登録を消すと置いた分も消える', await p.evaluate(()=>window.nnPartsLib().length)===3);

  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
