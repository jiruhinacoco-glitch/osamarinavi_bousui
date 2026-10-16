/* ★§709 写真台帳：入力の黒板（本人の付箋・PC）
   ① 「＋ 項目を追加」は1つだけ（下の「項目を足す」はなし）・幅は見出しの列と同じくらい（±20px）
   ② 真ん中に「部位」「作業内容」「写真ごとに入れます」の字はなく、部位・作業内容を直接入れる欄が2つ
   ③ 写真が無いとき：真ん中の部位に書くと見本の黒板にその文字
   ④ 写真を入れると：真ん中の欄はその写真の部位／書くと一覧の写真の部位にも入り、見本の黒板にも出る
   ⑤ 写真の部位をタップして、当てはまるタグが無い文字を打っても、説明（「打ってもOK」「当てはまるタグはありません」）を出さない
   ⑥ pageerror 0
   直す前の版では ①〜⑤ が★NG。  使い方: node _check/daicho_naka.js [camera.html の代わり] [画面写し] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html', SHOT=process.argv[3]||'';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:1600,height:900}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ window._ft=[]; window._fa=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t){ if(this.canvas.id==='dbCv1') window._ft.push(String(t)); window._fa.push(String(t)); return o.apply(this,arguments); };   /* 写真がある見本は別の画用紙に描いてから貼るので、全部の画用紙の文字も記録（_fa） */ });
  const file=async(name,w,h,col)=>({name,mimeType:'image/png',buffer:Buffer.from(await p.evaluate(([w,h,col])=>{ const c=document.createElement('canvas'); c.width=w;c.height=h; const g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,w,h); return c.toDataURL('image/png').split(',')[1]; },[w,h,col]),'base64')});
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>{ localStorage.removeItem('nn_daicho_pref_v1'); }); await p.reload(); await p.waitForTimeout(1000);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(400); await p.evaluate(()=>window.nnDbReg&&nnDbReg());
  await p.fill('#dbSite','中の欄の現場'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(800);
  const g1=await p.evaluate(()=>{ const L=document.getElementById('dbItemL'), a=[...L.querySelectorAll('.kbAdd')], h=L.querySelector('.bir .kbL'); return {n:a.length, t:a.map(x=>x.textContent.trim()), dw:a[0]&&h?Math.round(a[0].getBoundingClientRect().width-h.getBoundingClientRect().width):999}; });
  ok('① 「＋ 項目を追加」は1つだけ・幅は見出しの列と同じくらい', g1.n===1&&g1.t[0]==='＋ 項目を追加'&&Math.abs(g1.dw)<=20, g1);
  const g2=await p.evaluate(()=>{ const M=document.querySelector('#dbItemL .kbMid'); const txt=[...M.childNodes].filter(n=>!(n.matches&&n.matches('button,input'))).map(n=>n.textContent).join('').trim(); return {txt, inp:[...M.querySelectorAll('input')].map(i=>i.placeholder)}; });
  ok('② 真ん中は説明の字なし・部位と作業内容を直接入れる欄', !g2.txt&&g2.inp.join()==='部位,作業内容', g2);
  const P=p.locator('#dbItemL .kbMid input').first();
  let g3={}; if(await P.count()){ await P.fill('笠木'); await P.dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(500); g3.ft=await p.evaluate(()=>window._ft.includes('笠木')); }
  ok('③ 写真が無いとき：真ん中の部位に書くと見本の黒板にその文字', !!g3.ft, g3);
  await p.setInputFiles('#dbPickIn',[await file('a.png',800,600,'#3060c0')]); try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===1,null,{timeout:8000}); }catch(e){} await p.waitForTimeout(800);
  let g4={}; if(await P.count()){ g4.init=await P.inputValue(); await P.fill('ドレン'); await P.dispatchEvent('change'); await p.evaluate(()=>{ document.activeElement.blur(); window._ft=[]; window._fa=[]; document.querySelectorAll('#dbGrid .tile canvas').forEach(c=>c.setAttribute('data-x','1')); }); await p.waitForTimeout(300);
    await p.evaluate(()=>document.getElementById('dbSize').dispatchEvent(new Event('input',{bubbles:true}))); await p.waitForTimeout(1200);
    g4.tile=await p.inputValue('#dbGrid .tile .part'); g4.ft=await p.evaluate(()=>window._fa.slice()); }
  ok('④ 写真を入れると真ん中の欄はその写真の部位・書くと一覧の写真にも見本の黒板にも入る', g4.init==='笠木'&&g4.tile==='ドレン'&&g4.ft.includes('ドレン'), {init:g4.init,tile:g4.tile,ft:g4.ft.includes('ドレン')});
  if(SHOT) await p.locator('#dbSide').screenshot({path:SHOT});
  const w=p.locator('#dbGrid .tile .work').first(); await w.click(); await p.keyboard.type('どこにも無い作業ぞぞ'); await p.waitForTimeout(400);
  const g5=await p.evaluate(()=>{ const x=document.querySelector('#dbGrid .tile .tagpop'); return {vis:!!x&&getComputedStyle(x).display!=='none', t:x?x.textContent:''}; });
  ok('⑤ タグが無い文字を打っても説明を出さない', !(g5.vis&&/打ってもOK|当てはまるタグ/.test(g5.t)), g5);
  ok('⑥ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
