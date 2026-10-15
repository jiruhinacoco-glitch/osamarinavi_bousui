/* ★§698 写真台帳・カメラの入口（本人の5つの指摘）。スマホ縦（幅393）で：
   ① 写真ごとの「部位」をタップ → その写真の上にタグの一覧（入力欄を隠さない・「屋上」がある）
   ② タグを押すと入る（保存待ちに入る）
   ③ タグに無い言葉もそのまま打てる（一覧は「当てはまるタグはありません」・打った文字が残る）
   ④ 一覧の「編集」は鉛筆マーク（✏️）
   ⑤ ▼で順番が入れ替わり、読み込み直しても残る
   ⑥ 検索枠で現場名をしぼれる（件数「1件／全3件」）
   ⑦ 台帳を閉じると後ろのページが一番上に戻る（下へずれたままにならない）
   ⑧ 「納まり資料作成」を押すと「カメラで撮る／撮影済みの写真から選ぶ」を選べる（それぞれカメラ・写真の選択が開く）
   ⑨ pageerror 0
   直す前の版では ①②④⑤⑥⑧ が★NG。  使い方: node _check/daicho_tagnarabe.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const SITES=['〇〇マンション','△△ビル','□□工場'];
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(900);
  await p.evaluate(async(S)=>{ const c=document.createElement('canvas'); c.width=120;c.height=90; c.getContext('2d').fillRect(0,0,120,90); const m=await nnPhotos.load('nn_daicho_v1');
    for(let i=0;i<3;i++) for(let j=0;j<2;j++){ const v={raw:1,d:c.toDataURL('image/jpeg'),t:Date.now()-i*1e5-j,site:S[i],kind:'防水工事',date:'2026-10-15',era:'wareki',part:'',work:'',w:120,h:90}; await nnPhotos.put('nn_daicho_v1','t'+i+j,v); if(m) m['t'+i+j]=v; } },SITES);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(800); };
  const names=()=>p.evaluate(()=>[...document.querySelectorAll('#dbLibList .libCard')].filter(c=>c.getBoundingClientRect().height>0).map(c=>c.querySelector('b').textContent));
  await open();
  const ed=await p.evaluate(()=>{ const e=document.querySelector('#dbLibList .libCard .lgo'); return e?e.textContent:''; });
  ok('④ 「編集」は鉛筆マーク', /✏/.test(ed)&&/編集/.test(ed), ed);
  // ⑤ 並べ替え
  const n0=await names(); const dn=p.locator('#dbLibList .libCard').first().locator('.ldn'); if(await dn.count()) await dn.click(); await p.waitForTimeout(300); const n1=await names();
  await p.reload(); await p.waitForTimeout(900); await open(); const n2=await names();
  ok('⑤ ▼で順番が入れ替わり、読み込み直しても残る', n0.join()===SITES.join()&&n1.join()===[SITES[1],SITES[0],SITES[2]].join()&&n2.join()===n1.join(), {n0,n1,n2});
  // ⑥ 検索
  let n3=[], cnt=''; if(await p.locator('#dbLibQ').count()){ await p.fill('#dbLibQ','ビル'); await p.waitForTimeout(300); n3=await names(); cnt=await p.evaluate(()=>document.getElementById('dbLibN').textContent); await p.fill('#dbLibQ',''); await p.waitForTimeout(200); }
  ok('⑥ 検索枠で現場名をしぼれる', n3.join()===SITES[1]&&/1件／全3件/.test(cnt), {n3,cnt});
  // ①②③ タグ
  const i0=(await names()).indexOf(SITES[0]); await p.locator('#dbLibList .libCard').nth(i0).locator('.lgo').click(); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const s=document.getElementById('dbSide'); if(!s.classList.contains('closed')) document.getElementById('dbFold').click(); }); await p.waitForTimeout(400);
  const inp=p.locator('#dbGrid .tile .part').nth(1); await inp.tap(); await p.waitForTimeout(400);
  const g1=await p.evaluate(()=>{ const t=document.querySelectorAll('#dbGrid .tile')[1], pop=t&&t.querySelector('.tagpop'), i=t.querySelector('.part'); if(!pop||getComputedStyle(pop).display==='none') return {vis:false}; const P=pop.getBoundingClientRect(), I=i.getBoundingClientRect(); return {vis:true, above:P.bottom<=I.top+1, inTile:P.left>=t.getBoundingClientRect().left-1, tags:[...pop.querySelectorAll('button')].map(b=>b.textContent)}; });
  ok('① 部位をタップ → 写真の上にタグの一覧（入力欄を隠さない）', g1.vis&&g1.above&&g1.inTile&&g1.tags.includes('屋上'), g1);
  if(g1.vis) await p.evaluate(()=>{ [...document.querySelectorAll('#dbGrid .tile')[1].querySelectorAll('.tagpop button')].find(b=>b.textContent==='屋上').click(); }); await p.waitForTimeout(300);
  const g2=await p.evaluate(()=>({v:document.querySelectorAll('#dbGrid .tile .part')[1].value, n:document.getElementById('dbSaveSt').dataset.n, pop:(()=>{ const x=document.querySelector('#dbGrid .tile .tagpop'); return !!x&&getComputedStyle(x).display!=='none'; })()}));
  ok('② タグを押すと入る（保存待ち1・一覧は閉じる）', g2.v==='屋上'&&g2.n==='1'&&!g2.pop, g2);
  const w=p.locator('#dbGrid .tile .work').first(); await w.tap(); await p.waitForTimeout(300); await p.keyboard.type('独自の作業'); await p.waitForTimeout(300);
  const g3=await p.evaluate(()=>{ const t=document.querySelectorAll('#dbGrid .tile')[0], pop=t.querySelector('.tagpop'); return {v:t.querySelector('.work').value, msg:pop?pop.textContent:''}; });
  ok('③ タグに無い言葉もそのまま打てる', g3.v==='独自の作業'&&/当てはまるタグはありません/.test(g3.msg), g3);
  await p.evaluate(()=>document.activeElement.blur());
  // ⑦ 閉じたら一番上
  await p.evaluate(()=>{ document.documentElement.style.minHeight='3000px'; window.scrollTo(0,500); });
  await p.evaluate(()=>{ document.getElementById('dbBack').click(); }); await p.waitForTimeout(300); await p.evaluate(()=>{ const x=[...document.querySelectorAll('#dbAsk button')].find(b=>/保存しないで戻る/.test(b.textContent)); x&&x.click(); }); await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('dbBack').click()); await p.waitForTimeout(400);
  const sy=await p.evaluate(()=>({y:Math.round(window.scrollY), on:document.getElementById('dbv').classList.contains('on')}));
  await p.evaluate(()=>{ document.documentElement.style.minHeight=''; });
  ok('⑦ 台帳を閉じると後ろのページが一番上に戻る', !sy.on&&sy.y===0, sy);
  // ⑧ 納まり資料作成
  await p.evaluate(()=>{ window.__in=[]; const o=HTMLInputElement.prototype.click; HTMLInputElement.prototype.click=function(){ if(this.type==='file'){ window.__in.push(this.id+(this.hasAttribute('capture')?':cam':':pick')); return; } return o.call(this); }; });
  await p.locator('.nnEnCard',{hasText:'納まり'}).click(); await p.waitForTimeout(300);
  const c1=await p.evaluate(()=>{ const w=document.getElementById('osChoose'); return {vis:!!w&&getComputedStyle(w).display!=='none', b:w?[...w.querySelectorAll('button')].map(x=>x.textContent):[], inp:window.__in.slice()}; });
  if(c1.vis) await p.evaluate(()=>[...document.querySelectorAll('#osChoose button')].find(x=>/選ぶ/.test(x.textContent)).click()); await p.waitForTimeout(200);
  await p.locator('.nnEnCard',{hasText:'納まり'}).click(); await p.waitForTimeout(300);
  if(c1.vis) await p.evaluate(()=>[...document.querySelectorAll('#osChoose button')].find(x=>/カメラ/.test(x.textContent)).click()); await p.waitForTimeout(200);
  const ins=await p.evaluate(()=>window.__in);
  ok('⑧ 納まり資料作成 → 「カメラで撮る／撮影済みの写真から選ぶ」（押す前にカメラは開かない・選ぶと写真の選択／カメラ）', c1.vis&&c1.inp.length===0&&c1.b.some(t=>/カメラで撮る/.test(t))&&c1.b.some(t=>/撮影済みの写真から選ぶ/.test(t))&&ins.join()==='osPick:pick,osCam:cam', {c1,ins});
  ok('⑨ pageerror 0', errs.length===0, errs);
  await ctx.close();
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
