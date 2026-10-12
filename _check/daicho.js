/* ★2026-10-12j カメラ「写真台帳を作成」（黒板つき・§652）：
   ① 入口の「写真台帳を作成」を押すと #dbv が開いて ①現場。現場名が空のままでは進まない。ページは移動しない（前は記録帳の一覧へ飛んでいた）
   ② 現場名を入れて「カメラへ進む」→ ②撮影。写真を入れると黒板つきのプレビュー、部位・作業内容はチップで入る、「台帳に追加」が押せる
   ③ 追加 → 写真の保存（nnPhotos・nn_daicho_v1）に1件。保存した画像の右下（黒板の位置）に緑と白の画素がある。現場名・部位・作業内容が入っている
   ④ ③台帳：この現場の行が1行（No.1・部位・作業内容・令和の日付）。印刷／PDF で印刷用の行が1行できる（印刷ダイアログは出さない）
   ⑤ ①の黒板の見本（canvas）にも緑がある
   ⑥ pageerror 0
   直す前の版（入口が記録帳へ移動する）は ① が★NG。
   使い方: node _check/daicho.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,260):'')); if(!c)NG++;};
/* 検算用：黒板の場所（camera.html と同じ決まりを別に書く）。W×H の写真・右下 */
const boardRect=(W,H)=>{ const bw=Math.round(Math.min(W*.46,Math.max(W*.36,360))), bh=Math.round(bw*.68), m=Math.round(W*.02); return {x:W-bw-m,y:H-bh-m,w:bw,h:bh}; };
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,vp,mob] of [['PC',{viewport:{width:1440,height:900}},0],['スマホ',{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true},1]]){
  const p=await b.newPage(vp); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mob) await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await p.addInitScript(()=>{ try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} window.print=()=>{ window._printed=(window._printed||0)+1; }; });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  /* ① */
  const card=p.locator('.nnEnCard', {hasText:'写真台帳'});
  await card.click(); await p.waitForTimeout(500);
  const t1a=await p.evaluate(()=>({on:!!document.querySelector('#dbv.on'), s1:!!document.querySelector('#dbS1.on'), path:location.pathname}));
  await p.evaluate(()=>{ const b=document.getElementById('dbGo1'); b&&b.click(); }); await p.waitForTimeout(300);
  const t1b=await p.evaluate(()=>({s1:!!document.querySelector('#dbS1.on'), s2:!!document.querySelector('#dbS2.on')}));
  ok(nm+' ① 入口「写真台帳を作成」で #dbv が開き①現場・現場名が空なら進まない・ページは移動しない', t1a.on&&t1a.s1&&/camera/.test(t1a.path)&&t1b.s1&&!t1b.s2, {t1a,t1b});
  if(!t1a.on){ ok(nm+' ⑥ pageerror 0', errs.length===0, errs); await p.close(); continue; }
  /* ② */
  await p.fill('#dbSite','テスト現場 屋上防水'); await p.evaluate(()=>document.getElementById('dbGo1').click()); await p.waitForTimeout(300);
  const png=await p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=800; c.height=600; const g=c.getContext('2d'); g.fillStyle='#3060c0'; g.fillRect(0,0,800,600); g.fillStyle='#c0d0f0'; g.fillRect(100,100,600,400); return c.toDataURL('image/png'); });
  await p.setInputFiles('#dbCam',{name:'test.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
  let addOn=false; try{ await p.waitForFunction(()=>!document.getElementById('dbAdd').disabled,null,{timeout:8000}); addOn=true; }catch(e){}
  await p.evaluate(()=>{ const f=(el,w)=>[...el.querySelectorAll('button')].find(b=>b.dataset.w===w); f(document.getElementById('dbParts'),'バルコニー').click(); f(document.getElementById('dbWorks'),'補強メッシュ貼り付け').click(); });
  const t2=await p.evaluate(()=>({s2:!!document.querySelector('#dbS2.on'), part:document.getElementById('dbPart').value, work:document.getElementById('dbWork').value, add:!document.getElementById('dbAdd').disabled,
    prevW:document.getElementById('dbCv2').width, prevH:document.getElementById('dbCv2').height}));
  ok(nm+' ② 現場名を入れて進む→②撮影・写真を入れると黒板つきのプレビュー（800×600）・チップで部位と作業内容・「台帳に追加」が押せる', addOn&&t2.s2&&t2.part==='バルコニー'&&t2.work==='補強メッシュ貼り付け'&&t2.add&&t2.prevW===800&&t2.prevH===600, t2);
  /* ③ */
  await p.evaluate(()=>document.getElementById('dbAdd').click());
  try{ await p.waitForFunction(()=>document.getElementById('dbCnt').textContent==='1枚',null,{timeout:8000}); }catch(e){}
  const t3=await p.evaluate(async()=>{ const m=await nnPhotos.load('nn_daicho_v1'); const ids=Object.keys(m||{}).filter(id=>m[id].site==='テスト現場 屋上防水'); if(ids.length!==1) return {n:ids.length};
    const v=m[ids[0]]; const im=new Image(); await new Promise(r=>{ im.onload=r; im.src=v.d; }); return {n:1, id:ids[0], w:im.width, h:im.height, site:v.site, part:v.part, work:v.work, kind:v.kind, date:v.date}; }).catch(e=>({err:String(e)}));
  /* 黒板の場所は Node 側で検算して数値で渡す */
  const t3b=t3.n===1?await p.evaluate(async([id,R])=>{ const m=await nnPhotos.load('nn_daicho_v1'); const v=m[id]; const im=new Image(); await new Promise(r=>{ im.onload=r; im.src=v.d; });
    const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const g=c.getContext('2d'); g.drawImage(im,0,0); const d=g.getImageData(R.x,R.y,R.w,R.h).data; let green=0, white=0, tot=R.w*R.h;
    for(let i=0;i<d.length;i+=4){ const r=d[i],gg=d[i+1],b=d[i+2]; if(gg>r+40&&gg>b+20) green++; if(r>200&&gg>200&&b>200) white++; } const out=g.getImageData(10,10,1,1).data;
    return {green:+(green/tot).toFixed(2), white:+(white/tot).toFixed(3), outside:[out[0],out[1],out[2]]}; },[t3.id,boardRect(800,600)]):{};
  ok(nm+' ③ 追加で保存に1件・右下の黒板の場所は緑が6割以上＋白の文字がある・黒板の外は元の写真の色・現場名／部位／作業内容が入っている',
    t3.n===1&&t3.w===800&&t3.h===600&&t3b.green>=0.6&&t3b.white>=0.01&&t3b.outside[2]>150&&t3b.outside[1]<120&&t3.site==='テスト現場 屋上防水'&&t3.part==='バルコニー'&&t3.work==='補強メッシュ貼り付け'&&t3.kind==='防水工事', Object.assign({},t3,t3b));
  /* ④ */
  await p.evaluate(()=>document.getElementById('dbToList2').click()); await p.waitForTimeout(400);
  const t4a=await p.evaluate(()=>{ const rows=[...document.querySelectorAll('#dbList .it')]; return {s3:!!document.querySelector('#dbS3.on'), n:rows.length, txt:rows.map(r=>r.querySelector('.tx').textContent).join('|'), sel:document.getElementById('dbSiteSel').value}; });
  await p.evaluate(()=>document.getElementById('dbPrintBtn').click()); await p.waitForTimeout(400);
  const t4b=await p.evaluate(()=>({rows:document.querySelectorAll('#dbPrint .r').length, pages:document.querySelectorAll('#dbPrint .pg').length, printed:window._printed||0, h1:(document.querySelector('#dbPrint h1')||{}).textContent}));
  const y=new Date().getFullYear(), rw='令和'+(y-2018)+'年';
  ok(nm+' ④ ③台帳にこの現場の行が1行（No.1・部位・作業内容・令和の日付）・印刷／PDF で印刷用の行が1行・1ページ', t4a.s3&&t4a.n===1&&/No\.1/.test(t4a.txt)&&/バルコニー/.test(t4a.txt)&&/補強メッシュ/.test(t4a.txt)&&t4a.txt.includes(rw)&&t4a.sel==='テスト現場 屋上防水'&&t4b.rows===1&&t4b.pages===1&&t4b.printed===1&&/テスト現場/.test(t4b.h1||''), {t4a,t4b});
  /* ⑤ */
  const t5=await p.evaluate((R)=>{ const c=document.getElementById('dbCv1'), g=c.getContext('2d'), d=g.getImageData(R.x,R.y,R.w,R.h).data; let green=0, tot=R.w*R.h; for(let i=0;i<d.length;i+=4){ if(d[i+1]>d[i]+40&&d[i+1]>d[i+2]+20) green++; } return {w:c.width,h:c.height,green:+(green/tot).toFixed(2)}; }, boardRect(640,480));
  ok(nm+' ⑤ ①の黒板の見本にも黒板（緑）が描かれている', t5.w===640&&t5.h===480&&t5.green>=0.6, t5);
  /* 後片付け：テストの写真と覚えた設定を消す */
  if(t3.id) await p.evaluate(async(id)=>{ await nnPhotos.del('nn_daicho_v1',[id]); try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} },t3.id);
  ok(nm+' ⑥ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }finally{ await b.close(); }
 console.log(NG?'★NG '+NG+'件':'全部○'); process.exit(NG?1:0); })();
