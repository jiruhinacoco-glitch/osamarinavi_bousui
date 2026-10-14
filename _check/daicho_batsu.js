/* ★2026-10-13zj 写真台帳：現場名の × と「最近」の札（本人・§676）
   ① 「最近：」の黒い現場名の札を出さない（現場を2つ入れたあとでも）
   ② 現場名が空のとき × は出ない・文字があると入力欄の右端の内側に出る（欄からはみ出さない・文字とは重ならない余白）
   ③ × を押すと現場名が全部消え、入力欄にカーソルが入り（打ち直せる）、× は消える
   ④ スマホの下のボタン：どれも文字の幅より 12% 以上ゆとりがある（iPhone の文字は検査のブラウザより幅を取る＝「印刷・PD」で切れた）
   ⑤ pageerror 0
   直す前の版では ①〜④ が★NG。  使い方: node _check/daicho_batsu.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const S1='バツ試験の現場A', S2='バツ試験の現場B 大規模修繕（屋上・バルコニー防水）';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  const clean=()=>p.evaluate(async(a)=>{ const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>a.includes(m[k].site))); },[S1,S2]);
  await clean();
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(500);
  await p.evaluate(()=>{ document.querySelector('#dbv .dbSide').classList.remove('closed'); });
  const vis=(sel)=>p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return getComputedStyle(e).display!=='none'&&r.width>0; },sel);
  const c0=await vis('#dbSiteClr');
  for(const s of [S1,S2]){ await p.fill('#dbSite',s); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(500); }
  await p.evaluate(()=>{ document.querySelector('#dbv .dbSide').classList.remove('closed'); }); await p.waitForTimeout(200);
  /* ① */
  const t1=await p.evaluate(()=>{ const r=document.getElementById('dbRecentSites'); return {shown:!!r&&getComputedStyle(r).display!=='none'&&r.getBoundingClientRect().height>0, n:r?r.querySelectorAll('button').length:0}; });
  ok('① 「最近：」の黒い現場名の札を出さない', !t1.shown, t1);
  /* ② */
  const t2=await p.evaluate(()=>{ const x=document.getElementById('dbSiteClr'), i=document.getElementById('dbSite'); if(!x) return {x:false}; const a=x.getBoundingClientRect(), r=i.getBoundingClientRect();
    return {x:true, vis:getComputedStyle(x).display!=='none'&&a.width>0, inside:a.left>=r.left&&a.right<=r.right&&a.top>=r.top-1&&a.bottom<=r.bottom+1, nearRight:r.right-a.right<=8, pad:parseFloat(getComputedStyle(i).paddingRight), w:Math.round(a.width), txt:x.textContent}; });
  ok('② 現場名が空なら × なし・文字があると入力欄の右端の内側（文字と重ならない余白）', c0===false&&t2.x&&t2.vis&&t2.inside&&t2.nearRight&&t2.pad>=t2.w&&t2.txt==='×', {c0,t2});
  /* ③ */
  if(t2.x&&t2.vis) await p.click('#dbSiteClr'); await p.waitForTimeout(400);
  const t3=await p.evaluate(()=>({v:document.getElementById('dbSite').value, focus:document.activeElement&&document.activeElement.id, x:getComputedStyle(document.getElementById('dbSiteClr')||document.body).display}));
  ok('③ × を押すと現場名が全部消える・入力欄にカーソル・× は消える', t3.v===''&&t3.focus==='dbSite'&&t3.x==='none', t3);
  /* ④ */
  const t4=await p.evaluate(()=>[...document.querySelectorAll('#dbv .dbf button')].map(bt=>{ const s=document.createElement('span'), cs=getComputedStyle(bt); s.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:'+cs.font+';letter-spacing:'+cs.letterSpacing; s.textContent=bt.textContent; document.body.appendChild(s); const nat=s.getBoundingClientRect().width; s.remove();
    const inner=bt.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight); return {t:bt.textContent.trim(), inner:Math.round(inner), nat:Math.round(nat), room:+(inner/nat).toFixed(2)}; }));
  ok('④ 下のボタン：どれも文字の幅より 12% 以上ゆとり（iPhone で「印刷・PD」と切れない）', t4.length===4&&t4.every(x=>x.room>=1.12), t4);
  await clean();
  ok('⑤ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
