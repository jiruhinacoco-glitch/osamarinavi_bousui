/* ★2026-10-12j カメラ「写真台帳を作成」（黒板つき・§652）→ ★2026-10-12k 1画面に作り直し（§653）：
   ① 入口の「写真台帳を作成」を押すと #dbv が開く（1画面：左に設定・右に写真）。現場名が空のまま写真を入れようとすると断る。ページは移動しない
   ② 現場名を入れて写真を2枚いっぺんに入れる（file input・複数）→ 2枚のカード（No.1・No.2）・保存（nnPhotos・nn_daicho_v1）にも2件・黒板は焼き込まない（raw）
   ③ 全部選んで「まとめて付ける」→ 2枚とも部位・作業内容が入る（保存も）。1枚目のカードの欄を直すとその1枚だけ変わる
   ④ 黒板つきの絵：既定（緑・右下・42%）で右下に緑 6割以上＋白の文字・黒板の外は元の写真の色。色を黒に・大きさ 60% に変えると、黒板の場所が暗くなり幅が広がる（全部の写真に反映）
   ⑤ ドラッグ＆ドロップ（drop イベント・ファイル1枚）で1枚増える
   ⑥ 印刷／PDF：印刷用に3枚（1ページ）・表は潰れていない（印刷の見た目で表の幅が 40mm 以上・「作業内容」の欄が1〜2行）
   ⑦ pageerror 0
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
  await p.setInputFiles('#dbPickIn',[await file('a.png',800,600,'#3060c0')]); await p.waitForTimeout(600);
  const t1b=await p.evaluate(()=>({tiles:document.querySelectorAll('#dbGrid .tile').length}));
  ok(nm+' ① 入口で #dbv（1画面：設定＋写真の一覧）が開く・現場名が空なら写真を入れても断る・ページは移動しない', t1a.on&&t1a.side&&t1a.grid&&/camera/.test(t1a.path)&&t1a.site===''&&t1b.tiles===0, {t1a,t1b});
  if(!t1a.on){ ok(nm+' ⑦ pageerror 0', errs.length===0, errs); await p.close(); continue; }
  /* ② */
  await p.fill('#dbSite',SITE); await p.waitForTimeout(400);
  await p.setInputFiles('#dbPickIn',[await file('a.png',800,600,'#3060c0'),await file('b.png',800,600,'#3060c0')]);
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===2,null,{timeout:10000}); }catch(e){}
  await p.waitForTimeout(500);
  const t2=await p.evaluate(async(SITE)=>{ const tiles=[...document.querySelectorAll('#dbGrid .tile')]; const m=await nnPhotos.load('nn_daicho_v1'); const ids=Object.keys(m).filter(k=>m[k].site===SITE);
    return {tiles:tiles.length, nos:tiles.map(t=>t.querySelector('.no').textContent).join(','), saved:ids.length, raw:ids.every(k=>m[k].raw===1), w:ids.map(k=>m[k].w).join(','), count:document.getElementById('dbCount').textContent}; },SITE);
  ok(nm+' ② 現場名を入れて写真を2枚いっぺんに → カード2枚（No.1・No.2）・保存に2件・黒板は焼き込まない（raw）', t2.tiles===2&&t2.nos==='No.1,No.2'&&t2.saved===2&&t2.raw&&t2.w==='800,800'&&/2枚/.test(t2.count), t2);
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
  /* ⑥ 印刷 */
  await p.evaluate(()=>document.getElementById('dbPrintBtn').click());
  try{ await p.waitForFunction(()=>window._printed>0,null,{timeout:10000}); }catch(e){}
  /* 印刷の見た目は A4 の幅（96dpi で 794px）で測る（スマホの画面幅のままだと紙と違う） */
  await p.setViewportSize({width:794,height:1123}); await p.emulateMedia({media:'print'}); await p.waitForTimeout(300);
  const t6=await p.evaluate(()=>{ const rows=[...document.querySelectorAll('#dbPrint .r')]; const r0=rows[0]; if(!r0) return {rows:0};
    const mm=px=>px/96*25.4; const tb=r0.querySelector('.tb').getBoundingClientRect(), im=r0.querySelector('.im').getBoundingClientRect(); const cell=[...r0.querySelectorAll('td')].pop(); const cr=cell.getBoundingClientRect();
    return {rows:rows.length, pages:document.querySelectorAll('#dbPrint .pg').length, printed:window._printed||0, tbW:+mm(tb.width).toFixed(1), imW:+mm(im.width).toFixed(1), cellH:+mm(cr.height).toFixed(1), txt:cell.textContent, imgs:[...document.querySelectorAll('#dbPrint img')].every(i=>i.src.startsWith('data:image/jpeg'))}; });
  await p.emulateMedia({media:'screen'}); await p.setViewportSize(vp.viewport);
  ok(nm+' ⑥ 印刷／PDF：印刷用に3枚・1ページ・表は潰れていない（幅 40mm 以上・作業内容の欄が 2行以内）・写真は黒板つきの JPEG', t6.rows===3&&t6.pages===1&&t6.printed>=1&&t6.tbW>=40&&t6.imW>=100&&t6.cellH<=14&&t6.imgs, t6);
  /* 後片付け */
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} },SITE);
  ok(nm+' ⑦ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }finally{ await b.close(); }
 console.log(NG?'★NG '+NG+'件':'全部○'); process.exit(NG?1:0); })();
