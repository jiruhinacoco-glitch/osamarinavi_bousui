/* ★§689 写真台帳：「新しく作る」と「作成済み」のすみわけ（本人「すみわけが必要」「写真選択ではなく＋写真追加に」）。スマホ縦(幅360)・スマホ横・PC で：
   ① 作成済み（写真の入った現場）があると、開いたときにまず一覧：「＋ 新しい写真台帳を作る」と、現場ごとのカードが新しい順（現場名なしも1枚）
   ② カードを押すとその現場の台帳が開く（現場名の欄・写真の枚数が合う）
   ③ 台帳の「戻る」で一覧へ・一覧の「戻る」でカメラの入口へ
   ④ 「新しい写真台帳を作る」：現場名が空・写真0枚・現場名の欄に入力の印（フォーカス）
   ⑤ 作成済みが1件も無いときは一覧を出さずに作成画面（いままでどおり）
   ⑥ 写真を入れるボタンの文字が「＋写真追加」（上の帯・設定の欄・写真が無いときの大きなボタン）
   ⑦ スマホ縦は上の帯のボタンが画面からはみ出さない
   ⑧ pageerror 0
   直す前の版では ①〜④・⑥・⑦（幅360）が★NG。  使い方: node _check/daicho_ichiran.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const SITES=['〇〇マンション 屋上防水改修工事','△△ビル 外壁改修',''];
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,o] of [['スマホ縦',{viewport:{width:360,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['スマホ横',{viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['PC',{viewport:{width:1600,height:900}}]]){
  const p=await b.newPage(o); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(nm!=='PC') await p.addInitScript(([w,h])=>{ Object.defineProperty(screen,'width',{get:()=>w}); Object.defineProperty(screen,'height',{get:()=>h}); localStorage.setItem('nn_view_mode','mobile'); },[o.viewport.width,o.viewport.height]);
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1000);
  const open=async()=>{ await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(900); };
  const vis=s=>p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'; },s);
  // ⑤ 空のとき
  await open();
  ok(nm+' ⑤ 作成済みが無いときは作成画面（一覧なし・現場名の欄が見える）', !(await vis('#dbLibNew'))&&await vis('#dbSite'));
  const lab=await p.evaluate(()=>['dbPickH','dbPick','dbLsPick'].map(i=>{ const e=document.getElementById(i); return e?e.textContent.trim():null; }));
  ok(nm+' ⑥ 文字が「＋写真追加」', lab.every(t=>t==='＋写真追加'), lab);
  if(nm==='スマホ縦'){ const w=await p.evaluate(()=>{ const cw=document.documentElement.clientWidth; return ['dbShootH','dbPickH','dbTtl'].map(i=>{ const r=document.getElementById(i).getBoundingClientRect(); return [i,Math.round(r.left),Math.round(r.right)]; }).concat([['cw',cw]]); });
    const cw=w[3][1]; ok(nm+' ⑦ 上の帯のボタンが画面からはみ出さない', w.slice(0,3).every(a=>a[1]>=0&&a[2]<=cw), w); }
  await p.evaluate(()=>{ document.getElementById('dbBack').click(); });
  // 写真を入れる（新しいほど t が大きい）
  await p.evaluate(async(SITES)=>{ const c=document.createElement('canvas'); c.width=120;c.height=90; const g=c.getContext('2d'); const now=Date.now();
    const L=[[0,0],[1,1],[0,2],[2,3],[1,4]];   // [現場, 何日前]
    for(let i=0;i<L.length;i++){ g.fillStyle='#'+(i*2+3)+'8a'; g.fillRect(0,0,120,90); const v={raw:1,d:c.toDataURL('image/jpeg'),t:now-L[i][1]*86400000,site:SITES[L[i][0]],kind:'防水工事',date:'2026-10-10',era:'wareki',part:'',work:'',w:120,h:90}; await nnPhotos.put('nn_daicho_v1','q'+i,v); const m=await nnPhotos.load('nn_daicho_v1'); if(m) m['q'+i]=v; } },SITES);   // 読み出しは1回目の結果を使い回すので、そちらにも入れる（ページの中で写真を入れたときと同じ）
  await open();
  const L1=await p.evaluate(()=>[...document.querySelectorAll('#dbLibList .libCard')].map(c=>({s:c.querySelector('b').textContent,n:c.querySelector('small').textContent,img:!!(c.querySelector('img')&&c.querySelector('img').getAttribute('src')),v:c.getBoundingClientRect().height>0})));
  ok(nm+' ① 開くとまず一覧：新しく作る＋カード3枚（新しい順）・作成画面は隠れる', await vis('#dbLibNew')&&!(await vis('#dbSide'))&&L1.length===3&&L1.every(c=>c.v&&c.img)&&L1.map(c=>c.s).join('|')===[SITES[0],SITES[1],'現場名なし'].join('|')&&/2枚/.test(L1[0].n)&&/2枚/.test(L1[1].n)&&/1枚/.test(L1[2].n), L1);
  // ② 2枚目のカード
  if(L1.length>1) await p.locator('#dbLibList .libCard').nth(1).click(); await p.waitForTimeout(700);
  const g2=await p.evaluate(()=>({site:document.getElementById('dbSite').value, tiles:document.querySelectorAll('#dbGrid .tile').length, lib:document.getElementById('dbv').classList.contains('lib')}));
  ok(nm+' ② カードを押すとその現場の台帳（現場名・写真2枚）', !g2.lib&&g2.site===SITES[1]&&g2.tiles===2&&await vis('#dbGrid .tile'), g2);
  // ③ 戻る
  await p.evaluate(()=>document.getElementById('dbBack').click()); await p.waitForTimeout(400);
  const b1=await vis('#dbLibNew'), on1=await p.evaluate(()=>document.getElementById('dbv').classList.contains('on'));
  await p.evaluate(()=>document.getElementById('dbBack').click()); await p.waitForTimeout(400);
  const on2=await p.evaluate(()=>document.getElementById('dbv').classList.contains('on'));
  ok(nm+' ③ 台帳の戻る→一覧／一覧の戻る→入口', b1&&on1&&!on2, {b1,on1,on2});
  // ④ 新しく作る
  await open(); if(await vis('#dbLibNew')) await p.locator('#dbLibNew').click(); await p.waitForTimeout(600);
  const g4=await p.evaluate(()=>({site:document.getElementById('dbSite').value, tiles:document.querySelectorAll('#dbGrid .tile').length, foc:document.activeElement&&document.activeElement.id, lib:document.getElementById('dbv').classList.contains('lib')}));
  ok(nm+' ④ 新しく作る：現場名が空・写真0枚・現場名の欄に入力の印', !g4.lib&&g4.site===''&&g4.tiles===0&&g4.foc==='dbSite'&&await vis('#dbSite'), g4);
  ok(nm+' ⑧ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
