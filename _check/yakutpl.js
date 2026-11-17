/* 役物の見本「⑤ 会社の型」に 材料・手間・手順・写真 をくっつけて残し、図面・積算の数量と金額に乗るか（§1305）。端から端まで通す。
   ①保存の窓で 材料2行（防水1㎡あたり／1個あたり）・手間・手順・写真 → 保存 ②呼び出した型の中身＝1個あたりの金額（検算は自分で計算）
   ③寸法を変えると 防水に合わせた材料の数量・金額が変わる ④図面・積算に登録 → 単価＝材料費＋手間・材料の内訳が入る
   ⑤図面に3個置く → 積算の表に 単価×3、「役物の材料（内訳）」に 材料×3 ⑥開き直しても型の中身が残る ⑦PC・iPhone 13 で窓が画面からはみ出さない・エラー0
   使い方: node _check/yakutpl.js [kadai_mihon.html]   前提: python3 -m http.server 8899 */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kadai_mihon.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const near=(a,b,t)=>Math.abs(a-b)<=(t||1);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [tag,opt] of [['PC',{viewport:{width:1366,height:800}}],['iPhone',{...devices['iPhone 13']}]]){
  const ctx=await b.newContext(opt); const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1500);
  /* ① 保存の窓 */
  await p.click('#tplSave'); await p.waitForSelector('#tEdit:not([hidden])');
  await p.fill('#teName','空調基礎 A棟タイプ');
  await p.fill('#tEditIn .mr:nth-child(1) .mn','増し張り用シート'); await p.selectOption('#tEditIn .mr:nth-child(1) .mb','wp');
  await p.fill('#tEditIn .mr:nth-child(1) .mq','1.1'); await p.fill('#tEditIn .mr:nth-child(1) .mu','㎡'); await p.fill('#tEditIn .mr:nth-child(1) .mp','1200');
  await p.click('#teAdd');
  await p.fill('#tEditIn .mr:nth-child(2) .mn','シーリング材'); await p.selectOption('#tEditIn .mr:nth-child(2) .mb','fix');
  await p.fill('#tEditIn .mr:nth-child(2) .mq','0.5'); await p.fill('#tEditIn .mr:nth-child(2) .mu','本'); await p.fill('#tEditIn .mr:nth-child(2) .mp','900');
  await p.fill('#teLq','0.2'); await p.fill('#teLp','25000');
  await p.fill('#teMemo','入隅に先打ちシール→補強クロス→2層');
  await p.setInputFiles('#tePh','/home/user/osamarinavi_bousui/icons/roofph_1.jpg'); await p.waitForSelector('#tEditIn .phs img',{timeout:5000}).catch(()=>{});
  const win=await p.evaluate(()=>{ const r=document.querySelector('#tEdit .tbox').getBoundingClientRect(), W=document.documentElement.clientWidth;
    const cut=[...document.querySelectorAll('#tEditIn input,#tEditIn select,#tEditIn button')].filter(e=>{ const q=e.getBoundingClientRect(); return q.width>0&&(q.right>W+0.5||q.left<-0.5||q.width<20); }).length;
    return {l:Math.round(r.left), r:Math.round(r.right), W, cut, ph:document.querySelectorAll('#tEditIn .phs img').length}; });
  ok(win.l>=0&&win.r<=win.W&&win.cut===0, tag+' ①窓が画面に収まり、入力欄が切れない', win);
  ok(win.ph===1, tag+' ①写真が1枚入る', win.ph);
  await p.click('#teOk'); await p.waitForTimeout(400);
  /* ② 呼び出した型の中身（検算：防水㎡は登録用の値 addM2 を直接読む） */
  const c1=await p.evaluate(()=>{ const pa=partOf(); const t=document.querySelector('#tplCur table.tm'); return {wp:pa.addM2, sl:pa.sealM, txt:t?t.innerText:'', shown:getComputedStyle(document.getElementById('tplCur')).display};});
  const exp1=Math.round(1.1*c1.wp*1200)+Math.round(0.5*900)+Math.round(0.2*25000);
  const yen1=+((c1.txt.match(/合計[^¥]*¥([\d,]+)/)||[0,'0'])[1].replace(/,/g,''));
  ok(c1.shown==='block'&&near(yen1,exp1,2), tag+' ②保存した型が呼び出された状態で、1個あたり＝材料＋手間', {防水:c1.wp, 出た:yen1, 計算:exp1});
  /* ③ 寸法を変える（幅を大きく） */
  await p.fill('#n_W','1500'); await p.dispatchEvent('#n_W','input'); await p.waitForTimeout(300);
  const c2=await p.evaluate(()=>{ const pa=partOf(); const t=document.querySelector('#tplCur table.tm'); return {wp:pa.addM2, txt:t?t.innerText:''}; });
  const exp2=Math.round(1.1*c2.wp*1200)+450+5000, yen2=+((c2.txt.match(/合計[^¥]*¥([\d,]+)/)||[0,'0'])[1].replace(/,/g,''));
  ok(c2.wp>c1.wp&&near(yen2,exp2,2), tag+' ③寸法を変えると材料の数量・金額も変わる', {防水:c1.wp+'→'+c2.wp, 金額:yen1+'→'+yen2, 計算:exp2});
  /* ④ 図面・積算に登録 */
  await p.click('#regBtn'); await p.waitForTimeout(300);
  const it=await p.evaluate(()=>{ const o=JSON.parse(localStorage.getItem('nn_zumen_parts_v1')); return o.items[o.items.length-1]; });
  ok(it&&near(it.price,exp2,2)&&it.mats&&it.mats.length===2&&near(it.mats[0].q,Math.round(1.1*c2.wp*1000)/1000,0.002)&&it.lab&&it.lab.q===0.2&&/空調基礎 A棟タイプ/.test(it.name)&&/補強クロス/.test(it.memo),
     tag+' ④登録：単価＝材料費＋手間・材料2種・手間・手順が入る', it&&{name:it.name, price:it.price, mats:it.mats, lab:it.lab});
  /* ⑥ 開き直しても型の中身が残る */
  await p.reload(); await p.waitForTimeout(1200);
  const keep=await p.evaluate(()=>{ const a=JSON.parse(localStorage.getItem('nn_yaku_tpl_v1')).items; const x=a[0]; return {n:a.length, name:x.name, mats:x.mats.length, ph:x.ph.length, memo:x.memo, list:document.querySelectorAll('#tplList .ti').length, thumb:!!document.querySelector('#tplList img.th')}; });
  ok(keep.n===1&&keep.mats===2&&keep.ph===1&&keep.list===1&&keep.thumb, tag+' ⑥開き直しても型（材料・写真・手順）が残り、一覧に写真つきで出る', keep);
  /* ⑤ 図面・積算で3個置いて積算を見る */
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500);
  const qt=await p.evaluate(async(id)=>{ try{nnZMenuClose();}catch(_){}
    try{ loadSample(); }catch(_){}
    state.parts=[{p:id,x:2,y:2,r:0},{p:id,x:4,y:2,r:0},{p:id,x:6,y:2,r:0}]; recalc(); await new Promise(r=>setTimeout(r,300));
    const q=document.getElementById('nnPartsQt'); return q?q.innerText:''; }, it.id);
  const rowAmt=+((qt.match(/3 個\s*¥[\d,]+\s*¥([\d,]+)/)||[0,'0'])[1].replace(/,/g,''));
  const sheetQ=+((qt.match(/増し張り用シート\s*([\d.]+)\s*㎡/)||[0,'0'])[1]);
  ok(near(rowAmt,it.price*3,3), tag+' ⑤積算の表：役物の金額＝単価×3個', {出た:rowAmt, 計算:it.price*3});
  ok(/役物の材料/.test(qt)&&near(sheetQ,Math.round(it.mats[0].q*3*100)/100,0.02)&&/シーリング材\s*1\.5\s*本/.test(qt)&&/0\.6\s*人工/.test(qt), tag+' ⑤「役物の材料（内訳）」に 材料×3・手間×3', qt.split('\n').filter(l=>/シート|シーリング|人工/.test(l)));
  ok(errs.length===0, tag+' ⑦JSエラーなし', errs.slice(0,2));
  await ctx.close();
 }
 console.log(ng?'★NG '+ng+'件':'全部○'); await b.close(); process.exit(ng?1:0);
})();
