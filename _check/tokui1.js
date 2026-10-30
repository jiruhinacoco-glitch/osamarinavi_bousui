/* 客先登録（2026-08-18b）＋設定/用語集の白い枠削除の検証 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/index.html',{waitUntil:'load'}); await p.waitForTimeout(2200);
  /* 白い枠が消えている */
  const ic=await p.evaluate(()=>{const e=document.querySelector('.qbtn .icwrap'); const cs=getComputedStyle(e);
    return {bg:cs.backgroundImage==='none'&&cs.backgroundColor==='rgba(0, 0, 0, 0)', sh:cs.boxShadow==='none'};});
  ok('設定/用語集の白いタイルが無い', ic.bg&&ic.sh, ic);
  /* メニュー → 客先登録 */
  await p.tap('#menuBtn'); await p.waitForTimeout(400);
  const r1=await p.evaluate(()=>({open:document.getElementById('nnTokuiBg').classList.contains('open'),
    rows:document.querySelectorAll('.tkrow').length,
    kv:document.querySelector('.tkrow .kv').textContent}));
  ok('メニューで客先登録が開く（元請5件）', r1.open&&r1.rows===5, r1.rows);
  ok('元請に入金日・支払（条件）・サイト', /入金日/.test(r1.kv)&&/支払/.test(r1.kv)&&/サイト/.test(r1.kv));   /* ★2026-10-28a 見出しを短く（1段に収める） */
  await p.screenshot({path:'out/chk_tokui_moto.png'});
  /* 仕入業者タブ */
  await p.evaluate(()=>nnTokuiTab('shiire')); await p.waitForTimeout(300);
  const r2=await p.evaluate(()=>({rows:document.querySelectorAll('.tkrow').length,
    kv:document.querySelector('.tkrow .kv').textContent}));
  /* 2026-10-30za 見本の仕入業者は今3件。件数の決め打ちをやめ、足す前の件数（n0）から数える */
  const n0=r2.rows;
  ok('仕入業者がある・担当/連絡先', r2.rows>=1&&/担当/.test(r2.kv)&&/TEL|メール/.test(r2.kv), r2.rows);
  /* 追加→保存→再読み込みで残る */
  /* ★2026-10-30za 追加は 09-25d から共通の「新規顧客登録」画面（nn_master.js・#nnReg）で行う作り。その画面の欄に入れて「保存する」を押す */
  await p.evaluate(()=>{ nnTokuiAdd(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const s=(id,v)=>{const e=document.getElementById(id); if(e){e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));}};
    s('rg_name','テスト建材（株）'); s('rg_tanto','営業 試験様');
    const b=[...document.querySelectorAll('#nnReg .btns button')].find(x=>x.textContent.trim()==='保存する'); b.click(); });
  await p.waitForTimeout(600);
  ok('追加できる（1件増える）', await p.evaluate(()=>document.querySelectorAll('.tkrow').length)===n0+1);
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(2000);
  await p.tap('#menuBtn'); await p.waitForTimeout(300);
  await p.evaluate(()=>nnTokuiTab('shiire')); await p.waitForTimeout(200);
  ok('再読み込み後も残る', await p.evaluate(()=>document.querySelectorAll('.tkrow').length)===n0+1);
  /* 削除して戻す */
  await p.evaluate(()=>{ const it=[...document.querySelectorAll('.tkrow')].find(e=>/テスト建材/.test(e.textContent));
    it.querySelector('.ops button:last-child').click(); });
  await p.waitForTimeout(300);
  ok('削除できる（元の件数に戻る）', await p.evaluate(()=>document.querySelectorAll('.tkrow').length)===n0);
  /* 編集：元請の支払サイトを変える */
  await p.evaluate(()=>nnTokuiTab('moto'));
  await p.evaluate(()=>nnTokuiEdit('c1'));
  await p.evaluate(()=>{ document.getElementById('tkf_site').value='45日'; nnTokuiSave('c1'); });
  await p.waitForTimeout(200);
  ok('編集が反映される', await p.evaluate(()=>/45日/.test(document.querySelector('.tkrow').textContent)));
  ok('パネルが画面内', await p.evaluate(()=>{const r=document.getElementById('nnTokui').getBoundingClientRect(); return r.top>=0&&r.height<=innerHeight;}));
  ok('JSエラーなし', errs.length===0, errs);
  console.log(R.join('\n'));
  await b.close();
})();
