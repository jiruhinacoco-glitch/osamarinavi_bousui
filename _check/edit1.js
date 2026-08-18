/* その場編集の動作確認：名前・単価・金額・状態・工法・住所、カード選択と衝突しないか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);

/* 1. 請負単価をその場で編集 */
await p.click('#list .pcard .ebox[data-f="tan"]');
await p.waitForTimeout(200);
const hasInput=await p.evaluate(()=>!!document.querySelector('#list .pcard .ebox input'));
ok(hasInput,'タップで入力欄になる');
await p.keyboard.press('Control+a'); await p.keyboard.type('15000'); await p.keyboard.press('Enter');
await p.waitForTimeout(600);
const tan=await p.evaluate(()=>props.find(x=>x.id===+document.querySelector('#list .pcard').dataset.pid).tan);
ok(tan===15000,'単価が保存される', tan);
const shown=await p.evaluate(()=>document.querySelector('#list .pcard .ebox[data-f="tan"]').textContent);
ok(/15,000/.test(shown),'画面にも反映', shown.trim());

/* 2. 編集タップでカードが選択（黄色）にならない */
const armed=await p.evaluate(()=>document.querySelectorAll('#list .pcard.armed').length);
ok(armed===0,'編集タップは選択扱いにならない', armed);

/* 3. 材料金額の編集 → 利益（予定額）が変わる */
const before=await p.evaluate(()=>{const c=document.querySelector('#list .pcard'); return c.querySelector('.pprofit').textContent;});
await p.click('#list .pcard .ebox[data-f="mat"]');
await p.keyboard.press('Control+a'); await p.keyboard.type('999999'); await p.keyboard.press('Enter');
await p.waitForTimeout(600);
const after=await p.evaluate(()=>{const c=document.querySelector('#list .pcard'); return {t:c.querySelector('.pprofit').textContent, mat:props.find(x=>x.id===+c.dataset.pid).mat};});
ok(after.mat===999999,'材料金額が保存される', after.mat);
ok(after.t!==before,'利益予定額が追従して変わる', before.trim()+' → '+after.t.trim());

/* 4. 状態のプルダウン → 枠色が変わる */
await p.click('#list .pcard .stsel');
await p.waitForTimeout(200);
const selOk=await p.evaluate(()=>{
  const sel=document.querySelector('#list .pcard .stsel select'); if(!sel)return null;
  sel.value='施工中'; sel.dispatchEvent(new Event('change')); return true;});
ok(selOk===true,'状態のプルダウンが開く');
await p.waitForTimeout(600);
const st=await p.evaluate(()=>{const c=document.querySelector('#list .pcard');
  return {cls:[...c.classList].find(x=>x.startsWith('st-')), col:getComputedStyle(c).borderTopColor};});
ok(st.cls==='st-kou' && st.col==='rgb(255, 138, 30)','枠がオレンジ（施工中）に変わる', st.cls+' '+st.col);

/* 5. 工法のプルダウン → 記号・メーカーも変わる */
await p.click('#list .pcard .ebox[data-f="kouhou"]');
await p.waitForTimeout(200);
await p.evaluate(()=>{const sel=document.querySelector('#list .pcard .ebox select');
  sel.value='塩ビシート防水 機械固定(S-M2)'; sel.dispatchEvent(new Event('change'));});
await p.waitForTimeout(600);
const ko=await p.evaluate(()=>{const c=document.querySelector('#list .pcard');
  const q=props.find(x=>x.id===+c.dataset.pid);
  return {spec:q.spec, maker:q.maker, badge:c.querySelector('.badge').textContent, mk:c.querySelector('.mkchip')?.textContent};});
ok(ko.spec==='S-M2'&&ko.badge==='S-M2','工法を変えると記号も変わる', ko.badge);
/* ★2026-08-13n メーカーは省略名で持つようになった（アーキヤマデ→ヤマデ） */
ok(ko.maker==='ヤマデ'&&ko.mk==='ヤマデ','メーカーも変わる', ko.mk);

/* 6. Escで取り消し */
await p.click('#list .pcard .ebox[data-f="moto"]');
await p.keyboard.press('Control+a'); await p.keyboard.type('取り消しテスト'); await p.keyboard.press('Escape');
await p.waitForTimeout(500);
const moto=await p.evaluate(()=>props.find(x=>x.id===+document.querySelector('#list .pcard').dataset.pid).moto);
ok(moto!=='取り消しテスト','Escで取り消せる', moto);

/* 7. ★2026-08-17a タップ＝選ぶだけ。詳細へは「詳細」ボタンから */
await p.click('#list .pcard .pdate'); await p.waitForTimeout(250);
const sel2=await p.evaluate(()=>document.querySelectorAll('#list .pcard.sel').length);
await p.click('#list .pcard .pgo'); await p.waitForTimeout(700);
const det=await p.evaluate(()=>!!document.querySelector('#detail .dhead h2'));
ok(sel2===1,'日付タップ=選ばれる（黄色）', sel2);
ok(det,'「詳細」ボタンで詳細が開く');

ok(errs.length===0,'JSエラーなし', errs.join(' | ').slice(0,200));
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
