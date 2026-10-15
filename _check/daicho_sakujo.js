/* ★§696 写真台帳の一覧：「削除がない」「開くでなく編集に」「写真がなくても保存できるように」（本人）。スマホ縦・PC で：
   ① 作成済みのカードのボタンは「編集」と「削除」（「開く」ではない）
   ② 写真0枚でも、現場名を入れて「保存する」→ この内容で保存しますか → 保存する → 一覧に「写真 0枚」のカード（読み込み直しても残る）
   ③ 「編集」でその台帳が開く（現場名が入っている）
   ④ 「削除」→ 確認（この写真台帳を削除しますか・元に戻せません）→ やめる＝残る／削除する＝カードが消え、写真も端末から消える（読み込み直しても無い）
   ⑤ pageerror 0
   直す前の版では ①②④ が★NG。  使い方: node _check/daicho_sakujo.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const A='写真あり現場', Z='写真なし現場';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,o] of [['スマホ縦',{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['PC',{viewport:{width:1600,height:900}}]]){
  const ctx=await b.newContext(o); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(nm!=='PC') await p.addInitScript(([w,h])=>{ Object.defineProperty(screen,'width',{get:()=>w}); Object.defineProperty(screen,'height',{get:()=>h}); localStorage.setItem('nn_view_mode','mobile'); },[o.viewport.width,o.viewport.height]);
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(900);
  await p.evaluate(async(A)=>{ const c=document.createElement('canvas'); c.width=120;c.height=90; c.getContext('2d').fillRect(0,0,120,90); const m=await nnPhotos.load('nn_daicho_v1');
    for(const id of ['k1','k2']){ const v={raw:1,d:c.toDataURL('image/jpeg'),t:Date.now()-60000,site:A,kind:'防水工事',date:'2026-10-15',era:'wareki',part:'',work:'',w:120,h:90}; await nnPhotos.put('nn_daicho_v1',id,v); if(m) m[id]=v; } },A);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(800); };
  const cards=()=>p.evaluate(()=>[...document.querySelectorAll('#dbLibList .libCard')].filter(c=>c.getBoundingClientRect().height>0).map(c=>({s:c.querySelector('b').textContent,n:(c.querySelector('small')||{}).textContent||'',btn:[...c.querySelectorAll('button,.lgo')].map(x=>x.textContent.trim())})));
  const ask=()=>p.evaluate(()=>{ const w=document.getElementById('dbAsk'); return w&&w.getBoundingClientRect().height>0?{t:w.querySelector('.askT').textContent,b:w.querySelector('.askB').textContent}:null; });
  const press=t=>p.evaluate(t=>{ const x=[...document.querySelectorAll('#dbAsk .askF button')].find(e=>e.textContent.includes(t)); if(x) x.click(); return !!x; },t);
  await open(); const c1=await cards();
  ok(nm+' ① カードのボタンは「編集」と「削除」', c1.length===1&&c1[0].btn.some(t=>/編集/.test(t))&&c1[0].btn.some(t=>/削除/.test(t))&&!c1[0].btn.some(t=>/開く/.test(t)), c1);
  // ② 写真0枚で保存
  if(await p.locator('#dbLibNew').isVisible()) await p.locator('#dbLibNew').click(); await p.waitForTimeout(500);
  await p.fill('#dbSite',Z); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('dbSaveSt')&&document.getElementById('dbSaveSt').click()); await p.waitForTimeout(400); const a2=await ask(); await press('保存する'); await p.waitForTimeout(600);
  const c2=await cards(); await p.reload(); await p.waitForTimeout(900); await open(); const c2b=await cards();
  const has0=cs=>cs.some(c=>c.s===Z&&/写真\s*0枚/.test(c.n));
  ok(nm+' ② 写真0枚でも保存できる（この内容で保存しますか→一覧に「写真 0枚」・読み込み直しても残る）', !!a2&&/この内容で保存しますか/.test(a2.t)&&has0(c2)&&has0(c2b), {a2:a2&&a2.t,c2,c2b});
  // ③ 編集
  const iA=c2b.findIndex(c=>c.s===A); if(iA>=0) await p.locator('#dbLibList .libCard').nth(iA).locator('.lgo').click(); await p.waitForTimeout(800);
  const e3=await p.evaluate(()=>({site:document.getElementById('dbSite').value, lib:document.getElementById('dbv').classList.contains('lib'), tiles:document.querySelectorAll('#dbGrid .tile').length}));
  ok(nm+' ③ 「編集」でその台帳が開く', !e3.lib&&e3.site===A&&e3.tiles===2, e3);
  await p.evaluate(()=>document.getElementById('dbBack').click()); await p.waitForTimeout(600);
  // ④ 削除
  const del=async(s)=>{ const cs=await cards(); const i=cs.findIndex(c=>c.s===s); if(i<0) return false; const d=p.locator('#dbLibList .libCard').nth(i).locator('.ldel'); if(!await d.count()) return false; await d.click(); await p.waitForTimeout(300); return true; };
  const hasDel=await del(A); const a4=await ask(); await press('やめる'); await p.waitForTimeout(300); const c4a=await cards();
  await del(A); await press('削除する'); await p.waitForTimeout(700); const c4b=await cards();
  await p.reload(); await p.waitForTimeout(900); const left=await p.evaluate(async(A)=>{ const m=await nnPhotos.load('nn_daicho_v1'); return Object.keys(m||{}).filter(k=>m[k].site===A).length; },A); await open(); const c4c=await cards();
  ok(nm+' ④ 削除→確認（元に戻せません）→やめる＝残る／削除する＝消える・写真も端末から消える', hasDel&&!!a4&&/削除しますか/.test(a4.t)&&/元に戻せません/.test(a4.b)&&c4a.some(c=>c.s===A)&&!c4b.some(c=>c.s===A)&&left===0&&!c4c.some(c=>c.s===A)&&c4c.some(c=>c.s===Z), {a4,c4a:c4a.map(c=>c.s),c4b:c4b.map(c=>c.s),left,c4c:c4c.map(c=>c.s)});
  ok(nm+' ⑤ pageerror 0', errs.length===0, errs);
  await ctx.close(); }
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
