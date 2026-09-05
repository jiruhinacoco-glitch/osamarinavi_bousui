/* ★2026-09-05e 入口メニュー：行の順番／立上り・天端／3D模型のリアルタイム反映 ＝ §287
   使い方: node _check/zprev3d.js ／ node _check/zprev3d.js ph */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const ph=process.argv[2]==='ph'; const R=[]; const ok=(n,c,d)=>R.push((c?'○ ':'★NG ')+n+(d?'  '+d:''));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(ph?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1900,height:1050}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
if(ph) await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(ph?3600:3000);

/* ① 行の順番（本人の指示） */
const rows=await p.evaluate(()=>[...document.querySelector('.zmCard').querySelectorAll('.zmRow>i')].map(x=>x.textContent).join('/'));
ok('①行の順番＝構造体→躯体下地→工事区分→既存防水→既存断熱材→新規防水→パラペット設定',
   rows==='構造体/躯体下地/工事区分/既存防水/既存断熱材/新規防水/パラペット設定', rows);
/* ② 「対応可能な機能」はタイトルの中（右） */
const ft=await p.evaluate(()=>{const c=document.querySelector('.zmCard');
  return {inTtl:!!c.querySelector('.zmTtl .zmFeatBox'), n:c.querySelectorAll('.zmFeat .ft').length,
          ttl:parseFloat(getComputedStyle(c.querySelector('.zmTtl>.httl')).fontSize)};});
ok('②機能の絵はタイトルの行にある', ft.inTtl && ft.n===3, JSON.stringify(ft));
ok('②タイトルは1.2倍（PC18px／スマホ17px前後）', ph?(ft.ttl>=15&&ft.ttl<=18):(ft.ttl>=17&&ft.ttl<=19), ft.ttl+'px');
/* ③ チップ：角は浅く・絵は大きく・文字は緑帯に白抜き */
const chip=await p.evaluate(()=>{const c=document.querySelector('.zmCard .kzB[data-kz]'), i=c.querySelector('i'), im=c.querySelector('.kzIc img');
  const cs=getComputedStyle(c), is=getComputedStyle(i);
  return {r:parseFloat(cs.borderRadius), img:im?Math.round(im.getBoundingClientRect().height/(window.nnPZ||1)):0,
          col:is.color, bg:is.backgroundImage.slice(0,15), fs:parseFloat(is.fontSize)};});
ok('③チップの角は浅い（6px以下）', chip.r<=6, chip.r+'px');
ok('③絵が大きい（PC50px／スマホ32px以上）', ph?chip.img>=30:chip.img>=48, chip.img+'px');
ok('③文字は緑の帯に白抜き', /255, 255, 255/.test(chip.col) && chip.bg==='linear-gradient', chip.col+' '+chip.bg);
/* ④ パラペット設定に 立上り・天端 */
const pv=await p.evaluate(()=>{const c=document.querySelector('.zmCard');
  return {h:(c.querySelector('.zmAgoRow .pvH')||{}).value, w:(c.querySelector('.zmAgoRow .pvW')||{}).value};});
ok('④パラペット設定に 立上り・天端（mm）', pv.h==='300'&&pv.w==='250', JSON.stringify(pv));
/* ⑤ 3D模型が、選んだものをそのまま組んでいる（リアルタイム） */
const key=()=>p.evaluate(()=>window.nnZMenuPrevKey('zu')||'');
const k0=await key();
ok('⑤模型の中身＝構造体|下地|区分|既存防水|断熱|アゴ|立上り|天端', /^rc\|conc\|kaishu\|fumei\|0\|0\|300\|250$/.test(k0), k0);
await p.evaluate(()=>{const c=document.querySelector('.zmCard'); c.querySelector('.kzB[data-dn="1"]').click(); c.querySelector('.dnT').value=120;});
await p.waitForTimeout(700);
const k1=await key(); ok('⑤既存断熱あり＋厚み120 → 模型に入る', /\|kaishu\|fumei\|120\|/.test(k1), k1);
await p.evaluate(()=>{const c=document.querySelector('.zmCard'); const dd=c.querySelector('.zmDd[data-set="ki"]'); dd.click();
  const row=[...document.querySelectorAll('#zmDdMenu .row')].find(r=>r.dataset.v==='osae'); if(row) row.click();});
await p.waitForTimeout(700);
const k2=await key(); ok('⑤既存防水を選ぶ → 模型に入る（押えコンクリート）', /\|osae\|/.test(k2), k2);
await p.evaluate(()=>{const c=document.querySelector('.zmCard'); c.querySelector('.agoB[data-ago="1"]').click();
  c.querySelector('.pvH').value=600; c.querySelector('.pvW').value=300;});
await p.waitForTimeout(700);
const k3=await key(); ok('⑤アゴあり・立上り600・天端300 → 模型に入る', /\|1\|600\|300$/.test(k3), k3);
/* 絵が本当に描かれている（その場で描き直して読む・§183）。
   ★外から webgl の中身を読み直しても空になる（描き終わると捨てられるため）。ページ側の hook を使う */
const shot=await p.evaluate(()=>window.nnZMenuPrevShot?nnZMenuPrevShot('zu'):'');
ok('⑤模型が実際に描かれている', /^data:image\/png/.test(shot) && shot.length>3000, String(shot).slice(0,30)+' len='+shot.length);
/* ⑥ 新築にすると既存防水・既存断熱の行を出さない */
await p.evaluate(()=>document.querySelector('.zmCard .kbB[data-kubun="shinchiku"]').click());
await p.waitForTimeout(500);
const sin=await p.evaluate(()=>{const c=document.querySelector('.zmCard');
  return [...c.querySelectorAll('.zmRow')].filter(r=>getComputedStyle(r).display!=='none').map(r=>r.querySelector('i').textContent).join('/');});
ok('⑥新築では 既存防水・既存断熱材 を出さない', !/既存/.test(sin), sin);
const k4=await key(); ok('⑥新築の模型には既存防水・断熱を積まない', /\|shinchiku\|\|0\|/.test(k4), k4);
await p.evaluate(()=>document.querySelector('.zmCard .kbB[data-kubun="kaishu"]').click());
/* ⑦ 「はじめる」で 立上り・天端 が既定に入る */
await p.waitForTimeout(300);
await p.evaluate(()=>{const c=document.querySelector('.zmCard'); c.querySelector('.pvH').value=450; c.querySelector('.pvW').value=280;
  c.querySelector('.zmGoB').click();});
await p.waitForTimeout(700);
const def=await p.evaluate(()=>({h:document.getElementById('defH').value, w:document.getElementById('defW').value}));
ok('⑦はじめる → 立上り450・天端280 が初期値に入る', def.h==='450'&&def.w==='280', JSON.stringify(def));
ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
console.log(R.join('\n')); console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
await b.close();})();
