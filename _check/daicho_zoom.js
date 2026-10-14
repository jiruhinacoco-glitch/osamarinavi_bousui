/* ★2026-10-13zi 写真台帳：確認の画面の拡大・縮小／ページの見出しは現場名だけ（本人・§675）
   ① 確認（写真）：指2本で広げると拡大（2倍以上）・拡大中は横にめくらない（overflow-x:hidden）・指1本で動く・2回たたくと元の大きさ
   ② PDF の確認でも指2本で拡大できる・めくる（▶）と元の大きさに戻る
   ③ ページの見出し：「工事写真台帳」の文字なし・左上（x=0）から現場名・長い現場名は2行に折って全部（「…」なし）
   ④ 表の「工事名」の欄も現場名が全部（「…」なし）
   ⑤ Excel の見出し（A1）：現場名だけ・長いので折り返し（wrapText）
   ⑥ pageerror 0
   描いた文字は CanvasRenderingContext2D の fillText を横取りして記録する（出来上がりの紙に何が描かれたか）。直す前の版では ①〜⑤ が★NG。
   使い方: node _check/daicho_zoom.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const SITE='サン太平レジデンス 大規模修繕（屋上・バルコニー防水）第2期工事 北棟・南棟・管理棟 外構含む';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){}
    window._ft=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t,x,y){ if(this.canvas.width===1116*2||this.canvas.width===186*6||this.canvas.width===186*12) window._ft.push({t:String(t),x:Math.round(x),y:Math.round(y),W:this.canvas.width}); return o.apply(this,arguments); };
    window._sh=[]; navigator.canShare=()=>true; navigator.share=(d)=>{ window._sh.push(d); return Promise.resolve(); }; });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(500);
  await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(300);
  const mk=()=>p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=800; c.height=600; const g=c.getContext('2d'); g.fillStyle='#3060c0'; g.fillRect(0,0,800,600); g.fillStyle='#c0d0f0'; g.fillRect(96,90,608,420); return c.toDataURL('image/png'); });
  const fl=[]; for(let i=0;i<4;i++) fl.push({name:'z'+i+'.png',mimeType:'image/png',buffer:Buffer.from((await mk()).split(',')[1],'base64')});
  await p.setInputFiles('#dbPickIn',fl); try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===4,null,{timeout:20000}); }catch(e){}
  const cdp=await p.context().newCDPSession(p);
  const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((q,i)=>({x:q[0],y:q[1],id:i}))});
  const pinch=async(cx,cy,d0,d1)=>{ await touch('touchStart',[[cx-d0/2,cy],[cx+d0/2,cy]]); for(let k=1;k<=6;k++){ const d=d0+(d1-d0)*k/6; await touch('touchMove',[[cx-d/2,cy],[cx+d/2,cy]]); } await touch('touchEnd',[]); await p.waitForTimeout(150); };
  const st=()=>p.evaluate(()=>{ const sc=document.getElementById('dbRevS'), w=sc.clientWidth, i=Math.round(sc.scrollLeft/w), im=sc.children[i]&&sc.children[i].querySelector('img'); const m=im&&/scale\(([\d.]+)\)/.exec(im.style.transform||''), t=im&&/translate\((-?[\d.]+)px/.exec(im.style.transform||'');
    return {i, z:m?+m[1]:1, tx:t?+t[1]:0, ox:getComputedStyle(sc).overflowX, zoomed:document.getElementById('dbRev').classList.contains('zoomed')}; });
  const openRev=async(btn)=>{ await p.click(btn); try{ await p.waitForFunction(()=>{ const g=document.getElementById('dbRevGo'); return g&&!g.disabled&&document.querySelector('#dbRevS img'); },null,{timeout:30000}); }catch(e){} await p.waitForTimeout(400); };
  const imgC=()=>p.evaluate(()=>{ const r=document.querySelector('#dbRevS .sl img').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]; });
  /* ① */
  await openRev('#dbSave'); let c=await imgC();
  await pinch(c[0],c[1],60,220); const a1=await st();
  await touch('touchStart',[[c[0],c[1]]]); for(let k=1;k<=5;k++) await touch('touchMove',[[c[0]+k*12,c[1]]]); await touch('touchEnd',[]); await p.waitForTimeout(150); const a2=await st();
  await touch('touchStart',[[c[0],c[1]]]); await touch('touchEnd',[]); await p.waitForTimeout(80); await touch('touchStart',[[c[0],c[1]]]); await touch('touchEnd',[]); await p.waitForTimeout(300); const a3=await st();
  ok('① 確認（写真）：指2本で2倍以上・拡大中はめくらない・指1本で動く・2回たたくと元へ', a1.z>=2&&a1.zoomed&&a1.ox==='hidden'&&a1.i===0&&a2.tx>a1.tx+20&&a2.i===0&&a3.z===1&&!a3.zoomed, {a1,a2,a3});
  await p.click('#dbRevX'); await p.waitForTimeout(300);
  /* ② */
  await p.evaluate(()=>{ window._ft=[]; }); await openRev('#dbPrintBtn'); c=await imgC();
  await pinch(c[0],c[1],60,200); const b1=await st(); await p.click('#dbRevN'); await p.waitForTimeout(900); const b2=await st();
  ok('② PDF の確認：指2本で拡大（2倍以上）・▶でめくると元の大きさ', b1.z>=2&&b2.z===1&&b2.i===1, {b1,b2});
  /* ③④ */
  const ft=await p.evaluate(()=>window._ft); const W=ft.length?ft[0].W:0, M=W/186;
  const head=ft.filter(f=>f.W===W&&f.y<10.5*M&&f.x<150*M).slice(0,2);   /* 1ページ目の見出し（右のページ番号は除く） */
  const ttl=head.map(f=>f.t).join('');
  ok('③ ページの見出し：「工事写真台帳」なし・左上 x=0 から現場名・2行に折って全部（…なし）', !/工事写真台帳/.test(ttl)&&head.length===2&&head.every(f=>f.x===0)&&ttl===SITE, {M,head});
  const iH=ft.findIndex(f=>f.t==='工事名'); const cell=iH>=0?ft.slice(iH+1).filter(f=>f.x>100*M&&f.t!=='工種').slice(0,3):[]; const cv=[]; for(const f of cell){ if(f.t==='工種') break; cv.push(f.t); if(cv.join('')===SITE) break; }
  ok('④ 表の「工事名」の欄も現場名が全部（…なし）', cv.join('')===SITE, {cv});
  await p.click('#dbRevX'); await p.waitForTimeout(300);
  /* ⑤ */
  await openRev('#dbXlsBtn'); try{ await p.waitForFunction(()=>window._nnXls&&window.ExcelJS,null,{timeout:30000}); }catch(e){}
  const x5=await p.evaluate(async()=>{ if(!window._nnXls||!window.ExcelJS) return {none:true}; const wb=new ExcelJS.Workbook(); await wb.xlsx.load(await window._nnXls.arrayBuffer()); const c=wb.worksheets[0].getCell('A1'); return {v:c.value, wrap:!!(c.alignment&&c.alignment.wrapText), size:c.font&&c.font.size}; });
  ok('⑤ Excel の見出し（A1）：現場名だけ・長いので折り返し', x5.v===SITE&&x5.wrap, x5);
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  ok('⑥ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
