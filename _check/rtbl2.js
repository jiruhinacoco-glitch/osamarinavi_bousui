/* 2026-08-23j の検証（屋根の表・モック準拠）：
   ①窓と同じ「境界線をドラッグ」で拡大縮小（境界で ↔ カーソル）
   ②たたむ/位置ボタン廃止・右上✕で閉じる→「▦ 屋根の表」で開き直す
   ③列＝屋根|下地|高さ|平場|仕様|立上り㎡|仕様|総面積（平場と立上りで仕様が別）
   ④更新が速い（デバウンス90ms）／緑の見出し行をつかんで移動
   ⑤躯体GL+は3Dのカード（nnBlLive）から＝面とは別に動く
   node _check/rtbl2.js
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL='http://localhost:8899/zumen_sekisan.html';
let okN=0,ngN=0;
const chk=(n,c,i)=>{ console.log((c?'○ ':'★NG ')+n+(i!==undefined?('  '+JSON.stringify(i)):'')); c?okN++:ngN++; };

(async()=>{
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await (await br.newContext({viewport:{width:1600,height:900}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{ if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(600);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){} localStorage.removeItem('nn_zumen_rtblpos'); });
  await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){}});

  await p.evaluate(()=>{
    const E=n=>Array.from({length:n},()=>({h:300,w:250,k:'para'}));
    state.polys=[
      {name:'屋根①',lv:0,bodyLv:0,pts:[{x:2,y:2},{x:12,y:2},{x:12,y:10},{x:2,y:10}],edges:E(4)},
      {name:'屋根②',lv:0,bodyLv:0,pts:[{x:14,y:2},{x:22,y:2},{x:22,y:10},{x:14,y:10}],edges:E(4)}
    ];
    state.active=0; state.specCode='AS-T1'; saveState(); renderPolyList(); recalc(); draw();
  });
  await p.waitForTimeout(400);

  /* ---- ③ 列の構成 ---- */
  const t0=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    const Z=window.nnPZ||1, r=t.getBoundingClientRect(), mr=t.parentNode.getBoundingClientRect();
    return {th:[...t.querySelectorAll('th')].map(x=>x.textContent),
      cl:!!t.querySelector('.rcl'), grip:!!t.querySelector('.rgrip'),
      fold:!!t.querySelector('.rfold'), rst:!!t.querySelector('.rrst'), sz:!!t.querySelector('.rsz'),
      sp:t.querySelectorAll('select.rsp').length, st:t.querySelectorAll('select.rst').length,
      x:(r.left-mr.left)/Z, y:(r.top-mr.top)/Z, w:r.width/Z, h:r.height/Z};
  });
  /* ★2026-08-28b 現況（仕上がりの見た目）の列が「仕様」と「立上り㎡」の間に増えた（§230） */
  /* ★2026-08-30c 水勾配の列が「現況」の右に増えた */
  chk('列＝屋根|下地|高さ|立上り|天端|平場|仕様|勾配|立上り㎡|仕様|総面積（現況は工程バーへ・2026-09-04i）',
      t0.th.join(',')==='屋根,下地,高さ,立上りmm,天端mm,平場,仕様,勾配,立上り㎡,仕様,総面積,', t0.th.join('|'));
  chk('右上に ✕（閉じる）がある', t0.cl);
  chk('「たたむ」「位置」ボタンは無い', !t0.grip&&!t0.fold&&!t0.rst&&!t0.sz);
  chk('仕様プルダウンが平場・立上りで別（各2個）', t0.sp===2&&t0.st===2, {平場:t0.sp,立上り:t0.st});

  /* 面積の列（10×8マス×0.5m=5×4m → 平場20㎡・立上り(4.8+…)） */
  const ar=await p.evaluate(()=>{
    const tds=[...document.querySelectorAll('#nnRoofTbl tr.rrow[data-pi="0"] td.c')].map(x=>x.textContent);
    return tds;
  });
  chk('平場・立上り㎡・総面積が数字で出る', ar.length===3&&/㎡/.test(ar[0])&&/㎡/.test(ar[2]), ar);
  const arOk=await p.evaluate(()=>{
    const q=quantities(state.polys[0],state.scaleM);
    const tds=[...document.querySelectorAll('#nnRoofTbl tr.rrow[data-pi="0"] td.c')].map(x=>parseFloat(x.textContent));
    return {q:[+q.hira.toFixed(1),+(q.tachi+q.tenba).toFixed(1)], tds};
  });
  chk('平場＋立上り＝総面積（数字が合う）',
      Math.abs(arOk.tds[0]+arOk.tds[1]-arOk.tds[2])<0.11 && Math.abs(arOk.tds[0]-arOk.q[0])<0.11, arOk);

  /* ---- ① 境界線で ↔ カーソル・ドラッグで拡大縮小 ---- */
  const edge=await p.evaluate(()=>{
    const r=document.getElementById('nnRoofTbl').getBoundingClientRect();
    return {rx:r.right-3, my:r.top+r.height/2, bx:r.left+r.width/2, by:r.bottom-3,
      lx:r.left+3, w:r.width, h:r.height};
  });
  await p.mouse.move(edge.rx, edge.my); await p.waitForTimeout(150);
  const cur1=await p.evaluate(()=>document.getElementById('nnRoofTbl').style.cursor);
  chk('右の境界線にマウス＝↔（ew-resize）', cur1==='ew-resize', cur1);
  await p.mouse.move(edge.bx, edge.by); await p.waitForTimeout(150);
  const cur2=await p.evaluate(()=>document.getElementById('nnRoofTbl').style.cursor);
  chk('下の境界線にマウス＝↕（ns-resize）', cur2==='ns-resize', cur2);

  /* 左端をつかんで左へ＝広がる */
  await p.mouse.move(edge.lx, edge.my); await p.mouse.down();
  await p.mouse.move(edge.lx-160, edge.my, {steps:6}); await p.mouse.up();
  await p.waitForTimeout(250);
  const t1=await p.evaluate(()=>{
    const Z=window.nnPZ||1, r=document.getElementById('nnRoofTbl').getBoundingClientRect();
    let sv=null; try{ sv=JSON.parse(localStorage.getItem('nn_zumen_rtblpos')||'null'); }catch(_){}
    return {w:r.width/Z, sv};
  });
  chk('境界線のドラッグで広がる（約+160px）', Math.abs((t1.w-t0.w)-160)<24, {前:Math.round(t0.w),後:Math.round(t1.w)});
  chk('大きさが保存される', !!(t1.sv&&t1.sv.w), t1.sv);

  /* 下端をつかんで下へ＝高くなる */
  const e2=await p.evaluate(()=>{ const r=document.getElementById('nnRoofTbl').getBoundingClientRect();
    return {x:r.left+r.width/2, y:r.bottom-3}; });
  await p.mouse.move(e2.x,e2.y); await p.mouse.down();
  await p.mouse.move(e2.x, e2.y+90, {steps:6}); await p.mouse.up(); await p.waitForTimeout(250);
  const t2=await p.evaluate(()=>{
    const Z=window.nnPZ||1, r=document.getElementById('nnRoofTbl').getBoundingClientRect();
    return {h:r.height/Z}; });
  chk('下の境界線で高さも変わる（約+90px）', Math.abs((t2.h-t0.h)-90)<24, {前:Math.round(t0.h),後:Math.round(t2.h)});

  /* ---- ④ 緑の見出し行をつかんで移動 ---- */
  const th=await p.evaluate(()=>{ const e=document.querySelector('#nnRoofTbl th');
    const r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; });
  const before=await p.evaluate(()=>{ const Z=window.nnPZ||1;
    const r=document.getElementById('nnRoofTbl').getBoundingClientRect();
    const mr=document.querySelector('main').getBoundingClientRect();
    return {x:(r.left-mr.left)/Z, y:(r.top-mr.top)/Z}; });
  await p.mouse.move(th.x,th.y); await p.mouse.down();
  await p.mouse.move(th.x-280, th.y+140, {steps:6}); await p.mouse.up(); await p.waitForTimeout(250);
  const after=await p.evaluate(()=>{ const Z=window.nnPZ||1;
    const r=document.getElementById('nnRoofTbl').getBoundingClientRect();
    const mr=document.querySelector('main').getBoundingClientRect();
    return {x:(r.left-mr.left)/Z, y:(r.top-mr.top)/Z}; });
  chk('見出し行のドラッグで表が動く', Math.abs((before.x-after.x)-280)<24 && Math.abs((after.y-before.y)-140)<24,
      {前:[Math.round(before.x),Math.round(before.y)], 後:[Math.round(after.x),Math.round(after.y)]});

  /* ---- ② ✕で閉じる → ▦で開き直す ---- */
  await p.click('#nnRoofTbl .rcl'); await p.waitForTimeout(250);
  const cl=await p.evaluate(()=>({
    tbl:getComputedStyle(document.getElementById('nnRoofTbl')).display,
    chip:(()=>{ const c=document.getElementById('nnRoofOpen');
      return c?getComputedStyle(c).display:'no'; })()
  }));
  chk('✕で表が消える', cl.tbl==='none', cl.tbl);
  chk('「▦ 屋根の表」の開き直しボタンが出る', cl.chip==='block', cl.chip);
  await p.click('#nnRoofOpen'); await p.waitForTimeout(250);
  const re=await p.evaluate(()=>({
    tbl:getComputedStyle(document.getElementById('nnRoofTbl')).display,
    chip:getComputedStyle(document.getElementById('nnRoofOpen')).display,
    x:(()=>{ const Z=window.nnPZ||1;
      const r=document.getElementById('nnRoofTbl').getBoundingClientRect();
      const mr=document.querySelector('main').getBoundingClientRect();
      return Math.round((r.left-mr.left)/Z); })()
  }));
  chk('▦で表が戻る（場所・大きさもそのまま）', re.tbl!=='none'&&re.chip==='none'&&Math.abs(re.x-after.x)<6, re);

  /* 再読み込みでも場所・大きさ・開閉が残る */
  await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){}});
  const pv=await p.evaluate(()=>{ const Z=window.nnPZ||1;
    const t=document.getElementById('nnRoofTbl'), r=t.getBoundingClientRect();
    const mr=document.querySelector('main').getBoundingClientRect();
    return {disp:getComputedStyle(t).display, x:Math.round((r.left-mr.left)/Z), w:Math.round(r.width/Z)}; });
  chk('再読み込みしても同じ場所・同じ大きさ', pv.disp!=='none'&&Math.abs(pv.x-after.x)<6&&Math.abs(pv.w-t1.w)<6, pv);

  /* ---- ③ 立上りの仕様を別に選ぶと積算が分かれる ---- */
  const spx=await p.evaluate(()=>{
    const t=document.getElementById('nnRoofTbl');
    const s0=t.querySelectorAll('select.rst')[0];
    s0.value='X-2'; s0.dispatchEvent(new Event('change',{bubbles:true}));
    return {specT:state.polys[0].specT, spec:state.polys[0].spec||state.specCode,
      sek:document.getElementById('sekisan').innerHTML};
  });
  chk('立上りの仕様が保存される（specT=X-2）', spx.specT==='X-2', spx.specT);
  chk('積算：平場はAS-T1・立上りはX-2で行が分かれる',
      /平場（AS-T1）/.test(spx.sek)&&/立上り（X-2）/.test(spx.sek), '');
  const ed=await p.evaluate(()=>{
    const d=nnEstimateData();
    return {rows:d.rows.map(x=>x.n), pt:d.polys[0].specT};
  });
  chk('見積データも立上りがX-2の単価', ed.rows.some(n=>/立上り防水（X-2）/.test(n))&&ed.pt==='X-2', ed.rows);

  /* ---- ④ 更新の速さ（90msデバウンス） ---- */
  const sp90=await p.evaluate(()=>new Promise(res=>{
    const t0=performance.now();
    const _d=window.draw; let done=false;
    window.draw=function(){ if(!done){ done=true; res(Math.round(performance.now()-t0)); window.draw=_d; }
      return _d.apply(this,arguments); };
    nnLvLive(0, 1.5);      /* commitなし＝デバウンス経由 */
    setTimeout(()=>{ if(!done){ done=true; res(9999); window.draw=_d; } }, 3000);
  }));
  chk('高さの反映が速い（250ms以内に描き直し）', sp90<250, sp90+'ms');

  /* ---- ⑤ 躯体GL+は廃止（2026-08-24p）----
     ★3Dの組み立ては平場の高さ（lv）しか見ていないので、「躯体GL+」は押しても何も起きない
       飾りだった。しかも値が平場とずれると、壁の足元や境界の辺の種別を古い高さで決めてしまい、
       塔屋が宙に浮く不具合になっていた。いまは高さの持ち主は lv ひとつだけ。＝無いのが正しい。 */
  await p.evaluate(()=>{ setTab('d3'); });
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:15000});
  await p.evaluate(()=>{ state.active=0; if(window.nnPolySync)nnPolySync(); });
  const cd=await p.evaluate(()=>{ const d=document.getElementById('nnPolyCard');
    return {欄なし:!document.getElementById('nnPvBl'), カード:!!(d&&d.classList.contains('on')),
            関数なし:(typeof window.nnBlLive==='undefined'&&typeof window.nnLvFollow==='undefined'),
            bodyLvなし:state.polys[0].bodyLv===undefined}; });
  chk('3Dのカードに「躯体GL+」の欄は無い（廃止）', cd.欄なし, cd);
  chk('効かない処理（nnBlLive／nnLvFollow）も残っていない', cd.関数なし);
  chk('部位は bodyLv という項目を持たない', cd.bodyLvなし);
  chk('カードそのものは出る（面GL+は使える）', cd.カード);

  chk('JSエラーなし', errs.length===0, errs.slice(0,3));
  console.log('○'+okN+' ★NG'+ngN);
  await br.close(); process.exit(ngN?1:0);
})();
