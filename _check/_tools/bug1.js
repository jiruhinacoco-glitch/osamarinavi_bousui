const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);
  const st=async l=>console.log(l, JSON.stringify(await p.evaluate(()=>({
    tb:getComputedStyle(document.getElementById('toolbar')).display,
    body:document.body.className, mv:document.getElementById('mainview').className}))));
  await st('一覧    ');
  await p.evaluate(()=>{ selectedId=props[1].id; openDetailFull(); }); await p.waitForTimeout(600);
  await st('詳細を開く');
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(600);
  await st('タブで一覧へ');
  /* 進捗の実データ */
  console.log('完成済のprog', JSON.stringify(await p.evaluate(()=>{
    const kan=props.filter(x=>x.stRaw==='kan').map(x=>x.prog);
    const kou=props.filter(x=>x.stRaw==='kou').map(x=>x.prog);
    return {kanMin:Math.min(...kan), kanMax:Math.max(...kan), kan5:kan.slice(0,5),
            kouMin:Math.min(...kou), kouMax:Math.max(...kou),
            other:[...new Set(props.filter(x=>x.stRaw!=='kan'&&x.stRaw!=='kou').map(x=>x.prog))]};
  })));
  await b.close();
})();
