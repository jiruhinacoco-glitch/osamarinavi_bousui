/* ★§720 写真台帳：Excel・PDF の確認画面で右の欄（工種・部位・作業内容）を直接直せる
   ① 確認画面（Excel・PDF）の各ページに、写真ごとに 工種・部位・作業内容 の入力欄が重なる（1ページ目＝写真2枚なら6つ）
   ② 入力欄は絵の右の表の中身の列の上（ページの幅186mm に対して x 136〜183mm）・行の場所も表どおり
   ③ 1枚目の「部位」に書いて Enter → ページが作り直され、入力欄にもその文字・一覧の写真の部位にも入る・見ていたページのまま
   ④ pageerror 0
   直す前の版では ①〜③ が★NG。  使い方: node _check/daicho_revedit.js [camera.html の代わり] [画面写し] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html', SHOT=process.argv[3]||'';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ const ctx=await b.newContext({viewport:{width:1600,height:900}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const file=async(name)=>({name,mimeType:'image/png',buffer:Buffer.from(await p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=400;c.height=300; const g=c.getContext('2d'); g.fillStyle='#4070b0'; g.fillRect(0,0,400,300); return c.toDataURL('image/png').split(',')[1]; }),'base64')});
  await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>{ localStorage.removeItem('nn_daicho_pref_v1'); return nnPhotos.load('nn_daicho_v1').then(m=>m&&nnPhotos.del('nn_daicho_v1',Object.keys(m))); }).catch(()=>{}); await p.reload(); await p.waitForTimeout(1000);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(300); await p.evaluate(()=>window.nnDbReg&&nnDbReg());
  await p.fill('#dbSite','確認画面の現場'); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(500);
  await p.setInputFiles('#dbPickIn',[await file('a.png'),await file('b.png')]); try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===2,null,{timeout:8000}); }catch(e){} await p.waitForTimeout(800);
  for(const [mode,btn] of [['Excel','#dbXlsBtn'],['PDF','#dbPrintBtn']]){
    await p.click(btn); try{ await p.waitForFunction(()=>document.querySelector('#dbRevS .sl.pg img')&&document.querySelector('#dbRevS .sl.pg img').complete,null,{timeout:10000}); }catch(e){} await p.waitForTimeout(500);
    const g1=await p.evaluate(()=>{ const sl=document.querySelector('#dbRevS .sl.pg'); if(!sl) return {n:0}; const im=sl.querySelector('img').getBoundingClientRect(), es=[...sl.querySelectorAll('.ove')];
      return {n:es.length, ks:es.map(e=>e.dataset.k).join(), geo:es.map(e=>{ const r=e.getBoundingClientRect(); return {l:+((r.left-im.left)/im.width*186).toFixed(1), r:+((r.right-im.left)/im.width*186).toFixed(1), t:+((r.top-im.top)/im.height*273).toFixed(1), b:+((r.bottom-im.top)/im.height*273).toFixed(1)}; })}; });
    ok(mode+'：① 写真ごとに 工種・部位・作業内容 の入力欄（2枚で6つ）', g1.n===6&&g1.ks==='kind,part,work,kind,part,work', {n:g1.n,ks:g1.ks});
    /* 期待値は pageCanvas の寸法から別に計算：行の上 y=14+k*86+3、6行で76mm、工種=3行目・部位=5行目・作業内容=6行目 */
    const exp=[]; for(let k=0;k<2;k++) for(const ri of [2,4,5]){ const t=14+k*86+3+ri*76/6; exp.push({l:136,r:183,t,b:t+76/6}); }
    const bad=(g1.geo||[]).filter((g,i)=>!exp[i]||Math.abs(g.l-exp[i].l)>0.6||Math.abs(g.r-exp[i].r)>0.6||Math.abs(g.t-exp[i].t)>0.6||Math.abs(g.b-exp[i].b)>0.6);
    ok(mode+'：② 入力欄は表の中身の列・行の上（±0.6mm）', g1.n===6&&bad.length===0, {bad:bad.slice(0,2), first:(g1.geo||[])[1]});
    if(SHOT&&mode==='PDF'){ await p.locator('#dbRevS .sl.pg .ove').nth(1).focus(); await p.screenshot({path:SHOT}); }
    let g3={}; const inp=p.locator('#dbRevS .sl.pg .ove[data-k="part"]').first();
    if(await inp.count()){ const val=mode==='Excel'?'笠木':'ドレン'; await inp.click(); await inp.fill(val); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
      try{ await p.waitForFunction(()=>document.querySelector('#dbRevS .sl.pg img')&&document.querySelector('#dbRevS .sl.pg img').complete&&document.querySelector('#dbRevS .sl.pg .ove'),null,{timeout:10000}); }catch(e){} await p.waitForTimeout(600);
      g3={val, ov:await p.locator('#dbRevS .sl.pg .ove[data-k="part"]').first().inputValue().catch(()=>''), tile:await p.locator('#dbGrid .tile .part').first().inputValue(), on:await p.evaluate(()=>document.getElementById('dbRev').classList.contains('on'))}; }
    ok(mode+'：③ 部位に書いて Enter → 入力欄にも一覧の写真にも入る・確認画面のまま', !!g3.val&&g3.ov===g3.val&&g3.tile===g3.val&&g3.on, g3);
    await p.evaluate(()=>{ const c=[...document.querySelectorAll('#dbRev button')].find(x=>/閉じる/.test(x.textContent)); c&&c.click(); }); await p.waitForTimeout(400); }
  ok('④ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった',false,String(e)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○'); })();
