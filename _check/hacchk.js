/* ★2026-08-14k 発注ページの現場が現場記録帳と一致しているか＋発注フローが壊れていないか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  /* 記録帳の実データと同じか */
  const g=await p.evaluate(()=>GENBA.map(x=>({id:x.id,n:x.name,st:x.st,addr:x.addr,moto:x.moto})));
  console.log(JSON.stringify(g,null,1));
  ok('g1=サン太平レジデンス（施工中）', g[0].n.includes('サン太平レジデンス')&&g[0].st==='施工中');
  ok('g2=発寒南倉庫（契約済）', g[1].n.includes('発寒南倉庫')&&g[1].st==='契約済');
  ok('g3=篠路工場（見積済）', g[2].n.includes('篠路工場')&&g[2].st==='見積済');
  ok('旧ダミーが残っていない', !JSON.stringify(g).includes('第2ビル')&&!JSON.stringify(g).includes('工務店'));
  /* 画面の見た目：契約済は緑の受注済スタイル・見積済は薄く（単価未確定） */
  const ui=await p.evaluate(()=>{
    const cards=[...document.querySelectorAll('.gcard')];
    return cards.map(c=>({dim:c.classList.contains('dim'),
      badge:c.querySelector('.badge').textContent, cls:c.querySelector('.badge').className}));
  });
  console.log(JSON.stringify(ui));
  ok('契約済カードは受注済と同じ緑スタイル', ui[1].cls.includes('st-jucyu'), ui[1].cls);
  ok('見積済カードは薄い表示（単価未確定）', ui[2].dim===true);
  /* 発注フロー：g1を選び数量入れて確認まで */
  const flow=await p.evaluate(async()=>{
    startDraft('g1'); await new Promise(z=>setTimeout(z,400));
    const q=document.querySelector('input.qty,input[type=number]');
    if(q){ q.value=3; q.dispatchEvent(new Event('input',{bubbles:true})); }
    return {step:draft?draft.step:null, gid:draft?draft.gid:null, lines:draft?draft.lines.length:0};
  });
  console.log('flow', JSON.stringify(flow));
  ok('現場を選ぶと明細が始まる', flow.gid==='g1' && flow.lines>=4, JSON.stringify(flow));
  /* 自社情報の既定が三浦工業 */
  const co=await p.evaluate(()=>myCo.co);
  ok('自社情報の既定は株式会社三浦工業', co==='株式会社三浦工業', co);
  /* 再発注（履歴）も生きている */
  const hist=await p.evaluate(()=>history.length>0 && history[0].gid==='g1');
  ok('過去発注の見本が現場g1に紐づく', hist===true);
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+R.join('\n'));
  await b.close();
})();
