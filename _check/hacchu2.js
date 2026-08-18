/* ②発注の大改修チェック */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
let h=fs.readFileSync('/home/user/osamarinavi_bousui/hacchu.html','utf8')
  .replace(/env\(safe-area-inset-(left|right)\)/g,'59px').replace(/env\(safe-area-inset-(top|bottom)\)/g,'0px');
fs.writeFileSync('/home/user/osamarinavi_bousui/__L_hacchu.html',h);
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  await p.goto('http://localhost:8899/__L_hacchu.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
  const r=await p.evaluate(()=>{
    const rows=[...document.querySelectorAll('.grow')];
    const cnt=s=>rows.filter(e=>e.querySelector('.gst').textContent===s).length;
    return {rows:rows.length, kou:cnt('施工中'), kei:cnt('契約済'), mit:cnt('見積済'),
      chips:[...document.querySelectorAll('.gchip')].map(e=>e.textContent.trim()),
      ov:document.documentElement.scrollWidth-innerWidth};
  });
  ok('現場42件（施工中14・契約済7・見積済21）', r.rows===42&&r.kou===14&&r.kei===7&&r.mit===21, r);
  ok('ステータスチップ3つ', r.chips.length===3, r.chips);
  ok('横はみ出し0', r.ov<=0, r.ov);
  await p.screenshot({path:'/tmp/claude-0/-home-user-osamarinavi-bousui/b1be0cae-0477-5376-b744-be793bfc684f/scratchpad/out/chk_hacchu_sel.png'});
  /* 検索で絞る */
  await p.fill('.gq','苫小牧'); await p.waitForTimeout(400);
  const r2=await p.evaluate(()=>document.querySelectorAll('.grow').length);
  ok('検索「苫小牧」で絞れる', r2>0&&r2<10, r2);
  await p.fill('.gq',''); await p.waitForTimeout(400);
  /* チップで見積済を外す */
  await p.evaluate(()=>gFilTgl('見積済')); await p.waitForTimeout(300);
  ok('見積済チップOFFで21件', await p.evaluate(()=>document.querySelectorAll('.grow').length)===21);
  await p.evaluate(()=>gFilTgl('見積済')); await p.waitForTimeout(200);
  /* 施工中の現場（テンプレ明細）を開く：J051以外のX-1現場を選ぶ */
  const gid=await p.evaluate(()=>{const g=GENBA.find(g=>g.st==='施工中'&&g.id!=='J051'); startDraft(g.id); return g.id;});
  await p.waitForTimeout(400);
  const ed=await p.evaluate(()=>({lines:draft.lines.length, lock:draft.lines.every(l=>l.lock), step:draft.step,
    tbl:!!document.querySelector('.item-tbl')}));
  ok('テンプレ明細が入る（全行🔒）', ed.lines>=3&&ed.lock&&ed.tbl, ed);
  /* 数量を入れて確認画面へ */
  await p.evaluate(()=>{ draft.lines[0].q=5; draft.lines[1].q=2; draft.step=3; render(); });
  await p.waitForTimeout(400);
  const pv=await p.evaluate(()=>({sheet:!!document.querySelector('.sheet'), pdfBtn:[...document.querySelectorAll('button')].some(b=>/発注書PDF/.test(b.textContent))}));
  ok('確認画面に発注書PDFボタン', pv.sheet&&pv.pdfBtn, pv);
  await p.screenshot({path:'/tmp/claude-0/-home-user-osamarinavi-bousui/b1be0cae-0477-5376-b744-be793bfc684f/scratchpad/out/chk_hacchu_pv.png'});
  /* PDFを開く（新しいタブの中身を確かめる） */
  const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>nnHacchuPDF(draft,draft._no))]);
  await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(600);
  const doc=await pop.evaluate(()=>({title:document.title,
    h1:document.querySelector('h1')&&document.querySelector('h1').textContent,
    rows:document.querySelectorAll('table tr').length,
    total:/合計（税込）/.test(document.body.textContent),
    back:[...document.querySelectorAll('button')].some(b=>/発注に戻る/.test(b.textContent)),
    page:/210mm 297mm/.test([...document.querySelectorAll('style')].map(s=>s.textContent).join(''))}));
  ok('発注書PDF：表題・明細・税込合計・戻る・A4実寸', doc.h1==='発注書'&&doc.rows>10&&doc.total&&doc.back&&doc.page, doc);
  await pop.screenshot({path:'/tmp/claude-0/-home-user-osamarinavi-bousui/b1be0cae-0477-5376-b744-be793bfc684f/scratchpad/out/chk_hacchu_pdf.png', fullPage:false});
  await pop.close();
  /* 履歴（旧g1参照の互換）＝初回デモ履歴が正しく出るか */
  await p.evaluate(()=>showView('hist')); await p.waitForTimeout(400);
  const hist=await p.evaluate(()=>({groups:document.querySelectorAll('.hgroup').length,
    name:(document.querySelector('.hgroup .gh')||{}).textContent||''}));
  ok('履歴が出る（サン太平＝J051へ読み替え）', hist.groups>=1&&/サン太平/.test(hist.name), hist);
  /* 再発注も動くか */
  await p.evaluate(()=>reorder(history[0].id)); await p.waitForTimeout(400);
  ok('再発注で明細が読み込まれる', await p.evaluate(()=>draft&&draft.lines.length>0));
  ok('JSエラーなし', errs.length===0, errs);
  console.log(R.join('\n'));
  await b.close();
})();
