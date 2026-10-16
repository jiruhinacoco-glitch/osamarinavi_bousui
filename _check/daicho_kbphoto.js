/* ★§719 写真台帳：写真ごとの黒板あり・なし（本人「台帳に保管している写真ごとに黒板のあり・なしが選べない」）
   ① 写真ごとに「黒板あり」ボタン（全体が「あり」なら最初は あり）
   ② No.2 だけ「黒板なし」にすると、No.2 の絵から黒板が消え、No.1 は黒板のまま（絵の黒板の場所の色で見る）
   ③ 開き直しても No.2 は「黒板なし」のまま（保存）
   ④ pageerror 0
   直す前の版では ①〜③ が★NG。  使い方: node _check/daicho_kbphoto.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:1600,height:900}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const file=async(name)=>({name,mimeType:'image/png',buffer:Buffer.from(await p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=400;c.height=300; const g=c.getContext('2d'); g.fillStyle='#ffffff'; g.fillRect(0,0,400,300); return c.toDataURL('image/png').split(',')[1]; }),'base64')});
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>{ localStorage.removeItem('nn_daicho_pref_v1'); return nnPhotos.load('nn_daicho_v1').then(m=>m&&nnPhotos.del('nn_daicho_v1',Object.keys(m))); }).catch(()=>{}); await p.reload(); await p.waitForTimeout(1000);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); };
  await open(); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(300); await p.evaluate(()=>window.nnDbReg&&nnDbReg());
  await p.fill('#dbSite','黒板写真ごとの現場'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(500);
  await p.setInputFiles('#dbPickIn',[await file('a.png'),await file('b.png')]); try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===2,null,{timeout:8000}); }catch(e){} await p.waitForTimeout(1200);
  /* 黒板は右下（42%）→ 右下の角近くの色が緑っぽいか */
  const green=i=>p.evaluate(i=>{ const c=document.querySelectorAll('#dbGrid .tile canvas')[i]; const d=c.getContext('2d').getImageData(Math.round(c.width*.85),Math.round(c.height*.85),1,1).data; return d[1]>d[0]+30&&d[1]>d[2]; },i);
  const g1={btn:await p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile .kbtg')].map(x=>x.textContent)), g0:await green(0), g1:await green(1)};
  ok('① 写真ごとに「黒板あり」ボタン（最初は あり・絵にも黒板）', g1.btn.join()==='黒板あり,黒板あり'&&g1.g0&&g1.g1, g1);
  if(g1.btn.length===2){ await p.locator('#dbGrid .tile').nth(1).locator('.kbtg').click(); await p.waitForTimeout(800); }
  const g2={btn:await p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile .kbtg')].map(x=>x.textContent)), g0:await green(0), g1:await green(1)};
  ok('② No.2 だけ黒板なし → No.2 の絵から黒板が消え No.1 はそのまま', g2.btn.join()==='黒板あり,黒板なし'&&g2.g0&&!g2.g1, g2);
  await p.evaluate(()=>{ const s=document.getElementById('dbSaveSt'); s&&s.click(); }); await p.waitForTimeout(400); await p.evaluate(()=>{ const b=[...document.querySelectorAll('#dbAsk button')].find(x=>/保存/.test(x.textContent)&&!/しない/.test(x.textContent)); b&&b.click(); }); await p.waitForTimeout(1200);
  await p.reload(); await p.waitForTimeout(1000); await open(); const card=p.locator('#dbLibList .libCard',{hasText:'黒板写真ごとの現場'}); if(await card.count()){ await card.locator('.lgo').click(); await p.waitForTimeout(1500); }
  const g3={btn:await p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile .kbtg')].map(x=>x.textContent)), g1:await green(1).catch(()=>null)};
  ok('③ 開き直しても No.2 は黒板なし', g3.btn.join()==='黒板あり,黒板なし'&&g3.g1===false, g3);
  ok('④ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
