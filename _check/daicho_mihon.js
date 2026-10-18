/* ★§734 写真台帳：上の黒板（入力欄）と下の見本の絵の文字を一致させる
   本人「作成した黒板と黒板イメージ画像の文字に乖離がある」：部位に「プライマー」だけ入れたのに、見本には入れていない「補強メッシュ貼り付け」が出ていた
   （写真がまだ無いとき、空の部位・作業内容を仮の文字で埋めていた）
   ① 写真なし・部位だけ入れる → 見本に部位は出る・入れていない仮の文字（補強メッシュ貼り付け・バルコニー）は出ない
   ② 作業内容を入れると見本にも出る ③ 上の黒板の部位・作業内容の欄と見本の文字が同じ・pageerror 0
   直す前の版では ① が★NG。  使い方: node _check/daicho_mihon.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){}
    window._ft=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t,x,y){ if(this.canvas.id==='dbCv1') window._ft.push(String(t)); return o.apply(this,arguments); }; });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200); await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600);
  await p.evaluate(()=>window.nnDbReg&&nnDbReg()); await p.evaluate(()=>document.querySelector('#dbv .dbSide').classList.remove('closed'));
  await p.fill('#dbSite','見本試験の現場'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(900);
  await p.evaluate(()=>{ const a=document.querySelector('#dbBoardAsk [data-b="on"]'); if(a&&a.offsetParent) a.click(); }); await p.waitForTimeout(400);
  const draw=async()=>{ await p.evaluate(()=>{ window._ft=[]; document.getElementById('dbSize').dispatchEvent(new Event('input',{bubbles:true})); }); await p.waitForTimeout(700); return p.evaluate(()=>window._ft.slice()); };
  const setPW=async(k,v)=>{ await p.evaluate(([k,v])=>{ const e=document.querySelector('#dbItemL .kbPW[data-k="'+k+'"]'); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); },[k,v]); await p.waitForTimeout(300); };
  await setPW('part','プライマー'); await setPW('work','');
  const f1=await draw();
  ok('① 部位だけ入れる → 見本に部位は出る・入れていない仮の文字は出ない', f1.includes('プライマー')&&!f1.includes('補強メッシュ貼り付け')&&!f1.includes('バルコニー'), f1.filter(t=>t.length>3));
  await p.locator('#dbCv1').screenshot({path:'/tmp/mihon1.png'}).catch(()=>{});
  await setPW('work','プライマー塗布'); const f2=await draw();
  ok('② 作業内容を入れると見本にも出る', f2.includes('プライマー塗布'), f2.filter(t=>t.length>3));
  const ed=await p.evaluate(()=>[...document.querySelectorAll('#dbItemL .kbPW')].map(e=>e.value));
  ok('③ 上の黒板の欄と見本の文字が同じ・pageerror 0', ed.every(v=>!v||f2.includes(v))&&errs.length===0, {ed,errs});
 }catch(e){ console.log('★NG 例外 '+e.message); NG++; }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); process.exit(NG?1:0); })();
