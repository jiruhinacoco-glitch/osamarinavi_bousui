/* メモ欄・メーカー別チップ・囲みの薄色 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);
const r=await p.evaluate(()=>{
  const chips=[...document.querySelectorAll('#chips .dfil .stchip')].map(x=>x.textContent.trim());
  const c=document.querySelector('#list .pcard');
  const eb=c.querySelector('.ebox[data-f="tan"]');
  const ebi=eb.querySelector('i');
  const memo=c.querySelector('.pmemo');
  const tbCard=[...document.querySelectorAll('#list .pcard')].find(x=>{
    const q=props.find(y=>y.id===+x.dataset.pid); return q&&q.tb;});
  return {chips, ebBg:getComputedStyle(eb).backgroundColor, lblBg:getComputedStyle(ebi).backgroundColor,
    memoOK:!!memo, memoLabel:memo?memo.querySelector('b').textContent:'',
    tbShown: tbCard? tbCard.querySelector('.pmemo u').textContent.length>0 : null,
    overflow: document.documentElement.scrollWidth-document.documentElement.clientWidth};
});
/* ★2026-08-13f チップの文字から「別」を外した */
ok(r.chips.some(x=>x.includes('メーカー')),'メーカーのチップがある', r.chips.join(' '));
/* ★2026-08-13e 仕様変更：値の部分は白、項目名だけ状態色の薄色 */
ok(r.ebBg==='rgb(255, 255, 255)','値の部分は白', r.ebBg);
ok(r.lblBg!=='rgba(0, 0, 0, 0)'&&r.lblBg!=='rgb(255, 255, 255)','項目名は状態色の薄色（完成済=薄緑）', r.lblBg);
ok(r.memoOK && r.memoLabel==='メモ','メモ欄がある');
ok(r.tbShown===true,'既存の備考(tb)がメモに出る');
ok(r.overflow<=0,'横はみ出しなし', r.overflow);
/* メーカー別で絞り込む */
await p.evaluate(()=>{ lfOpen=null; const f=LIST_FIL.find(x=>x.key==='maker'); lfCounts();
  listFil.maker.add('アーキヤマデ'); render(); });
await p.waitForTimeout(700);
const cnt=await p.evaluate(()=>document.querySelectorAll('#list .pcard').length);
const expect=await p.evaluate(()=>props.filter(x=>x.maker==='アーキヤマデ').length);
ok(cnt===expect,'メーカー別の絞り込みが効く', cnt+'/'+expect);
await p.evaluate(()=>{ listFil.maker.clear(); render(); });
await p.waitForTimeout(500);
/* メモのその場編集 */
await p.click('#list .pcard .pmemo');
await p.waitForTimeout(200);
const hasTa=await p.evaluate(()=>!!document.querySelector('#list .pcard .pmemo textarea'));
ok(hasTa,'メモをタップで複数行入力になる');
await p.keyboard.type('排水口の詰まり注意。次回は高圧洗浄を提案する。');
await p.click('#toolbar');  /* 外をタップして確定 */
await p.waitForTimeout(700);
const saved=await p.evaluate(()=>props.find(x=>x.id===+document.querySelector('#list .pcard').dataset.pid).tb);
ok(/高圧洗浄/.test(saved||''),'メモが保存される', (saved||'').slice(0,20));
const shown=await p.evaluate(()=>document.querySelector('#list .pcard .pmemo u').textContent);
ok(/高圧洗浄/.test(shown),'画面にも反映');
ok(errs.length===0,'JSエラーなし', errs.join(' | ').slice(0,200));
await p.screenshot({path:'memo1.png'});
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
