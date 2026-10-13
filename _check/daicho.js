/* ★2026-10-12j カメラ「写真台帳を作成」（黒板つき・§652）→ ★2026-10-12k 1画面に作り直し（§653）：
   ① 入口の「写真台帳を作成」を押すと #dbv が開く（1画面：左に設定・右に写真）。現場名が空のまま写真を入れようとすると断る。ページは移動しない
   ② 現場名を入れて写真を2枚いっぺんに入れる（file input・複数）→ 2枚のカード（No.1・No.2）・保存（nnPhotos・nn_daicho_v1）にも2件・黒板は焼き込まない（raw）
   ③ 全部選んで「まとめて付ける」→ 2枚とも部位・作業内容が入る（保存も）。1枚目のカードの欄を直すとその1枚だけ変わる
   ④ 黒板つきの絵：既定（緑・右下・42%）で右下に緑 6割以上＋白の文字・黒板の外は元の写真の色。色を黒に・大きさ 60% に変えると、黒板の場所が暗くなり幅が広がる（全部の写真に反映）
   ⑤ ドラッグ＆ドロップ（drop イベント・ファイル1枚）で1枚増える
   ⑥ 印刷／PDF：印刷用に3枚（1ページ）・表は潰れていない（印刷の見た目で表の幅が 40mm 以上・「作業内容」の欄が1〜2行）
   ⑦ pageerror 0
   ⑧ iPhone の HEIC（§656）
   ⑭ 写真を入れると見本の欄にその写真が出る（§662）
   ⑬ 見出しの文字が平行四辺形の内側（§661）
   ⑫ 現場記録帳と同じ見た目（§660）：箱・札・入力欄・見出しの平行四辺形
   ⑪ 入力欄の上下の余白（§659）：高さ 28px 以下・文字16px
   ⑩ スマホ（§658）：撮影・写真を選ぶは右上・ドラッグ用の欄と案内の箱なし・縦スクロールは1本
   ⑨ 見やすさ（§657）：戻るは丸い絵・閉じるなし・「設定をたたむ」の文字なし・0枚では一括の箱なし・日付欄が収まる・下のボタン1行：.heic を選べる・変換部品が読み込まれる・壊れた HEIC は理由を知らせる
   直す前の版（入口が記録帳へ移動する／3画面）は ① が★NG。
   使い方: node _check/daicho.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,280):'')); if(!c)NG++;};
/* 検算用：黒板の場所（camera.html と同じ決まりを別に書く）。W×H の写真・右下・size％ */
const boardRect=(W,H,size)=>{ const bw=Math.round(W*size/100), bh=Math.round(bw*.68), m=Math.round(W*.02); return {x:W-bw-m,y:H-bh-m,w:bw,h:bh}; };
const SITE='テスト現場 屋上防水';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,vp,mob] of [['PC',{viewport:{width:1440,height:900}},0],['スマホ',{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true},1]]){
  const p=await b.newPage(vp); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mob) await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await p.addInitScript(()=>{ try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} window.print=()=>{ window._printed=(window._printed||0)+1; }; window.confirm=()=>true; });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  /* 前回の残り（試験の現場）を消しておく */
  await p.evaluate(async(SITE)=>{ if(!window.nnPhotos) return; const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  const mk=(w,h,col)=>p.evaluate(([w,h,col])=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,w,h); g.fillStyle='#c0d0f0'; g.fillRect(w*.12,h*.15,w*.76,h*.7); return c.toDataURL('image/png'); },[w,h,col]);
  const file=async(name,w,h,col)=>({name,mimeType:'image/png',buffer:Buffer.from((await mk(w,h,col)).split(',')[1],'base64')});
  /* ① */
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600);
  const t1a=await p.evaluate(()=>({on:!!document.querySelector('#dbv.on'), side:!!document.getElementById('dbSite'), grid:!!document.getElementById('dbGrid'), path:location.pathname, site:document.getElementById('dbSite').value}));
  /* ★2026-10-13u（§661）現場名が空でも写真は入る（本人「現場名を入れないと撮影・選択が反映されない」）。あとで入れた現場名へ移る */
  await p.setInputFiles('#dbPickIn',[await file('a.png',800,600,'#3060c0')]);
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===1,null,{timeout:8000}); }catch(e){}
  const t1b=await p.evaluate(()=>({tiles:document.querySelectorAll('#dbGrid .tile').length}));
  /* ⑭ ★2026-10-13v（§662）写真を入れたら、見本の欄にその写真（黒板つき）が出る（本人「選択・撮影しても見本欄に反映されない」）。
     入れた写真は 外側 #3060c0・真ん中 #c0d0f0。見本の欄の真ん中の色が写真の真ん中の色（水色）になっているか */
  try{ await p.waitForFunction(()=>/最新の写真/.test((document.getElementById('dbPh')||{}).textContent||''),null,{timeout:5000}); }catch(e){}
  const t14=await p.evaluate(()=>{ const c=document.getElementById('dbCv1'); const d=[...c.getContext('2d').getImageData(Math.round(c.width*.3),Math.round(c.height*.4),1,1).data].slice(0,3); return {px:d, ph:(document.getElementById('dbPh')||{}).textContent||''}; });
  ok(nm+' ⑭ 写真を入れると見本の欄にその写真が出る（色が写真の真ん中の水色・「最新の写真」の表示）', Math.abs(t14.px[0]-192)<20&&Math.abs(t14.px[1]-208)<20&&Math.abs(t14.px[2]-240)<20&&/最新の写真/.test(t14.ph), t14);
  if(t1a.on){ await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(700); }
  const t1c=await p.evaluate(async(SITE)=>{ const m=window.nnPhotos?await nnPhotos.load('nn_daicho_v1'):{}; const ks=Object.keys(m||{}).filter(k=>m[k].site===SITE); return {tiles:document.querySelectorAll('#dbGrid .tile').length, saved:ks.length, empty:Object.keys(m||{}).filter(k=>m[k].site==='').length}; },SITE);
  ok(nm+' ① 入口で #dbv（1画面）が開く・ページは移動しない・現場名が空でも写真が入り、あとで入れた現場名へ移る（保存も）', t1a.on&&t1a.side&&t1a.grid&&/camera/.test(t1a.path)&&t1a.site===''&&t1b.tiles===1&&t1c.tiles===1&&t1c.saved===1&&t1c.empty===0, {t1a,t1b,t1c});
  /* あとの検査の枚数を変えないよう、この1枚は消しておく */
  if(t1c.tiles){ await p.evaluate(()=>document.querySelector('#dbGrid .tile .del').click()); await p.waitForTimeout(500); }
  if(!t1a.on){ ok(nm+' ⑦ pageerror 0', errs.length===0, errs); await p.close(); continue; }
  /* ⑨ ★2026-10-12q 見やすさ（本人の iPhone 画面）：戻るは丸い絵・「閉じる」なし・たたむ札に「設定をたたむ」の文字なし・写真0枚では「まとめて付ける」の箱を出さない・下の帯のボタンは1行 */
  const t9=await p.evaluate(()=>{ const q=id=>document.getElementById(id); const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
    const lh=[...document.querySelectorAll('#dbv .dbf button')].map(x=>{ const cs=getComputedStyle(x); return Math.round(x.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom))<=parseFloat(cs.lineHeight||'20')*1.3+2; });
    return {img:!!q('dbBack').querySelector('img[src*="btn_back"]'), close:vis(q('dbClose')), fold:q('dbFold').textContent, batch:vis(q('dbBatch')), lh, date:Math.round(q('dbDate').getBoundingClientRect().right-q('dbSide').getBoundingClientRect().right)}; });
  ok(nm+' ⑨ 戻るは絵・閉じるなし・「設定をたたむ」の文字なし・0枚では一括の箱なし・日付欄が左の欄に収まる・下のボタン1行', t9.img&&!t9.close&&!/設定を/.test(t9.fold)&&!t9.batch&&t9.date<=0&&(!mob||t9.lh.every(Boolean)), t9);
  /* ⑩ ★2026-10-12r スマホ：撮影・写真を選ぶは右上（見出しの帯）・ドラッグ用の欄と案内の箱は出さない・上下2段（別々のスクロール）にしない */
  if(mob){ const t10=await p.evaluate(()=>{ const q=id=>document.getElementById(id); const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0; const cw=document.documentElement.clientWidth;
      const hb=['dbShootH','dbPickH'].map(id=>{ const e=q(id); if(!vis(e)) return null; const r=e.getBoundingClientRect(); return {top:Math.round(r.top),right:Math.round(r.right)}; });
      const sc=['dbSide','dbMain','dbw'].map(id=>{ const e=id==='dbw'?document.querySelector('#dbv .dbw'):q(id); return /auto|scroll/.test(getComputedStyle(e).overflowY); });
      return {hb,cw,tools:vis(document.querySelector('#dbv .tools')),empty:vis(q('dbEmpty')),sc}; });
    let picked=0; p.once('filechooser',()=>picked++); await p.evaluate(()=>{ const i=document.getElementById('dbPickIn'); i.addEventListener('click',()=>{ window._pk=1; },{once:true}); const hb=document.getElementById('dbPickH'); if(hb) hb.click(); }); const pk=await p.evaluate(()=>window._pk||0);
    ok(nm+' ⑩ 撮影・写真を選ぶが右上・ドラッグ用の欄と案内の箱なし・縦スクロールは1本・右上の「写真を選ぶ」で写真の選択が開く', t10.hb.every(h=>h&&h.top<80&&h.right>t10.cw/2)&&!t10.tools&&!t10.empty&&t10.sc.filter(Boolean).length===1&&pk===1, {t10,pk}); }
  /* ② */
  await p.fill('#dbSite',SITE); await p.waitForTimeout(400);
  await p.setInputFiles('#dbPickIn',[await file('a.png',800,600,'#3060c0'),await file('b.png',800,600,'#3060c0')]);
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===2,null,{timeout:10000}); }catch(e){}
  await p.waitForTimeout(500);
  const t2=await p.evaluate(async(SITE)=>{ const tiles=[...document.querySelectorAll('#dbGrid .tile')]; const m=await nnPhotos.load('nn_daicho_v1'); const ids=Object.keys(m).filter(k=>m[k].site===SITE);
    return {tiles:tiles.length, nos:tiles.map(t=>t.querySelector('.no').textContent).join(','), saved:ids.length, raw:ids.every(k=>m[k].raw===1), w:ids.map(k=>m[k].w).join(','), count:document.getElementById('dbCount').textContent}; },SITE);
  ok(nm+' ② 現場名を入れて写真を2枚いっぺんに → カード2枚（No.1・No.2）・保存に2件・黒板は焼き込まない（raw）', t2.tiles===2&&t2.nos==='No.1,No.2'&&t2.saved===2&&t2.raw&&t2.w==='800,800'&&/2枚/.test(t2.count), t2);
  /* ⑪ ★2026-10-12s 入力欄の上下の余白を詰める（本人「余白は悪」）：写真を入れたあとの「部位」「作業内容」（まとめて付ける・カード）は高さ 28px 以下・文字は16px（iPhone の勝手な拡大を防ぐ） */
  const t11=await p.evaluate(()=>{ const sel='#dbBatch input[type=text],#dbGrid .tile input[type=text],#dbGrid .tile input[type=date],#dbSite,#dbKind,#dbDate';
    return [...document.querySelectorAll(sel)].filter(e=>e.getBoundingClientRect().height>0).map(e=>({id:e.id||e.className,h:Math.round(e.getBoundingClientRect().height),fs:getComputedStyle(e).fontSize})); });
  ok(nm+' ⑪ 入力欄は高さ 28px 以下（上下の余白なし）・文字16px', t11.length>=6&&t11.every(x=>x.h<=28&&x.fs==='16px'), t11);
  /* ⑫ ★2026-10-12t 現場記録帳と同じ見た目（§660）：記録帳のスマホ画面で測った値と同じか（箱＝2px #747e77 角7px・二重の内線／札＝濃い灰 角8px 白文字／入力欄＝角8px／見出し＝平行四辺形の絵） */
  const t12=await p.evaluate(()=>{ const cs=s=>{ const e=document.querySelector(s); return e?getComputedStyle(e):null; };
    const box=['#dbBatch','#dbGrid .tile','#dbSide'].map(s=>{ const c=cs(s); return c&&c.borderTopWidth==='2px'&&c.borderTopColor==='rgb(116, 126, 119)'&&c.borderTopLeftRadius==='7px'&&/207, 220, 211/.test(c.boxShadow); });
    const ch=cs('#dbParts button:not(.more)'), inp=cs('#dbBPart'), hb=cs('.bh .httl'), hbB=document.querySelector('.bh .httl')?getComputedStyle(document.querySelector('.bh .httl'),'::before'):null;
    return {box, chip:!!ch&&/91, 103, 95/.test(ch.backgroundImage)&&ch.borderTopLeftRadius==='8px'&&ch.color==='rgb(255, 255, 255)', inp:!!inp&&inp.borderTopLeftRadius==='8px', httl:!!hbB&&/httl_frame/.test(hbB.borderImageSource)&&hb.color==='rgb(80, 33, 38)'}; });
  ok(nm+' ⑫ 現場記録帳と同じ見た目（箱・札・入力欄・見出しの平行四辺形）', t12.box.every(Boolean)&&t12.chip&&t12.inp&&t12.httl, t12);
  /* ⑬ ★2026-10-13u 見出しの文字が平行四辺形の内側にある（本人「枠に文字がちゃんと入ってない」）。
     枠の絵（httl_frame.png）を測った値：文字の上の端で左の斜め線は左端から 19px、文字の下の端で右の斜め線は右端から 63px（高さ26pxのとき） */
  const t13=await p.evaluate(()=>[...document.querySelectorAll('#dbv .httl')].filter(e=>e.getBoundingClientRect().height>0).map(e=>{ const R=e.getBoundingClientRect(), rg=document.createRange(); rg.selectNodeContents(e); const T=rg.getBoundingClientRect(); return {t:e.textContent, L:Math.round(T.left-R.left), Rg:Math.round(R.right-T.right)}; }));
  ok(nm+' ⑬ 見出しの文字が平行四辺形の内側（左 19px 以上・右 63px 以上）', t13.length>=1&&t13.every(x=>x.L>=19&&x.Rg>=63), t13);
  /* ③ */
  await p.evaluate(()=>{ const a=document.getElementById('dbAll'); a.checked=true; a.onchange.call(a); document.getElementById('dbBPart').value='バルコニー'; document.getElementById('dbBWork').value='補強メッシュ貼り付け'; document.getElementById('dbApply').click(); });
  await p.waitForTimeout(500);
  await p.evaluate(()=>{ const t=document.querySelector('#dbGrid .tile'), i=t.querySelector('.work'); i.value='ウレタン1層目'; i.dispatchEvent(new Event('change',{bubbles:true})); });
  await p.waitForTimeout(400);
  const t3=await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); const vs=Object.keys(m).filter(k=>m[k].site===SITE).map(k=>m[k]).sort((a,b)=>a.t-b.t);
    const tiles=[...document.querySelectorAll('#dbGrid .tile')]; return {parts:vs.map(v=>v.part).join('|'), works:vs.map(v=>v.work).join('|'), uiParts:tiles.map(t=>t.querySelector('.part').value).join('|'), uiWorks:tiles.map(t=>t.querySelector('.work').value).join('|'), selN:document.getElementById('dbSelN').textContent}; },SITE);
  ok(nm+' ③ 全部選んで「まとめて付ける」→ 2枚とも部位・作業内容が入る（保存も）・1枚目の欄を直すとその1枚だけ変わる', t3.parts==='バルコニー|バルコニー'&&t3.works==='ウレタン1層目|補強メッシュ貼り付け'&&t3.uiParts===t3.parts&&t3.uiWorks===t3.works, t3);
  /* ④ 黒板つきの絵（印刷・共有に使う絵と同じ作り方＝raw の写真に黒板を描く）：1枚目の canvas を等倍で測る */
  const draw=async(size)=>p.evaluate(async([SITE,R])=>{ const t=document.querySelector('#dbGrid .tile'), c=t.querySelector('canvas'); const g=c.getContext('2d'); const W=c.width, H=c.height;
    const sx=W/800; const rr={x:Math.round(R.x*sx),y:Math.round(R.y*sx),w:Math.round(R.w*sx),h:Math.round(R.h*sx)}; const d=g.getImageData(rr.x,rr.y,rr.w,rr.h).data; let green=0,white=0,dark=0,tot=rr.w*rr.h;
    for(let i=0;i<d.length;i+=4){ const r=d[i],gg=d[i+1],b=d[i+2]; if(gg>r+40&&gg>b+20) green++; if(r>200&&gg>200&&b>200) white++; if(r<60&&gg<60&&b<60) dark++; } const o=g.getImageData(10,10,1,1).data;
    return {W,H,green:+(green/tot).toFixed(2),white:+(white/tot).toFixed(3),dark:+(dark/tot).toFixed(2),outside:[o[0],o[1],o[2]]}; },[SITE,boardRect(800,600,size)]);
  await p.waitForTimeout(300); const t4a=await draw(42);
  await p.evaluate(()=>{ const c=document.getElementById('dbColor'); c.value='black'; c.dispatchEvent(new Event('change',{bubbles:true})); const s=document.getElementById('dbSize'); s.value='60'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(600); const t4b=await draw(60);
  const t4c=await p.evaluate(([R42,R60])=>{ const c=document.querySelector('#dbGrid .tile canvas'), g=c.getContext('2d'), sx=c.width/800; /* 42% の枠の左のすき間（60% なら黒板が覆う所）が暗いか */
    const x=Math.round((R60.x+10)*sx), y=Math.round((R42.y+R42.h/2)*sx), d=g.getImageData(x,y,1,1).data; return {px:[d[0],d[1],d[2]], left42:R42.x, left60:R60.x}; },[boardRect(800,600,42),boardRect(800,600,60)]);
  ok(nm+' ④ 黒板つきの絵：既定は右下に緑＋白文字・外は元の色。黒・60% に変えると黒板が暗く広がる（全写真に即反映）', t4a.green>=0.6&&t4a.white>=0.01&&t4a.outside[2]>150&&t4a.outside[1]<120&&t4b.dark>=0.6&&t4b.green<0.1&&t4c.px[0]<60&&t4c.px[1]<60&&t4c.left60<t4c.left42-50, {t4a,t4b,t4c});
  await p.evaluate(()=>{ const c=document.getElementById('dbColor'); c.value='green'; c.dispatchEvent(new Event('change',{bubbles:true})); const s=document.getElementById('dbSize'); s.value='42'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  /* ⑤ ドラッグ＆ドロップ */
  const png3=await mk(640,480,'#3060c0');
  const dt=await p.evaluateHandle((png)=>{ const dt=new DataTransfer(); const bin=atob(png.split(',')[1]); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); dt.items.add(new File([u],'c.png',{type:'image/png'})); return dt; },png3);
  await p.dispatchEvent('#dbMain','dragenter',{dataTransfer:dt}); const dragCls=await p.evaluate(()=>document.getElementById('dbMain').classList.contains('drag'));
  await p.dispatchEvent('#dbMain','drop',{dataTransfer:dt});
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===3,null,{timeout:10000}); }catch(e){}
  const t5=await p.evaluate(()=>({tiles:document.querySelectorAll('#dbGrid .tile').length, drag:document.getElementById('dbMain').classList.contains('drag')}));
  ok(nm+' ⑤ ドラッグ＆ドロップで1枚増える（引いている間は枠が光り、落とすと消える）', dragCls&&t5.tiles===3&&!t5.drag, {dragCls,t5});
  /* ⑥ 印刷（★2026-10-13u §661：1ページ＝A4の形の1枚の絵）。iPhone は**画面の幅のまま**組み立てて紙に縮めるので、スマホは画面幅のまま印刷の見た目にして測る。
     「出来上がり」を測る：ページの絵の中で、3枚の写真の場所に写真の色・表の見出しの列に灰色があるか（寸法は camera.html と別にここで書く：1mm＝6px） */
  await p.evaluate(()=>document.getElementById('dbPrintBtn').click());
  try{ await p.waitForFunction(()=>window._printed>0,null,{timeout:15000}); }catch(e){}
  if(!mob) await p.setViewportSize({width:794,height:1123});
  await p.emulateMedia({media:'print'}); await p.waitForTimeout(300);
  const t6=await p.evaluate(async()=>{ const cw=document.documentElement.clientWidth; const shown=[...document.body.children].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0).map(e=>e.id||e.tagName);
    const ims=[...document.querySelectorAll('#dbPrint .pg img')]; if(!ims.length) return {pages:0,shown};
    const im=ims[0]; await (im.decode?im.decode().catch(()=>{}):0); const R=im.getBoundingClientRect(); const W=im.naturalWidth, H=im.naturalHeight;
    const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); g.drawImage(im,0,0); const px=(x,y)=>[...g.getImageData(Math.round(x),Math.round(y),1,1).data].slice(0,3);
    const M=6, rowY=k=>(14+k*(82+4))*M; const photo=[0,1,2].map(k=>px((3+54)*M, rowY(k)+(3+38)*M)); const head=[0,1,2].map(k=>px((3+108+5+10)*M, rowY(k)+(3+6)*M)); const val=px((3+108+5+20+20)*M, rowY(0)+(3+6)*M);
    return {pages:ims.length, printed:window._printed||0, shown, ratio:+(H/W).toFixed(3), wOK:R.width<=cw+1&&R.width>=cw*0.85, cw, w:Math.round(R.width), jpeg:ims.every(i=>i.src.startsWith('data:image/jpeg')), photo, head, val}; });
  await p.emulateMedia({media:'screen'}); await p.setViewportSize(vp.viewport);
  const blueish=c=>c&&c[2]>c[0]+40, grayE8=c=>c&&Math.abs(c[0]-232)<10&&Math.abs(c[1]-232)<10&&Math.abs(c[2]-232)<10, white=c=>c&&c[0]>245&&c[1]>245&&c[2]>245;
  ok(nm+' ⑥ 印刷／PDF：1ページの絵（A4の形）・画面幅の中に収まる・ナビなど他は出ない・3枚の写真と表（見出しの灰色・中身の白い欄）が正しい場所にある', t6.pages===1&&t6.printed>=1&&t6.jpeg&&t6.shown.length===1&&t6.shown[0]==='dbPrint'&&Math.abs(t6.ratio-273/186)<0.01&&t6.wOK&&t6.photo.every(blueish)&&t6.head.every(grayE8)&&white(t6.val), t6);
  /* ⑧（§656）iPhone の HEIC：「写真を選ぶ」が .heic を選べる（accept）・HEIC を入れると変換部品（vendor/heic2any.min.js）が読み込まれる・
     壊れた HEIC は台帳に入らず「開けませんでした（HEIC…）」と知らせる（黙って飛ばさない） */
  const n0=await p.evaluate(()=>document.querySelectorAll('#dbGrid .tile').length);
  await p.setInputFiles('#dbPickIn',[{name:'IMG_0001.HEIC',mimeType:'image/heic',buffer:Buffer.from('not-a-real-heic-file-0123456789')}]);
  let lib=false; try{ await p.waitForFunction(()=>typeof window.heic2any==='function',null,{timeout:15000}); lib=true; }catch(e){}
  await p.waitForTimeout(1500);
  const t8=await p.evaluate(()=>({accept:document.getElementById('dbPickIn').getAttribute('accept'), tiles:document.querySelectorAll('#dbGrid .tile').length, toast:(document.getElementById('toast')||{}).textContent||''}));
  ok(nm+' ⑧ HEIC：.heic を選べる・変換部品が読み込まれる・壊れた HEIC は入らず理由を知らせる', /heic/i.test(t8.accept||'')&&lib&&t8.tiles===n0&&/HEIC/.test(t8.toast), Object.assign({lib,n0},t8));
  /* 後片付け */
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} },SITE);
  ok(nm+' ⑦ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }finally{ await b.close(); }
 console.log(NG?'★NG '+NG+'件':'全部○'); process.exit(NG?1:0); })();
