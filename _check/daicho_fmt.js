/* ★§721 写真台帳：形式（表／行の羅列）と表紙（本人「フォーマットも途中で変更できるように。ただ行の羅列のパターンも」「表紙も設定で追加」）
   ① PDF・Excel の確認画面の上に「形式：表／行の羅列」「表紙：あり／なし・表紙の内容」。最初は 表・表紙なし
   ② 「行の羅列」→ ページに見出し（工事名・作業内容 など）が描かれず、No.1 と中身だけ。確認画面の入力欄は 9行の 3・5・6行目（x 116〜183mm）
   ③ 「表紙 あり」→ 1枚目が表紙（「工 事 写 真 帳」）・写真のページ番号は 1／1 のまま
   ④ 「表紙の内容」に工事番号・工期を入れて決定 → 表紙に出る
   ⑤ Excel：シートが「表紙」「写真台帳」・表紙に工事番号・行の羅列では表の見出し（工事名）が無く No.1 がある
   ⑥ 開き直しても 行の羅列・表紙あり のまま
   ⑦ pageerror 0
   直す前の版では ①〜⑥ が★NG。  使い方: node _check/daicho_fmt.js [camera.html の代わり] [画面写しの保存先フォルダ] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html', SHOT=process.argv[3]||'';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:1600,height:900}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ window._pt=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t){ if(this.canvas.width===186*12) window._pt.push(String(t)); return o.apply(this,arguments); }; });
  const file=async(name)=>({name,mimeType:'image/png',buffer:Buffer.from(await p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=400;c.height=300; const g=c.getContext('2d'); g.fillStyle='#4070b0'; g.fillRect(0,0,400,300); return c.toDataURL('image/png').split(',')[1]; }),'base64')});
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>{ localStorage.removeItem('nn_daicho_pref_v1'); return nnPhotos.load('nn_daicho_v1').then(m=>m&&nnPhotos.del('nn_daicho_v1',Object.keys(m))); }).catch(()=>{}); await p.reload(); await p.waitForTimeout(1000);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); };
  await open(); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(300); await p.evaluate(()=>window.nnDbReg&&nnDbReg());
  await p.fill('#dbSite','形式試験の現場'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(500);
  await p.setInputFiles('#dbPickIn',[await file('a.png')]); try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===1,null,{timeout:8000}); }catch(e){} await p.waitForTimeout(600);
  await p.locator('#dbGrid .tile .part').fill('ドレン'); await p.locator('#dbGrid .tile .part').dispatchEvent('change'); await p.waitForTimeout(200);
  const waitPg=async()=>{ await p.waitForTimeout(300); try{ await p.waitForFunction(()=>{ const ims=[...document.querySelectorAll('#dbRevS .sl.pg img')]; return ims.length&&ims.every(i=>i.complete); },null,{timeout:10000}); }catch(e){} await p.waitForTimeout(400); };
  await p.evaluate(()=>{ window._pt=[]; }); await p.click('#dbPrintBtn'); await waitPg();
  const st=()=>p.evaluate(()=>{ const O=document.getElementById('dbRevOpt'); if(!O) return null; return {vis:O.getBoundingClientRect().height>0, on:[...O.querySelectorAll('button.on')].map(x=>x.textContent).join(), txt:O.textContent}; });
  const g1=await st(); ok('① 確認画面に 形式・表紙 の切り替え・最初は 表／なし', !!g1&&g1.vis&&g1.on==='表,なし'&&/行の羅列/.test(g1.txt)&&/表紙の内容/.test(g1.txt), g1);
  const tbl=await p.evaluate(()=>window._pt.slice()); 
  let g2={}; if(g1){ await p.evaluate(()=>{ window._pt=[]; }); await p.locator('#dbRevOpt button',{hasText:'行の羅列'}).click(); await waitPg();
    g2.pt=await p.evaluate(()=>window._pt.slice()); g2.geo=await p.evaluate(()=>{ const sl=document.querySelector('#dbRevS .sl.pg'), im=sl.querySelector('img').getBoundingClientRect(); return [...sl.querySelectorAll('.ove')].map(e=>{ const r=e.getBoundingClientRect(); return [+((r.left-im.left)/im.width*186).toFixed(1),+((r.top-im.top)/im.height*273).toFixed(1)]; }); });
    if(SHOT) await p.screenshot({path:SHOT+'/fmt_lines.png'}); }
  const expT=[2,4,5].map(i=>+(14+3+i*76/9).toFixed(1));
  ok('② 行の羅列：見出しなしで No.1 と中身・入力欄は 9行の 3・5・6行目', tbl.includes('作業内容')&&!!g2.pt&&!g2.pt.includes('作業内容')&&!g2.pt.includes('工事名')&&g2.pt.includes('No.1')&&g2.pt.includes('ドレン')&&g2.geo.length===3&&g2.geo.every((g,i)=>Math.abs(g[0]-116)<=0.6&&Math.abs(g[1]-expT[i])<=0.6), {geo:g2.geo,expT,has:(g2.pt||[]).slice(0,10)});
  let g3={}; if(g1){ await p.evaluate(()=>{ window._pt=[]; }); await p.locator('#dbRevOpt .rc1[data-c="on"]').click(); await waitPg();
    g3={n:await p.locator('#dbRevS .sl').count(), cap:await p.evaluate(()=>[...document.querySelectorAll('#dbRevS .sl p')].map(x=>x.textContent)), pt:await p.evaluate(()=>window._pt.slice())}; }
  ok('③ 表紙あり → 1枚目が表紙・写真のページは 1／1', g3.n===2&&g3.cap&&g3.cap[0]==='表紙'&&g3.cap[1]==='1／1 ページ'&&(g3.pt||[]).includes('工　事　写　真　帳'), {n:g3.n,cap:g3.cap});
  let g4={}; if(g1){ await p.click('#dbCovEd'); await p.waitForTimeout(200); await p.fill('#dbCov input[data-k="no"]','R8-001'); await p.fill('#dbCov input[data-k="start"]','2026-10-01'); await p.evaluate(()=>{ window._pt=[]; }); await p.click('#dbCovOk'); await waitPg();
    g4.pt=await p.evaluate(()=>window._pt.slice()); if(SHOT){ await p.evaluate(()=>{ document.getElementById('dbRevS').scrollLeft=0; }); await p.waitForTimeout(300); await p.screenshot({path:SHOT+'/fmt_cover.png'}); } }
  ok('④ 表紙の内容（工事番号・着手）が表紙に出る', !!g4.pt&&g4.pt.includes('R8-001')&&g4.pt.some(t=>/着手.*2026年10月1日|着手.*令和8年10月1日/.test(t))&&g4.pt.includes('形式試験の現場'), (g4.pt||[]).filter(t=>t.length>1).slice(0,12));
  await p.click('#dbRevX'); await p.waitForTimeout(300);
  await p.click('#dbXlsBtn'); await waitPg(); try{ await p.waitForFunction(()=>window._nnXls,null,{timeout:15000}); }catch(e){}
  const g5=await p.evaluate(async()=>{ if(!window._nnXls||!window.ExcelJS) return null; const wb=new ExcelJS.Workbook(); await wb.xlsx.load(await window._nnXls.arrayBuffer()); const names=wb.worksheets.map(w=>w.name); const all=n=>{ const out=[]; wb.getWorksheet(n).eachRow(r=>r.eachCell(c=>{ if(c.value!=null&&c.value!=='') out.push(String(c.value)); })); return out; }; return {names, cov:all('表紙'), body:all('写真台帳')}; });
  ok('⑤ Excel：表紙のシート（工事番号）・行の羅列（見出しなし・No.1）', !!g5&&g5.names.join()==='表紙,写真台帳'&&g5.cov.includes('R8-001')&&g5.body.includes('No.1')&&g5.body.includes('ドレン')&&!g5.body.includes('工事名')&&!g5.body.includes('作業内容'), g5);
  await p.click('#dbRevX'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(1000); await open(); const card=p.locator('#dbLibList .libCard',{hasText:'形式試験の現場'}); if(await card.count()){ await card.locator('.lgo').click(); await p.waitForTimeout(1200); }
  await p.click('#dbPrintBtn'); await waitPg(); const g6=await st(); const n6=await p.locator('#dbRevS .sl').count();
  ok('⑥ 開き直しても 行の羅列・表紙あり', !!g6&&g6.on==='行の羅列,あり'&&n6===2, {g6,n6});
  ok('⑦ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
