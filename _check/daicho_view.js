/* ★2026-10-13ze 写真台帳：一覧の見やすさ・大きく見る画面（拡大）・トリミング（§671・本人の4つの指摘）
   縦（393×852）と横（852×393）の両方で、縦長と横長の写真をまぜて6枚入れて測る：
   ① 一覧の写真の枠は全部同じ横長（4:3）＝縦の写真も枠の中に全体（表示の幅÷高さが 1.30〜1.37）
   ② 横画面：札は横に4枚以上並び、6枚がスクロールなしで右の列に収まる・入力欄の代わりに1行の見出し文（部位／作業内容）
   ③ 大きく見る：写真を押すと開く・写真の上を押しても閉じない・2回タップで拡大（2倍以上）→もう一度2回タップで元に・指2本で広げると拡大・ホイールで拡大・「✕ 閉じる」で閉じる
   ④ ◀ ▶ で前後の写真（No. が変わる）・端では押せない
   ⑤ 大きく見る画面の部位を直すと、一覧の札と保存に入る
   ⑥ トリミング（出来上がりを測る）：縦長の写真で「✂ トリミング」→ 最初は横4:3の枠（選ばれている）→ 右下のすみを引くと枠が変わる（4:3 のまま）→ 決定 →
      保存に crop が入り、一覧の絵・印刷／送る用の黒板つきの絵が 4:3 になる。もう一度開いて「元に戻す」→決定 で crop が消え、元の縦長に戻る
   ⑦ pageerror 0
   直す前の版では ①〜⑥ が★NG。
   使い方: node _check/daicho_view.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,300):'')); if(!c)NG++;};
const SITE='見る検査';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [W,H,nm] of [[393,852,'縦'],[852,393,'横']]){
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([W,H])=>{try{Object.defineProperty(screen,'width',{get:()=>W});Object.defineProperty(screen,'height',{get:()=>H});localStorage.setItem('nn_view_mode','mobile');localStorage.removeItem('nn_daicho_pref_v1');}catch(e){} window.confirm=()=>true;},[W,H]);
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
  await p.evaluate(async(SITE)=>{ if(!window.nnPhotos) return; const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(800);
  const mk=async(col,w,h)=>{ const d=await p.evaluate(([col,w,h])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,w,h);return c.toDataURL('image/png');},[col,w,h]); return {name:'a.png',mimeType:'image/png',buffer:Buffer.from(d.split(',')[1],'base64')}; };
  await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(400);
  await p.setInputFiles('#dbPickIn',[await mk('#c84',800,600),await mk('#48c',600,800),await mk('#8a4',800,600),await mk('#a6c',600,800),await mk('#4aa',800,600),await mk('#a44',600,800)]);
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length>=6,null,{timeout:15000}); }catch(e){} await p.waitForTimeout(1000);
  await p.evaluate(()=>document.activeElement&&document.activeElement.blur()); await p.waitForTimeout(300);
  /* ① */
  const t1=await p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile canvas')].map(c=>{ const r=c.getBoundingClientRect(); return +(r.width/r.height).toFixed(2); }));
  ok(nm+' ① 一覧の写真の枠は全部 4:3（縦の写真も）', t1.length===6&&t1.every(x=>x>=1.30&&x<=1.37), t1);
  /* ② 横だけ */
  if(nm==='横'){ const t2=await p.evaluate(()=>{ const tiles=[...document.querySelectorAll('#dbGrid .tile')], m=document.getElementById('dbMain').getBoundingClientRect(); const tops=tiles.map(t=>Math.round(t.getBoundingClientRect().top)); const perRow=tops.filter(t=>t===tops[0]).length;
      return {perRow, fit:tiles.every(t=>t.getBoundingClientRect().bottom<=m.bottom+1), cap:getComputedStyle(tiles[0].querySelector('.cap')).display, part:getComputedStyle(tiles[0].querySelector('.part')).display, capTxt:tiles[0].querySelector('.cap').textContent}; });
    ok(nm+' ② 横画面：札は横に4枚以上・6枚がスクロールなしで収まる・入力欄の代わりに見出し文', t2.perRow>=4&&t2.fit&&t2.cap!=='none'&&t2.part==='none', t2); }
  /* ③ */
  await p.click('#dbGrid .tile:nth-child(2) canvas'); await p.waitForTimeout(700);
  const st=async()=>p.evaluate(()=>{ const v=document.getElementById('dbView'), cv=document.getElementById('dbViewCv'); const m=/scale\(([\d.]+)\)/.exec(cv.style.transform||''); return {on:!!v&&v.classList.contains('on'), z:m?+m[1]:1, no:(document.getElementById('dbViewNo')||{}).textContent}; });
  const s0=await st(); const box=await p.evaluate(()=>{ const r=document.getElementById('dbViewCv').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
  await p.mouse.click(box.x,box.y); await p.waitForTimeout(400); const s1=await st();
  await p.waitForTimeout(400); await p.mouse.click(box.x,box.y); await p.waitForTimeout(80); await p.mouse.click(box.x,box.y); await p.waitForTimeout(400); const s2=await st();
  await p.mouse.click(box.x,box.y); await p.waitForTimeout(80); await p.mouse.click(box.x,box.y); await p.waitForTimeout(400); const s3=await st();
  /* 指2本で広げる（CDP のタッチ） */
  const cdp=await p.context().newCDPSession(p); const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((q,i)=>({x:q[0],y:q[1],id:i}))});
  await T('touchStart',[[box.x-30,box.y],[box.x+30,box.y]]); for(let k=1;k<=6;k++){ await T('touchMove',[[box.x-30-k*15,box.y],[box.x+30+k*15,box.y]]); } await T('touchEnd',[]); await p.waitForTimeout(400); const s4=await st();
  await p.mouse.click(box.x,box.y); await p.waitForTimeout(80); await p.mouse.click(box.x,box.y); await p.waitForTimeout(400);   /* 元に */
  await p.mouse.move(box.x,box.y); await p.mouse.wheel(0,-300); await p.waitForTimeout(300); const s5=await st();
  ok(nm+' ③ 大きく見る：開く・写真を押しても閉じない・2回タップで拡大→元に・指2本で拡大・ホイールで拡大', s0.on&&s1.on&&s1.z===1&&s2.z>=2&&s3.z===1&&s4.z>=1.5&&s5.z>1, {s0,s1,s2,s3,s4,s5});
  /* ④ */
  await p.mouse.click(box.x,box.y); await p.waitForTimeout(80); await p.mouse.click(box.x,box.y); await p.waitForTimeout(300);
  await p.click('#dbVNext'); await p.waitForTimeout(500); const n1=await st(); await p.click('#dbVPrev'); await p.waitForTimeout(300); await p.click('#dbVPrev'); await p.waitForTimeout(500); const n0=await st();
  const pd=await p.evaluate(()=>document.getElementById('dbVPrev').disabled);
  ok(nm+' ④ ◀ ▶ で前後の写真・最初の写真では ◀ が押せない', /^No\.3/.test(n1.no)&&/^No\.1/.test(n0.no)&&pd, {n1:n1.no,n0:n0.no,pd});
  /* ⑤ */
  await p.fill('#dbVPart','テスト部位'); await p.locator('#dbVPart').dispatchEvent('change'); await p.waitForTimeout(500);
  const t5=await p.evaluate(async(SITE)=>{ const t=document.querySelector('#dbGrid .tile'); const m=await nnPhotos.load('nn_daicho_v1'); const v=m[t.dataset.id]; return {cap:t.querySelector('.cap').textContent, inp:t.querySelector('.part').value, saved:v&&v.part}; },SITE);
  ok(nm+' ⑤ 大きく見る画面で部位を直すと一覧の札と保存に入る', t5.cap.includes('テスト部位')&&t5.inp==='テスト部位'&&t5.saved==='テスト部位', t5);
  /* ⑥ トリミング：2枚目（縦長 600×800） */
  await p.click('#dbVNext'); await p.waitForTimeout(500);
  await p.click('#dbVCrop'); await p.waitForTimeout(700);
  const c0=await p.evaluate(()=>{ const bx=document.getElementById('dbVBox').getBoundingClientRect(), on=document.querySelector('#dbVCropBar [data-a].on'); return {r:+(bx.width/bx.height).toFixed(2), w:Math.round(bx.width), on:on?on.dataset.a:'', x:bx.right, y:bx.bottom}; });
  await p.mouse.move(c0.x-4,c0.y-4); await p.mouse.down(); await p.mouse.move(c0.x-60,c0.y-60,{steps:6}); await p.mouse.up(); await p.waitForTimeout(300);
  const c1=await p.evaluate(()=>{ const bx=document.getElementById('dbVBox').getBoundingClientRect(); return {r:+(bx.width/bx.height).toFixed(2), w:Math.round(bx.width)}; });
  await p.click('#dbVCropOk'); await p.waitForTimeout(800);
  const c2=await p.evaluate(async()=>{ const t=document.querySelectorAll('#dbGrid .tile')[1]; const id=t.dataset.id; const m=await nnPhotos.load('nn_daicho_v1'); const c=t.querySelector('canvas'); const big=document.getElementById('dbViewCv');
    return {crop:m[id]&&m[id].crop, tile:+(c.width/c.height).toFixed(2), view:+(big.width/big.height).toFixed(2)}; });
  /* 印刷・送る用の絵（黒板つき）も 4:3：印刷の1ページ目の2枚目の写真の場所の縦横を測るのは重いので、送る用の絵を作る処理と同じ compositeTo を通った大きな画面の絵で見る */
  await p.click('#dbVCrop'); await p.waitForTimeout(600); await p.click('#dbVCropReset'); await p.waitForTimeout(200); await p.click('#dbVCropOk'); await p.waitForTimeout(800);
  const c3=await p.evaluate(async()=>{ const t=document.querySelectorAll('#dbGrid .tile')[1]; const id=t.dataset.id; const m=await nnPhotos.load('nn_daicho_v1'); const c=t.querySelector('canvas'); return {crop:m[id]&&m[id].crop||null, tile:+(c.width/c.height).toFixed(2)}; });
  ok(nm+' ⑥ トリミング：縦長は最初から横4:3の枠・すみを引くと 4:3 のまま小さく・決定で保存と一覧・黒板つきの絵が 4:3・元に戻すで縦長に', Math.abs(c0.r-1.33)<0.03&&Math.abs(+c0.on-1.3333)<0.01&&c1.w<c0.w-20&&Math.abs(c1.r-1.33)<0.03&&!!c2.crop&&Math.abs(c2.tile-1.33)<0.03&&Math.abs(c2.view-1.33)<0.03&&c3.crop===null&&Math.abs(c3.tile-0.75)<0.02, {c0,c1,c2,c3});
  await p.click('#dbViewX'); await p.waitForTimeout(300); const cl=await st();
  ok(nm+' ⑦ 「✕ 閉じる」で閉じる・pageerror 0', !cl.on&&errs.length===0, {on:cl.on,errs});
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  await p.close(); } }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,240)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
