/* ★§708 写真台帳：黒板の中身（本人の付箋）
   ① 「自動」の札を出さない
   ② 工事件名の中身で改行（Enter）すると2段になる・欄の行も高くなる・黒板の絵にもその2行がそのまま出る
   ③ 3段目は作れない（改行は1回まで）
   ④ 開き直しても2段のまま
   ⑤ pageerror 0
   ⑥ ★§712 改行しなくても、長くて欄の幅で折り返すときは自動で行が高くなる（⑥b 短くなれば戻る）
   直す前の版では ①② が★NG。  使い方: node _check/daicho_kaigyo.js [camera.html の代わり] [画面写し] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html', SHOT=process.argv[3]||'';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:1600,height:900}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ window._ft=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t){ if(this.canvas.id==='dbCv1') window._ft.push(String(t)); return o.apply(this,arguments); }; });
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>localStorage.removeItem('nn_daicho_pref_v1')); await p.reload(); await p.waitForTimeout(1000);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(400); await p.evaluate(()=>window.nnDbReg&&nnDbReg()); };
  await open(); await p.fill('#dbSite','サン太平レジデンス 大規模修繕'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(800);
  const row=p.locator('#dbItemL .bir',{has:p.locator('.kbLt',{hasText:'工事件名'})});
  const tag=await row.evaluate(d=>{ const a=getComputedStyle(d.querySelector('.kbR'),'::after'); return a.content!=='none'&&a.content!=='""'&&a.display!=='none'?a.content:''; });
  ok('① 「自動」の札を出さない', !tag, tag);
  const iv=row.locator('.iv'); const h0=await row.evaluate(d=>d.getBoundingClientRect().height);
  await iv.click(); await p.keyboard.press('End'); await p.keyboard.press('Control+End'); await p.keyboard.press('Enter'); await p.keyboard.type('（屋上・バルコニー防水）'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ window._ft=[]; document.getElementById('dbSize').dispatchEvent(new Event('input',{bubbles:true})); }); await p.waitForTimeout(800);
  const g2={v:await iv.inputValue(), h0, h1:await row.evaluate(d=>d.getBoundingClientRect().height), sm:await row.evaluate(d=>d.classList.contains('sm')||d.classList.contains('two')), sh:await iv.evaluate(e=>e.scrollHeight<=e.clientHeight+1), ft:await p.evaluate(()=>window._ft.slice())};
  ok('② 改行で2段（★§723 写真の黒板と同じく字を小さくして行の中に2行）・中身が全部見える・黒板の絵にも2行', g2.v==='サン太平レジデンス 大規模修繕\n（屋上・バルコニー防水）'&&g2.sm&&g2.sh&&g2.ft.includes('サン太平レジデンス 大規模修繕')&&g2.ft.includes('（屋上・バルコニー防水）'), {v:g2.v,h0,h1:g2.h1,sh:g2.sh,ft:g2.ft.slice(0,12)});
  if(SHOT) await p.locator('#dbSide').screenshot({path:SHOT});
  await p.keyboard.press('Enter'); await p.keyboard.type('3段目'); await p.waitForTimeout(300); const v3=await iv.inputValue();
  ok('③ 3段目は作れない（改行は1回まで）', v3.split('\n').length===2, v3);
  await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(500);
  const keep=await iv.inputValue(); await p.reload(); await p.waitForTimeout(1000); await open(); await p.waitForTimeout(500);
  const v4={was:keep, now:await row.locator('.iv').inputValue(), two:await row.evaluate(d=>d.classList.contains('two')||d.classList.contains('sm'))};
  ok('④ 開き直しても2段のまま', v4.now===v4.was&&v4.now.includes('\n')&&v4.two, v4);
  /* ⑥ ★§712 改行しなくても、長くて欄の幅で折り返すときは行が高くなり2行目まで見える */
  await p.fill('#dbSite','サン太平レジデンス 大規模修繕（屋上・バルコニー・外壁防水）第2期工事'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(900);
  const r6=p.locator('#dbItemL .bir',{has:p.locator('.kbLt',{hasText:'工事件名'})}); await r6.locator('.iv').fill(''); await r6.locator('.iv').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(500);
  const g6=await r6.evaluate(d=>{ const i=d.querySelector('.iv'); return {v:i.value, two:d.classList.contains('two')||d.classList.contains('sm'), sh:i.scrollHeight, ch:i.clientHeight}; });
  ok('⑥ 長くて折り返すときは自動で（字を小さく・それでも入らなければ行を高く）2行目まで見える', g6.v.length>20&&!g6.v.includes('\n')&&g6.two&&g6.sh<=g6.ch+1, g6);
  await p.evaluate(x=>{ const e=document.getElementById('dbFs'); e.value=x; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); },'140')   /* ★§732 文字の大きさはバー */; await p.fill('#dbSite','サン太平レジデンス 大規模修繕（屋上・バルコニー・外壁・庇・笠木防水）第2期工事その2'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(900);
  const g6c=await r6.evaluate(d=>{ const i=d.querySelector('.iv'); return {two:d.classList.contains('two')||d.classList.contains('sm'), sh:i.scrollHeight, ch:i.clientHeight}; });
  ok('⑥c 文字「特大」で3行に折り返しても全部見える', g6c.two&&g6c.sh<=g6c.ch+1, g6c); await p.evaluate(x=>{ const e=document.getElementById('dbFs'); e.value=x; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); },'100')   /* ★§732 文字の大きさはバー */;
  await p.fill('#dbSite','短い現場'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(900);
  const g6b=await r6.evaluate(d=>({v:d.querySelector('.iv').value, two:d.classList.contains('two')||d.classList.contains('sm')}));
  ok('⑥b 短くなれば1行の高さに戻る', g6b.v==='短い現場'&&!g6b.two, g6b);
  ok('⑤ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
