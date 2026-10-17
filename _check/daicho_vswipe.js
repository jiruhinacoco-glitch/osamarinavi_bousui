/* ★§722 写真台帳：大きく見る画面（本人の付箋）
   ① ★§725 写真の上で指を右から左へ（60px 以上）→ 次の番号の写真（No.2）・左から右へ → 前の写真（No.1）に戻る・端では動かない
   ② ★§728/§729 写真の中の黒板を押す（1回）→ 上に大きな黒板（横幅いっぱい）・その上に書く欄・写真はその下
   ②b ★§724 窓を開いている間も写真の黒板が窓の上に見える・打つたびに反映・改行で2行
   ③ 窓で「工事場所」に書いて Enter → 左の入力の黒板にも入る・窓の部位を書くと写真の部位にも入る
   ④ 黒板の外を押しても窓は出ない・2回たたくと拡大（窓は出ない）
   ⑤ pageerror 0
   直す前の版では ①〜③ が★NG。  使い方: node _check/daicho_vswipe.js [camera.html の代わり] [画面写し] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html', SHOT=process.argv[3]||'';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ window._vt=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t){ if(this.canvas.id==='dbViewCv') window._vt.push(String(t)); if(this.canvas.id==='dbVBigCv') (window._bt=window._bt||[]).push(String(t)); return o.apply(this,arguments); }; });
  await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); });
  const file=async(name,col)=>({name,mimeType:'image/png',buffer:Buffer.from(await p.evaluate((col)=>{ const c=document.createElement('canvas'); c.width=400;c.height=300; const g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,400,300); return c.toDataURL('image/png').split(',')[1]; },col),'base64')});
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>{ localStorage.removeItem('nn_daicho_pref_v1'); return nnPhotos.load('nn_daicho_v1').then(m=>m&&nnPhotos.del('nn_daicho_v1',Object.keys(m))); }).catch(()=>{}); await p.reload(); await p.waitForTimeout(1000);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(300); await p.evaluate(()=>window.nnDbReg&&nnDbReg());
  await p.fill('#dbSite','めくる試験の現場'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(500);
  await p.setInputFiles('#dbPickIn',[await file('a.png','#3060c0'),await file('b.png','#c03030')]); try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===2,null,{timeout:8000}); }catch(e){} await p.waitForTimeout(800);
  await p.evaluate(()=>document.querySelector('#dbGrid .tile canvas').click()); await p.waitForTimeout(800);
  const no=()=>p.evaluate(()=>document.getElementById('dbViewNo').textContent);
  const cvR=async()=>p.evaluate(()=>{ const r=document.getElementById('dbViewCv').getBoundingClientRect(); return {l:r.left,t:r.top,w:r.width,h:r.height}; });
  const swipe=async(dx)=>{ const r=await cvR(), y=r.t+r.h*0.3, x0=r.l+r.w/2-dx/2; await p.evaluate(([x0,y,dx])=>{ const st=document.getElementById('dbVStage'); const ev=(t,x)=>st.dispatchEvent(new PointerEvent(t,{pointerId:7,clientX:x,clientY:y,bubbles:true,pointerType:'touch',isPrimary:true})); ev('pointerdown',x0); for(let i=1;i<=6;i++) ev('pointermove',x0+dx*i/6); ev('pointerup',x0+dx); },[x0,y,dx]); await p.waitForTimeout(700); };
  const n0=await no(); await swipe(-160); const n1=await no(); await swipe(-160); const n2=await no(); await swipe(160); const n3=await no();   /* 2枚：1→2→（最後の次）1→（前）2 */   /* ★§725 右から左へ＝次・左から右へ＝前 */
  await swipe(160); const n4=await no(); await swipe(-160); const n5=await no();
  ok('① 右から左へ → 次（No.2）・最後の次は1枚目・左から右へ → 前・1枚目の前は最後（★§726 ぐるっと回る）', n0.startsWith('No.1')&&n1.startsWith('No.2')&&n2.startsWith('No.1')&&n3.startsWith('No.2')&&n4.startsWith('No.1')&&n5.startsWith('No.2'), {n0,n1,n2,n3,n4,n5});
  const tap=async(fx,fy)=>{ const r=await cvR(); await p.evaluate(([x,y])=>{ const st=document.getElementById('dbVStage'); const ev=t=>st.dispatchEvent(new PointerEvent(t,{pointerId:8,clientX:x,clientY:y,bubbles:true,pointerType:'touch',isPrimary:true})); ev('pointerdown'); ev('pointerup'); },[r.l+r.w*fx,r.t+r.h*fy]); };
  await tap(0.2,0.2); await p.waitForTimeout(600); const out=await p.evaluate(()=>document.getElementById('dbVKb').classList.contains('on'));
  await tap(0.75,0.8); await p.waitForTimeout(700);
  /* ② ★§728 黒板を押す → 黒板そのものの上に書く欄（行の中身の場所・部位・作業内容）が重なる。別の窓は出さない */
  const g2=await p.evaluate(()=>{ const K=document.getElementById('dbVKb'); if(!K.classList.contains('on')) return {on:false}; const big=document.getElementById('dbVBigCv').getBoundingClientRect(), es=[...K.querySelectorAll('.vko')], vw=document.documentElement.clientWidth;
    const inBig=es.every(e=>{ const r=e.getBoundingClientRect(); return r.left>=big.left-1&&r.right<=big.right+1&&r.top>=big.top-1&&r.bottom<=big.bottom+1; });
    const ph=document.getElementById('dbViewCv').getBoundingClientRect();
    return {on:true, n:es.length, kinds:es.map(e=>e.dataset.k||'row').join(), inBig, bigW:Math.round(big.width), vw, photoBelow:ph.top>=big.bottom-1&&ph.height>40, fs:parseFloat(getComputedStyle(es[0]).fontSize)}; });
  if(SHOT) await p.screenshot({path:SHOT});
  ok('② 黒板を押す → 大きな黒板（横幅いっぱい）が上に出て、その上に書く欄（3行＋部位・作業内容）・写真はその下・黒板の外では出ない', g2.on&&!out&&g2.n===5&&g2.inBig&&g2.bigW>=g2.vw*0.9&&g2.photoBelow&&g2.fs>=12&&/part/.test(g2.kinds), {g2,out});
  /* ②b 打つたびに写真の黒板に出る・改行で2行・欄の字は透明（下の黒板が見える） */
  let g2b={}; if(g2.on){ const ta=p.locator('#dbVKbL textarea[data-i="1"]'); await ta.click(); await p.evaluate(()=>{ window._vt=[]; }); await p.keyboard.type('一行目'); await p.waitForTimeout(500); g2b.live=await p.evaluate(()=>window._vt.includes('一行目'));
    await p.keyboard.press('Enter'); await p.keyboard.type('二行目'); await p.evaluate(()=>{ window._vt=[]; }); await p.waitForTimeout(600); g2b.v=await ta.inputValue(); g2b.two=await p.evaluate(()=>window._vt.includes('一行目')&&window._vt.includes('二行目'));
    g2b.col=await ta.evaluate(e=>getComputedStyle(e).color);
    /* ★§730 作業内容だけ打つ → 大きな黒板には描かない（欄の字だけ）＝打った欄の外に字が出ない */
    await p.evaluate(()=>{ window._bt=[]; }); const wk=p.locator('#dbVKbL input[data-k="work"]'); await wk.click(); await p.keyboard.type('あいうえ'); await p.waitForTimeout(500);
    g2b.bigHas=await p.evaluate(()=>(window._bt||[]).some(t=>t.includes('あいうえ'))); g2b.wv=await wk.inputValue(); g2b.photo=await p.evaluate(()=>window._vt.includes('あいうえ'));
    /* ★§730 字の右側を押す → カーソルが字の最後・Backspace で最後の字が消える */
    const box=await wk.boundingBox(); await p.mouse.click(box.x+box.width-6, box.y+box.height/2); await p.waitForTimeout(150); g2b.caret=await wk.evaluate(e=>[e.selectionStart,e.value.length]); await p.keyboard.press('Backspace'); await p.waitForTimeout(200); g2b.after=await wk.inputValue();
    await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(300); }
  ok('②b 打つたびに写真の黒板に出る・改行で2行・欄の字は見える（白）・大きな黒板には別に描かない・字の右を押すと最後にカーソル→Backspaceで消える', g2b.live&&g2b.v==='一行目\n二行目'&&g2b.two&&/255, 255, 255|0, 0, 0\)/.test(g2b.col)&&!/rgba\(0, 0, 0, 0\)/.test(g2b.col)&&!g2b.bigHas&&g2b.photo&&g2b.caret&&g2b.caret[0]===g2b.caret[1]&&g2b.after==='あいう', g2b);
  let g3={}; if(g2.on){ const f=p.locator('#dbVKbL textarea[data-i="1"]'); await f.fill('札幌市西区1-1'); await f.dispatchEvent('change'); await p.waitForTimeout(500);
    const pf=p.locator('#dbVKbL input[data-k="part"]'); await pf.fill('笠木'); await pf.press('Enter'); await p.waitForTimeout(600);
    g3={left:await p.evaluate(()=>{ const r=[...document.querySelectorAll('#dbItemL .bir')].find(d=>/工事場所/.test(d.querySelector('.kbLt').textContent)); return r?r.querySelector('.iv').value:''; }), part:await p.evaluate(()=>document.getElementById('dbVPart').value), tile:await p.evaluate(()=>{ const n=+(document.getElementById('dbViewNo').textContent.match(/No\.(\d+)/)||[0,1])[1]; return document.querySelectorAll('#dbGrid .tile .part')[n-1].value; })}; }
  ok('③ 黒板の欄で工事場所・部位を直す → 左の黒板・写真の部位にも入る', g3.left==='札幌市西区1-1'&&g3.part==='笠木'&&g3.tile==='笠木', g3);
  await p.click('#dbVKbX').catch(()=>{}); await p.waitForTimeout(200);
  const r=await cvR(); await p.evaluate(([x,y])=>{ const st=document.getElementById('dbVStage'); const ev=(t,id)=>st.dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:x,clientY:y,bubbles:true,pointerType:'touch',isPrimary:true})); ev('pointerdown',9); ev('pointerup',9); setTimeout(()=>{ ev('pointerdown',10); ev('pointerup',10); },120); },[r.l+r.w*0.75,r.t+r.h*0.8]); await p.waitForTimeout(800);
  const g4=await p.evaluate(()=>({z:(document.getElementById('dbViewCv').style.transform.match(/scale\(([\d.]+)\)/)||[0,1])[1], kb:document.getElementById('dbVKb').classList.contains('on')}));
  ok('④ 2回たたくと拡大・窓は出ない', +g4.z>=2&&!g4.kb, g4);
  ok('⑤ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
