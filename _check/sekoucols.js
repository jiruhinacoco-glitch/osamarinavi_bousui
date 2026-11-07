/* §1066 施工中の現場（PC）：進捗バーが行の中に収まる・防水仕様の列が札の幅・乗り込み列・列見出しのドラッグ入れ替えと保存（2026-11-07i）
   本人「進捗／予算消化の表がずれている」「防水仕様の枠の左右の余白が邪魔。詰めて」「列をドラッグで自由に移動できるように」「乗り込み日も入れて」。
   ①進捗の箱（td）は表のセル（table-cell）で、バーの箱が行の上下の中に収まる（§1060 の目印 sc-prog が工程表の .sc-prog と同名で display:flex になっていた）
   ②防水仕様の列幅が膨らまない（仕様5個の行を混ぜて130px以下。直す前は150px＝max-width:150px いっぱい）
   ③「乗り込み」列が防水仕様と完成予定の間にあり、値が YYYY/MM/DD か —
   ④見出しのドラッグ（DragEvent）で数量を元請の後ろへ → 列の並びが変わり、端末に保存され、再読み込みしても同じ並び
   使い方: node _check/sekoucols.js [kirokucho_demo.html]   ※直す前の版は ①③④ が★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const M=()=>{const r=e=>{const q=e.getBoundingClientRect();return {t:q.top,b:q.bottom,h:q.height,w:q.width};};
  const tbl=document.querySelector('#dashboard .sekou-tbl'); const ths=[...tbl.querySelectorAll('tr:first-child th')].map(t=>t.textContent.replace(/[▲▼\s]/g,''));
  const rows=[...tbl.querySelectorAll('tr.click')]; const tr=rows[0]; const idx=k=>ths.indexOf(k);
  const td=tr.cells[idx('進捗／予算消化')]; const pw=td&&td.querySelector('.pw2');
  const spcI=idx('防水仕様'); const single=rows.find(t=>t.cells[spcI].querySelectorAll('.badge').length===1); const sb=single&&single.cells[spcI].querySelector('.badge');
  const nI=idx('乗り込み'); const nori=nI>=0?rows.map(t=>t.cells[nI].textContent.trim()):[];
  const z=tbl.getBoundingClientRect().width/tbl.offsetWidth||1;   /* 拡大表示の倍率（罠1：rect は倍率をかけた後） */
  return {ths, z, tdDisp:td?getComputedStyle(td).display:'', inRow:!!(pw&&td&&r(pw).t>=r(tr).t-1&&r(pw).b<=r(tr).b+1), spcW:single?r(single.cells[spcI]).w/z:null, badgeW:sb?r(sb).w/z:null, nI, specI:spcI, yI:idx('完成予定'), nori};};
(async()=>{const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:2000,height:1000},serviceWorkers:'block'}); await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','dash'); if(!sessionStorage.getItem('nn_chk_cleared')){localStorage.removeItem('nn_dash_display_v1'); sessionStorage.setItem('nn_chk_cleared','1');}});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2500);
  /* 本人の実データと同じ「仕様が5個の行」を2件混ぜる（列幅はいちばん長い札で決まるため） */
  await p.evaluate(()=>{const orig=window.nnKoList; window.nnKoList=function(q){ if(/東京流通センター|三井アウトレット/.test(q.name||'')) return [{ko:'塩ビ',sp:'S-M1',mk:'ヤマデ'},{ko:'ウレタン',sp:'X-2H',mk:'ダイフ'},{ko:'ウレタン',sp:'X-1',mk:'田島'},{ko:'改質',sp:'AS-J1',mk:'田島'},{ko:'シーリング',sp:'シーリング（部分）',mk:''}]; return orig(q); }; renderDash();}); await p.waitForTimeout(600);
  const open=async()=>{await p.evaluate(()=>document.querySelector('#dashboard .nn-dnav button[data-k="sekou"]').click()); await p.waitForFunction(()=>{const s=document.querySelector('#dashboard .nn-dsel');return s&&s.dataset.panelId==='sekou'&&s.querySelector('.sekou-tbl tr.click');},null,{timeout:5000});};
  await open(); let m=await p.evaluate(M);
  ok('進捗の箱は表のセル（table-cell）でバーが行の中に収まる', m.tdDisp==='table-cell'&&m.inRow, m.tdDisp+' inRow='+m.inRow);
  /* 直す前は表の余りが全列に配られ、2000px幅で防水仕様の列が約168pxに膨らんでいた（札は約50px）。列幅は見出し「防水仕様▼」の幅（約85px）が下限 */
  ok('防水仕様の列幅が膨らまない（仕様5個の行を混ぜて 130px 以下。直す前は150px）', m.spcW!=null&&m.spcW<=130, Math.round(m.spcW)+'px / 札'+Math.round(m.badgeW||0)+'px');
  ok('「乗り込み」列が防水仕様と完成予定の間・値は日付か—', m.nI>0&&m.nI===m.specI+1&&m.yI===m.nI+1&&m.nori.length>0&&m.nori.every(v=>/^\d{4}\/\d{2}\/\d{2}$/.test(v)||v==='—'), m.ths.join('|')+' / '+m.nori.slice(0,3).join(','));
  /* ④ ドラッグ：数量 → 元請の後ろ */
  const real=await p.evaluate(()=>{const th=c=>document.querySelector('#dashboard .sekou-tbl th[data-col="'+c+'"]'); const a=th('area'), t=th('moto'); if(!a||!t)return false;
    const dt=new DataTransfer(); a.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt})); const r=t.getBoundingClientRect();
    t.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:r.right-3,clientY:r.top+5}));
    t.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:r.right-3,clientY:r.top+5})); return true;});
  await p.waitForTimeout(600); m=await p.evaluate(M);
  const want=m.ths.indexOf('元請')>=0&&m.ths.indexOf('数量')===m.ths.indexOf('元請')+1;
  ok('見出しのドラッグで「数量」が「元請」の後ろへ', real&&want, m.ths.join('|'));
  const saved=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('nn_dash_display_v1')).sekou.cols.join(',');}catch(e){return '';}});
  ok('並びが端末に保存される（moto の次が area）', /moto,area/.test(saved), saved);
  await p.reload(); await p.waitForTimeout(2500); await open(); m=await p.evaluate(M);
  ok('再読み込みしても同じ並び', m.ths.indexOf('数量')===m.ths.indexOf('元請')+1, m.ths.join('|'));
  await p.evaluate(()=>localStorage.removeItem('nn_dash_display_v1'));
  ok('JSエラーなし', !errs.length, errs.join(' '));
  await b.close(); R.forEach(x=>console.log(x)); const ng=R.filter(x=>x.startsWith('★NG')).length; console.log(ng?'★NG '+ng+'件':'全部○');})();
