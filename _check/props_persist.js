/* 現場記録帳：新規登録・編集・削除した物件が、開き直しても残るか（試験導入の前提） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL=process.argv[2]?'http://localhost:8899/'+process.argv[2]:'http://localhost:8899/kirokucho_demo.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  const ready=()=>p.waitForFunction(()=>typeof openModal==='function'&&typeof props!=='undefined');
  await p.goto(URL);await ready();
  const n0=await p.evaluate(()=>props.length);
  // 画面の入力欄に打ち込んで保存ボタンを押す（関数を直接呼ばない）
  await p.evaluate(()=>openModal());
  await p.fill('#f_name','試験導入テスト現場');
  await p.fill('#f_cb','2026-10-01');
  await p.fill('#f_m','120');
  await p.click('#modalbg .btns .ok');
  await p.reload();await ready();
  const r1=await p.evaluate(()=>{const q=props.find(x=>x.name==='試験導入テスト現場');return q&&{n:props.length,m:q.m,d:q.cbD instanceof Date?q.cbD.getDate():null,id:q.id,code:q.code};});
  ok(!!r1,'新規登録した物件が開き直しても残る');
  ok(r1&&r1.n===n0+1,'件数が1件増えたまま（'+n0+'→'+(r1&&r1.n)+'）');
  ok(r1&&r1.m===120,'数量が残る（'+(r1&&r1.m)+'）');
  ok(r1&&r1.d===1,'着工日が日付のまま戻る');
  // もう1件登録しても番号が重ならない
  await p.evaluate(()=>openModal());await p.fill('#f_name','試験導入テスト2');await p.click('#modalbg .btns .ok');
  const ids=await p.evaluate(()=>props.map(x=>x.id));
  ok(new Set(ids).size===ids.length,'物件番号が重ならない');
  // サンプル物件の編集が残る
  const sid=await p.evaluate(()=>props.find(x=>x.id<=100).id);
  await p.evaluate(id=>openModal(id),sid);await p.fill('#f_name','編集後の名前');await p.click('#modalbg .btns .ok');
  await p.reload();await ready();
  ok(await p.evaluate(id=>props.find(x=>x.id===id)?.name,sid)==='編集後の名前','サンプル物件の編集が開き直しても残る');
  // 削除
  p.on('dialog',d=>d.accept());
  const tid=await p.evaluate(()=>props.find(x=>x.name==='試験導入テスト現場').id);
  await p.evaluate(id=>openModal(id),tid);
  ok(await p.isVisible('#f_delBtn'),'編集画面に削除ボタンが出る');
  await p.click('#f_delBtn');
  await p.evaluate(id=>openModal(id),sid);await p.click('#f_delBtn');
  await p.reload();await ready();
  const r2=await p.evaluate(([t,s])=>[props.some(x=>x.id===t),props.some(x=>x.id===s),props.length],[tid,sid]);
  ok(!r2[0]&&!r2[1],'削除した物件（新規・サンプル）は開き直しても出ない');
  ok(r2[2]===n0,'件数が合う（'+r2[2]+'）');
  await p.evaluate(()=>openModal());
  ok(!(await p.isVisible('#f_delBtn')),'新規登録の画面には削除ボタンを出さない');
  // 壊れた保存でも画面が止まらない
  await p.evaluate(()=>localStorage.setItem('nn_kirokucho_props_v1','{"add":"x","edit":[1],"del":5}'));
  await p.reload();await ready();
  ok(await p.evaluate(()=>props.length)===100,'壊れた保存でもサンプル100件で開ける');
  ok(!errs.length,'実行エラーなし '+errs.join(' | '));
  await b.close();console.log(ng?'★NG '+ng+'件':'全項目○');
})();
