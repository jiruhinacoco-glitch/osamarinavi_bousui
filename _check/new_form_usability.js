/* 現場記録帳：新規作成画面のスマホ入力枠と操作部品を実操作で検査 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let ng=0;
const ok=(c,m)=>{ console.log((c?'○ ':'★NG ')+m); if(!c)ng++; };
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForFunction(()=>typeof openModal==='function');
  await p.evaluate(()=>openModal());
  const first=await p.evaluate(()=>{
    const modal=document.querySelector('#modalbg .modal');
    const fields=[...modal.querySelectorAll('.mgrid input,.mgrid select')];
    const outside=fields.filter(el=>{
      const r=el.getBoundingClientRect(), c=el.parentElement.getBoundingClientRect();
      return r.left<c.left-1 || r.right>c.right+1;
    }).map(el=>el.id);
    const overlap=[];
    for(let i=0;i<fields.length;i++) for(let j=i+1;j<fields.length;j++){
      const a=fields[i].getBoundingClientRect(),z=fields[j].getBoundingClientRect();
      if(Math.min(a.right,z.right)-Math.max(a.left,z.left)>2 &&
         Math.min(a.bottom,z.bottom)-Math.max(a.top,z.top)>2) overlap.push(fields[i].id+'×'+fields[j].id);
    }
    const labels=[...modal.querySelectorAll('.mgrid label')];
    return {outside,overlap,
      labelsLinked:labels.every(l=>l.htmlFor && document.getElementById(l.htmlFor)),
      closePos:getComputedStyle(modal.querySelector('.mclose')).position,
      btnPos:getComputedStyle(modal.querySelector('.btns')).position,
      buttonHeights:[...modal.querySelectorAll('.btns button')].map(x=>x.getBoundingClientRect().height)};
  });
  ok(first.outside.length===0,'全入力枠が自分の列内に収まる（'+first.outside.join(', ')+'）');
  ok(first.overlap.length===0,'入力枠どうしが重ならない（'+first.overlap.join(', ')+'）');
  ok(first.labelsLinked,'項目名を押しても対応する入力欄を選べる');
  ok(first.closePos==='sticky','閉じるボタンがスクロール中も画面上部に残る（'+first.closePos+'）');
  ok(first.btnPos==='sticky','保存ボタンがスクロール中も画面下部に残る（'+first.btnPos+'）');
  ok(first.buttonHeights.every(h=>h>=44),'下部ボタンの押せる高さが44px以上（'+first.buttonHeights.map(Math.round).join(', ')+'）');
  await p.locator('#modalbg .modal').evaluate(el=>el.scrollTop=el.scrollHeight);
  await p.locator('#f_name').click();
  ok(await p.locator('#f_name').isFocused(),'項目名から離れた後も入力欄へ戻って操作できる');
  ok(errs.length===0,'JSエラーなし（'+errs.join(' / ')+'）');
  await b.close();
  console.log(ng?'★NG 合計 '+ng:'○ 全項目OK');
  process.exitCode=ng?1:0;
})();
