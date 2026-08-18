/* ★2026-08-15g 現場マップの現場一覧：防水アイコンをステータスの上／数量・工法・仕様を枠に／角は四角
   使い方: node maprow.js        （パソコン 1600px）
           node maprow.js ph     （スマホたて） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**maps.googleapis.com**', r=>r.abort());
  await p.addInitScript(()=>{ localStorage.setItem('osamari_maps_key','dummy'); });
  await p.goto('http://localhost:8899/genba_map_v36.html'); await p.waitForTimeout(1800);
  await p.evaluate(()=>{ const e=document.getElementById('setup'); if(e)e.style.display='none';
    const pn=document.getElementById('panel'); if(pn)pn.style.display='flex'; });
  await p.waitForTimeout(400);

  const g=await p.evaluate(()=>{
    const rows=[...document.querySelectorAll('#panel .site')];
    const s0=rows[0];
    const cs=getComputedStyle(s0);
    const kic=s0.querySelector('.kic'), bd=s0.querySelector('.badge');
    const kr=kic.getBoundingClientRect(), br=bd.getBoundingClientRect();
    const chips=[...s0.querySelectorAll('.mch')];
    return {
      rows:rows.length,
      radius:cs.borderRadius, badgeRadius:getComputedStyle(bd).borderRadius,
      chipRadius:getComputedStyle(chips[0]).borderRadius,
      chipTexts:chips.map(x=>x.textContent),
      chipFont:parseFloat(getComputedStyle(chips[0]).fontSize),
      nmFont:parseFloat(getComputedStyle(s0.querySelector('.nm')).fontSize),
      kicAbove: kr.bottom<=br.top+1,
      sameCol: Math.abs((kr.left+kr.width/2)-(br.left+br.width/2))<3,
      kicBox:[Math.round(kr.width),Math.round(kr.height)],
      heights:[...new Set(rows.slice(0,30).map(x=>Math.round(x.getBoundingClientRect().height)))],
      over:rows.filter(x=>x.scrollWidth>x.clientWidth+1).length,
      title:s0.querySelector('.mch.mk').getAttribute('title'),
      chipBg:getComputedStyle(chips[0]).backgroundColor,
      chipShadow:getComputedStyle(chips[0]).boxShadow,
      rowBg:cs.backgroundColor, rowShadow:cs.boxShadow,
      msBg:getComputedStyle(s0.querySelector('.mch.ms')).backgroundColor,
      msColor:getComputedStyle(s0.querySelector('.mch.ms')).color,
      badgeBg:getComputedStyle(bd).backgroundColor, badgeColor:getComputedStyle(bd).color,
      panelOver:(()=>{const pn=document.getElementById('panel');return pn.scrollWidth>pn.clientWidth+1;})()
    };
  });
  console.log(JSON.stringify(g,null,1));
  ok('現場は100件のまま', g.rows===100, g.rows+'件');
  ok('行の角は四角（丸めない）', g.radius==='0px', g.radius);
  ok('ステータスの角も四角に近い（2px以下）', parseFloat(g.badgeRadius)<=2, g.badgeRadius);
  /* ★2026-08-15j 記録帳と同じ質感（白地・地味な枠・影なし）か */
  ok('小枠は白地・影なし（AIっぽい淡色やグラデを使わない）',
     g.chipBg==='rgb(255, 255, 255)' && g.chipShadow==='none', g.chipBg+' / '+g.chipShadow);
  ok('行も白地・影なし', g.rowBg==='rgb(255, 255, 255)' && g.rowShadow==='none', g.rowBg+' / '+g.rowShadow);
  ok('仕様記号は記録帳と同じ「色を塗って白文字」', g.msColor==='rgb(255, 255, 255)' && g.msBg!=='rgba(0, 0, 0, 0)',
     g.msBg+' / '+g.msColor);
  ok('ステータスも色を塗って白文字（半透明の淡色をやめた）',
     g.badgeColor==='rgb(255, 255, 255)', g.badgeBg+' / '+g.badgeColor);
  ok('数量・工法名・仕様がそれぞれ枠に入っている', g.chipTexts.length===3, JSON.stringify(g.chipTexts));
  ok('数量の枠に㎡が入る', /㎡|m$/.test(g.chipTexts[0]), g.chipTexts[0]);
  ok('仕様記号だけの枠がある（AS-J1 など）', /^[A-Z]/.test(g.chipTexts[2]||''), g.chipTexts[2]);
  ok('文字は物件名より小さい', g.chipFont<g.nmFont, g.chipFont+'px ＜ '+g.nmFont+'px');
  ok('★防水アイコンはステータスの上', g.kicAbove && g.sameCol, JSON.stringify({上:g.kicAbove,同じ列:g.sameCol}));
  ok('アイコンの枠は横長（正方形にしない）', g.kicBox[0]>g.kicBox[1], g.kicBox.join('×'));
  ok('行の高さがそろっている（2種類以内）', g.heights.length<=2, JSON.stringify(g.heights));
  ok('横はみ出し0', g.over===0 && !g.panelOver, '行'+g.over+'件');
  ok('工法の全文はマウスで出る（title）', !!g.title && g.title.length>0, g.title);

  /* 工法アイコンのキーは記録帳と同じ決め方（共通ファイル）を使っているか */
  const key=await p.evaluate(()=>({
    shared:!!window.nnKouKeyOf,
    a:window.nnKouKeyOf&&nnKouKeyOf('改質アスファルト 常温粘着工法(AS-J1)').key,
    b:window.nnKouKeyOf&&nnKouKeyOf('塩ビシート 機械的固定工法(S-M1)').key,
    c:window.nnKouKeyOf&&nnKouKeyOf('FRP防水(L-FF)').key}));
  console.log('キー', JSON.stringify(key));
  ok('工法アイコンのキーは共通ファイルから', key.shared && key.a==='nenchaku' && key.b==='enbi_kikai' && key.c==='frp',
     JSON.stringify(key));

  /* ★地図の上の見出し（マーカーのチップ）：白地・物件名は黒・施工中は緑の稼働バー */
  const chip=await p.evaluate(()=>{
    const host=document.createElement('div'); host.id='__chiptest';
    host.style.cssText='position:fixed;left:-9999px;top:0;';
    const w=SITES.find(x=>x.st==='work'), d=SITES.find(x=>x.st==='done');
    host.appendChild(chipContent(w,2)); host.appendChild(chipContent(d,2));
    document.body.appendChild(host);
    const c=host.querySelectorAll('.mk-chip');
    const bar=c[0].querySelector('.mk-prog');
    const r={bg:getComputedStyle(c[0]).backgroundColor,
      nm:getComputedStyle(c[0].querySelector('.nm')).color,
      st:getComputedStyle(c[0].querySelector('.st')).color,
      radius:getComputedStyle(c[0]).borderRadius,
      barWork:!!bar, barFill:bar?getComputedStyle(bar.firstElementChild).backgroundImage:'',
      barPct:bar?bar.firstElementChild.style.width:'', prog:w.prog,
      barDone:!!c[1].querySelector('.mk-prog')};
    host.remove(); return r;
  });
  console.log('チップ', JSON.stringify(chip));
  ok('地図の見出しは白地', chip.bg==='rgb(255, 255, 255)', chip.bg);
  ok('物件名は黒', chip.nm==='rgb(17, 17, 17)', chip.nm);
  ok('ステータスの文字は状態色のまま', chip.st!=='rgb(17, 17, 17)', chip.st);
  ok('★施工中は緑の稼働バーが出る', chip.barWork && /gradient/.test(chip.barFill) && chip.barPct===chip.prog+'%',
     chip.barPct+' / '+chip.barFill.slice(0,40));
  ok('施工中以外にはバーを出さない', chip.barDone===false, String(chip.barDone));

  /* ★2026-08-15k 地図の吹き出し：✕で閉じられる・記録帳と同じ作り */
  const box=await p.evaluate(()=>{
    const host=document.createElement('div'); host.id='__mkxtest';
    host.style.cssText='position:fixed;left:-9999px;top:0;';
    const w=SITES.find(x=>x.st==='work');
    host.appendChild(expandedContent(w)); document.body.appendChild(host);
    const bd=host.querySelector('.mkx-body'), cs=getComputedStyle(bd);
    const cl=host.querySelector('.x-close');
    const bx=host.querySelector('.x-box'), bxs=bx?getComputedStyle(bx):null;
    const pg=host.querySelector('.x-pg');
    const r={close:!!cl, closeText:cl?cl.textContent.trim():'',
      radius:cs.borderRadius, bg:cs.backgroundColor,
      boxBg:bxs?bxs.backgroundColor:'', boxRadius:bxs?bxs.borderRadius:'',
      progTube:pg?getComputedStyle(pg).backgroundImage:'',
      progFill:pg?getComputedStyle(pg.firstElementChild).backgroundImage:'',
      dolls:host.querySelectorAll('.x-workers .w').length,
      btnRadius:getComputedStyle(host.querySelector('.x-log')).borderRadius};
    host.remove(); return r;
  });
  console.log('吹き出し', JSON.stringify(box));
  ok('★吹き出しに✕（閉じる）がある', box.close && box.closeText==='✕', box.closeText);
  ok('吹き出しは白地・角0（記録帳と同じ）', box.bg==='rgb(255, 255, 255)' && box.radius==='0px',
     box.bg+' / '+box.radius);
  ok('中身は記録帳と同じ「囲み」（白地・角0）', box.boxBg==='rgb(255, 255, 255)' && box.boxRadius==='0px',
     box.boxBg+' / '+box.boxRadius);
  ok('進行度は記録帳と同じ黒い筒＋緑', /gradient/.test(box.progTube) && /gradient/.test(box.progFill),
     box.progTube.slice(0,30));
  ok('人形の絵はやめた（他の画面に無く浮くため）', box.dolls===0, box.dolls+'個');
  ok('ボタンの丸みも小さい（3px以下）', parseFloat(box.btnRadius)<=3, box.btnRadius);

  /* ✕を押すと選択が解除される（＝吹き出しが閉じる） */
  const closed=await p.evaluate(async()=>{
    select(SITES[0].id);
    await new Promise(r=>setTimeout(r,300));
    const before=selId;
    const host=document.createElement('div'); host.id='__mkxtest2';
    host.style.cssText='position:fixed;left:-9999px;top:0;';
    host.appendChild(expandedContent(SITES[0])); document.body.appendChild(host);
    host.querySelector('.x-close').click();
    await new Promise(r=>setTimeout(r,300));
    const after=selId; host.remove();
    return {before, after};
  });
  ok('✕を押すと選択が解除される（吹き出しが閉じる）', closed.before && !closed.after, JSON.stringify(closed));

  /* 左パネルのタブも角を四角に（AI感の丸いピルをやめた） */
  const tab=await p.evaluate(()=>{
    const t=document.querySelector('.tabs .tab');
    const on=document.querySelector('.tabs .tab.on');
    return {radius:getComputedStyle(t).borderRadius, onBg:getComputedStyle(on).backgroundColor,
      fbRadius:getComputedStyle(document.querySelector('.float-btn')).borderRadius};
  });
  ok('タブの角は四角（3px以下）', parseFloat(tab.radius)<=3, tab.radius);
  ok('地図まわりのボタンも四角（3px以下）', parseFloat(tab.fbRadius)<=3, tab.fbRadius);

  /* 選んだときの見た目・クリックが今までどおり効くか */
  await p.evaluate(()=>{ document.querySelectorAll('#panel .site')[1].click(); });
  await p.waitForTimeout(400);
  const sel=await p.evaluate(()=>{
    const r=document.querySelectorAll('#panel .site')[1];
    return {sel:r.classList.contains('sel'), bg:getComputedStyle(r).backgroundColor,
      selId:selId};
  });
  ok('行を押すと選択できる（今までどおり）', sel.sel, JSON.stringify(sel));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン 1600px】'));
  console.log(R.join('\n'));
  await b.close();
})();
