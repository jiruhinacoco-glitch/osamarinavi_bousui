/* ★§718 写真台帳：写真ごとの「コピー」「写真変更」（本人「同じ内容で写真だけ変更したい」「写真変更ボタンを削除の隣に」）
   ① 写真ごとに「コピー」「写真変更」「削除」が並ぶ（写真変更は削除のとなり）・枠からはみ出さない（PC・スマホ）
   ② 「コピー」→ すぐ後ろ（No.2）に同じ部位・作業内容・日付の写真が増える・元の写真はそのまま
   ③ 「写真変更」→ 写真を選ぶと、その写真だけ取り替わる（部位・作業内容・日付はそのまま・枚数は増えない）
   ④ 開き直しても残る（保存）
   ⑤ pageerror 0
   直す前の版では ①〜④ が★NG。  使い方: node _check/daicho_copy.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,o,mob] of [['PC',{viewport:{width:1600,height:900}},0],['スマホ',{viewport:{width:360,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true},1]]){
  const ctx=await b.newContext(o); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mob) await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>360}); Object.defineProperty(screen,'height',{get:()=>780}); localStorage.setItem('nn_view_mode','mobile'); });
  const file=async(name,col)=>({name,mimeType:'image/png',buffer:Buffer.from(await p.evaluate((col)=>{ const c=document.createElement('canvas'); c.width=400;c.height=300; const g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,400,300); return c.toDataURL('image/png').split(',')[1]; },col),'base64')});
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>{ localStorage.removeItem('nn_daicho_pref_v1'); return nnPhotos.load('nn_daicho_v1').then(m=>m&&nnPhotos.del('nn_daicho_v1',Object.keys(m))); }).catch(()=>{}); await p.reload(); await p.waitForTimeout(1000);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); };
  await open(); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(300); await p.evaluate(()=>window.nnDbReg&&nnDbReg());
  await p.fill('#dbSite','コピー試験の現場'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(600);
  await p.setInputFiles('#dbPickIn',[await file('a.png','#3060c0')]); try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===1,null,{timeout:8000}); }catch(e){} await p.waitForTimeout(500);
  const t1=p.locator('#dbGrid .tile').first(); await t1.locator('.part').fill('ドレン'); await t1.locator('.part').dispatchEvent('change'); await t1.locator('.work').fill('下地処理'); await t1.locator('.work').dispatchEvent('change'); await p.waitForTimeout(300);
  const g1=await p.evaluate(()=>{ const t=document.querySelector('#dbGrid .tile'), T=t.getBoundingClientRect(), bs=[...t.querySelectorAll('.top button')]; return {txt:bs.map(x=>x.textContent.trim()), inside:bs.every(x=>{ const r=x.getBoundingClientRect(); return r.left>=T.left-1&&r.right<=T.right+1; })}; });
  ok(nm+'：① コピー・写真変更・削除が並ぶ（写真変更は削除のとなり）・はみ出さない', g1.txt.join()==='コピー,写真変更,削除'&&g1.inside, g1);
  if(g1.txt.includes('コピー')){ await t1.locator('.cpy').click(); await p.waitForTimeout(800); }
  const g2=await p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile')].map(t=>({no:t.querySelector('.no').textContent, part:t.querySelector('.part').value, work:t.querySelector('.work').value, date:t.querySelector('.date').value})));
  ok(nm+'：② コピー → No.2 に同じ部位・作業内容・日付', g2.length===2&&g2[1].part==='ドレン'&&g2[1].work==='下地処理'&&g2[1].date===g2[0].date&&g2[0].part==='ドレン', g2);
  let g3={};
  if(g1.txt.includes('写真変更')&&g2.length===2){ const px=()=>p.evaluate(()=>{ const c=document.querySelectorAll('#dbGrid .tile canvas')[1]; const g=c.getContext('2d'); const d=g.getImageData(Math.round(c.width*.1),Math.round(c.height*.1),1,1).data; return [d[0],d[1],d[2]]; });
    g3.before=await px(); const [fc]=await Promise.all([p.waitForEvent('filechooser'), p.locator('#dbGrid .tile').nth(1).locator('.chg').click()]); await fc.setFiles([await file('b.png','#d03020')]); await p.waitForTimeout(1500);
    g3.after=await px(); g3.n=await p.locator('#dbGrid .tile').count(); g3.part=await p.locator('#dbGrid .tile').nth(1).locator('.part').inputValue(); g3.first=await p.evaluate(()=>{ const c=document.querySelectorAll('#dbGrid .tile canvas')[0]; const d=c.getContext('2d').getImageData(Math.round(c.width*.1),Math.round(c.height*.1),1,1).data; return [d[0],d[1],d[2]]; }); }
  ok(nm+'：③ 写真変更 → その写真だけ赤に・内容そのまま・枚数そのまま', !!g3.after&&g3.after[0]>150&&g3.after[2]<100&&g3.first[2]>150&&g3.n===2&&g3.part==='ドレン', g3);
  await p.evaluate(()=>{ const s=document.getElementById('dbSaveSt'); s&&s.click(); }); await p.waitForTimeout(400); await p.evaluate(()=>{ const b=[...document.querySelectorAll('#dbAsk button')].find(x=>/保存/.test(x.textContent)&&!/しない/.test(x.textContent)); b&&b.click(); }); await p.waitForTimeout(1200);   /* 「保存する」を押してから開き直す */
  await p.reload(); await p.waitForTimeout(1000); await open(); await p.waitForTimeout(400); const card=p.locator('#dbLibList .libCard',{hasText:'コピー試験の現場'}); if(await card.count()){ await card.locator('.lgo').click(); await p.waitForTimeout(1200); }
  const g4=await p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile')].map(t=>t.querySelector('.part').value));
  ok(nm+'：④ 開き直しても2枚とも残る', g4.length===2&&g4.every(x=>x==='ドレン'), g4);
  ok(nm+'：⑤ pageerror 0', errs.length===0, errs); await ctx.close(); }
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
