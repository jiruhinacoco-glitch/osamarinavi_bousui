/* ①メニューがチップの真下に出るか（倍率つきの大きいモニターで確認）
   ②タグの文字が大きく、枠の高さは変わっていないか
   ③写真の下のプルダウンが大きすぎないか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const W of [1600,2000,2560]){
  console.log('\n===== 画面幅 '+W+'px =====');
  const ctx=await b.newContext({viewport:{width:W,height:950}});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
  const Z=await p.evaluate(()=>window.nnPZ||1);
  /* 一覧のチップを開く */
  const m=await p.evaluate(()=>{
    const w=document.querySelector('#chips .dfil[data-k="nendo"]');
    const btn=w.querySelector('button');
    btn.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    return new Promise(res=>setTimeout(()=>{
      const menu=document.querySelector('#nnPortal.dfmenu, #nnPortal .dfmenu, .dfmenu.open');
      if(!menu)return res(null);
      const mb=menu.getBoundingClientRect(), bb=btn.getBoundingClientRect();
      res({dx:Math.round(mb.left-bb.left), dy:Math.round(mb.top-bb.bottom),
        mw:Math.round(mb.width), inView: mb.left>=0&&mb.top>=0&&mb.right<=innerWidth&&mb.top<=innerHeight});
    },260));
  });
  ok(m,'メニューが開く');
  if(m){
    ok(Math.abs(m.dx)<=14,'チップの左端にそろっている（横ズレ）', m.dx+'px');
    ok(m.dy>=-6 && m.dy<=24,'チップのすぐ下に出る（縦ズレ）', m.dy+'px');
    ok(m.inView,'画面の中に収まっている');
  }
  await p.evaluate(()=>{ if(window.nnClosePortal)nnClosePortal(); lfOpen=null; buildChips(); });
  await p.waitForTimeout(300);

  /* ダッシュボードのチップでも同じか */
  await p.evaluate(()=>showView('dash')); await p.waitForTimeout(1600);
  const md=await p.evaluate(()=>{
    const w=document.querySelector('.stbar .dfil'); if(!w)return 'なし';
    const btn=w.querySelector('button');
    btn.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    return new Promise(res=>setTimeout(()=>{
      const menu=document.querySelector('#nnPortal.dfmenu, #nnPortal .dfmenu, .dfmenu.open');
      if(!menu)return res(null);
      const mb=menu.getBoundingClientRect(), bb=btn.getBoundingClientRect();
      res({dx:Math.round(mb.left-bb.left), dy:Math.round(mb.top-bb.bottom)});
    },260));
  });
  if(md&&md!=='なし') ok(Math.abs(md.dx)<=14 && md.dy>=-6 && md.dy<=24,'ダッシュボードでも正しい位置', JSON.stringify(md));
  else console.log('   ダッシュボードのチップ:', md);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1000);

  /* ②③ 文字と枠 */
  const t=await p.evaluate(()=>{
    const Z=window.nnPZ||1;
    const c=document.querySelector('#list .pcard');
    /* ★getComputedStyle は倍率を「かける前」のpx（割ってはいけない）。
       getBoundingClientRect は「かけた後」なので、こちらだけ倍率で割る（§61）。 */
    const g=(sel)=>{const e=c.querySelector(sel); if(!e)return null;
      const r=e.getBoundingClientRect();
      return {fs:+parseFloat(getComputedStyle(e).fontSize).toFixed(1), h:Math.round(r.height/Z)};};
    const dt=c.querySelector('.defchip')||document.querySelector('#list .pcard .defchip');
    const gd=dt?{fs:+parseFloat(getComputedStyle(dt).fontSize).toFixed(1),
                 h:Math.round(dt.getBoundingClientRect().height/Z)}:null;
    return {dtag:gd, badge:g('.badge'), mk:g('.mkchip'), st:g('.status'),
      ex:g('.pexist .ebox'), card:Math.round(c.getBoundingClientRect().height/Z)};
  });
  console.log('   タグ', JSON.stringify(t));
  ok(t.dtag && t.dtag.fs>=12,'不具合タグの文字が大きくなった（12→13.5px）', t.dtag&&t.dtag.fs+'px');
  ok(t.dtag && t.dtag.h<=24,'枠の高さは変わっていない', t.dtag&&t.dtag.h+'px');
  /* プルダウンの文字 */
  await p.click('#list .pcard .pexist .ebox[data-f="kizon"]'); await p.waitForTimeout(300);
  const selFs=await p.evaluate(()=>{const s=document.querySelector('#list .pcard .pexist select');
    return s? +parseFloat(getComputedStyle(s).fontSize).toFixed(1):null;});
  ok(selFs!=null && selFs<=12,'写真の下のプルダウンが大きすぎない', selFs+'px');
  await p.keyboard.press('Escape');
  ok(errs.length===0,'JSエラーなし', errs.join('|').slice(0,150));
  if(W===2000) await p.screenshot({path:'menu3.png'});
  await ctx.close();
}
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
