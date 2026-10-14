/* ★§690 写真台帳：「全部選ぶ・◯枚選択・選んだ写真を削除」をタグ（部位・作業内容・まとめて付ける）の枠から分ける（本人「なんでタグ選択の枠の中にあるの？分離すべき」）。スマホ縦・スマホ横・PC で：
   ① 3つ（全部選ぶ・◯枚選択・選んだ写真を削除）はタグの枠（#dbBatch）の外・同じ帯の中
   ② その帯は写真の一覧のすぐ上（帯の下 ≦ 1枚目の写真の上）で、スマホ縦では「現場登録」の枠（#dbSide）の外
   ③ 帯は1行（3つの縦の真ん中が ±4px）で画面からはみ出さない
   ④ 全部選ぶ → 「2枚 選択」・削除が押せる／写真0枚のときは帯を出さない
   ⑤ pageerror 0
   直す前の版では ①②が★NG。  使い方: node _check/daicho_selbar.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,o] of [['スマホ縦',{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['スマホ横',{viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['PC',{viewport:{width:1600,height:900}}]]){
  const p=await b.newPage(o); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(nm!=='PC') await p.addInitScript(([w,h])=>{ Object.defineProperty(screen,'width',{get:()=>w}); Object.defineProperty(screen,'height',{get:()=>h}); localStorage.setItem('nn_view_mode','mobile'); },[o.viewport.width,o.viewport.height]);
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1000);
  // 写真0枚
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(900);
  const empty=await p.evaluate(()=>{ const a=document.getElementById('dbAll'); return !!a&&a.getBoundingClientRect().height>0; });
  await p.evaluate(()=>document.getElementById('dbBack').click());
  await p.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=120;c.height=90; const g=c.getContext('2d'); const m=await nnPhotos.load('nn_daicho_v1');
    for(let i=0;i<2;i++){ g.fillStyle=i?'#8a6':'#a86'; g.fillRect(0,0,120,90); const v={raw:1,d:c.toDataURL('image/jpeg'),t:Date.now()-i*1000,site:'テスト現場',kind:'防水工事',date:'2026-10-10',era:'wareki',part:'',work:'',w:120,h:90}; await nnPhotos.put('nn_daicho_v1','s'+i,v); if(m) m['s'+i]=v; } });
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(900);
  if(await p.locator('#dbLibList .libCard').count()) { await p.locator('#dbLibList .libCard').first().click(); await p.waitForTimeout(800); }
  else await p.evaluate(()=>{ const s=document.getElementById('dbSite'); s.value='テスト現場'; s.dispatchEvent(new Event('input')); }), await p.waitForTimeout(800);
  const g=await p.evaluate(()=>{ const q=i=>document.getElementById(i), R=e=>{ const r=e.getBoundingClientRect(); return {t:r.top,b:r.bottom,l:r.left,r:r.right,m:r.top+r.height/2}; };
    const els=[q('dbAll').closest('label'),q('dbSelN'),q('dbDelSel')], bt=q('dbBatch'), side=q('dbSide'), t1=document.querySelector('#dbGrid .tile');
    const par=els.map(e=>e.parentNode), bar=par[0];
    return {inBatch:els.map(e=>bt.contains(e)), same:par.every(x=>x===par[1]), inSide:side.contains(bar), barB:R(bar).b, t1T:t1&&R(t1).t, ms:els.map(e=>Math.round(R(e).m)), rr:Math.round(Math.max(...els.map(e=>R(e).r))), cw:document.documentElement.clientWidth, vis:els.every(e=>e.getBoundingClientRect().height>0)}; });
  ok(nm+' ① 全部選ぶ・◯枚選択・削除はタグの枠の外・同じ帯', g.inBatch.every(x=>!x)&&g.same, g);
  ok(nm+' ② 帯は写真の一覧のすぐ上'+(nm==='スマホ縦'?'・現場登録の枠の外':''), g.t1T!=null&&g.barB<=g.t1T+0.5&&g.t1T-g.barB<=20&&(nm!=='スマホ縦'||!g.inSide), {barB:g.barB,t1T:g.t1T,inSide:g.inSide});
  ok(nm+' ③ 帯は1行・はみ出さない', g.vis&&Math.max(...g.ms)-Math.min(...g.ms)<=4&&g.rr<=g.cw, {ms:g.ms,rr:g.rr,cw:g.cw});
  await p.evaluate(()=>{ const a=document.getElementById('dbAll'); if(!a.checked) a.click(); }); await p.waitForTimeout(300);
  const s=await p.evaluate(()=>({n:document.getElementById('dbSelN').textContent, del:!document.getElementById('dbDelSel').disabled}));
  ok(nm+' ④ 全部選ぶ→2枚 選択・削除が押せる／0枚のときは帯なし', /2枚/.test(s.n)&&s.del&&!empty, {s,empty});
  ok(nm+' ⑤ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
