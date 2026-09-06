/* ★2026-08-13n 現場記録帳の改修4件
   ①工法アイコンの画像枠 ②メーカー省略名 ③保管写真10枚（PCのみ）④提出書類3つ追加
   使い方: node kai1chk.js        （パソコン）
           node kai1chk.js ph     （スマホたて） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); });
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1600);
  await p.evaluate(()=>{ showView('list'); });
  await p.waitForTimeout(700);

  /* ② メーカーはすべて省略名 */
  const mk=await p.evaluate(()=>{
    const c={}; props.forEach(x=>{ c[x.maker]=(c[x.maker]||0)+1; });
    const long=props.filter(x=>/ルーフィング|プルーフィング|ポリマー建材|工業$/.test(x.maker||'')).length;
    return {list:c, long, full:props[0].makerFull, short:props[0].maker};
  });
  console.log('② メーカー', JSON.stringify(mk.list));
  ok('長いメーカー名が残っていない', mk.long===0, mk.long+'件');
  ok('田島ルーフィング→田島', !!mk.list['田島'], JSON.stringify(Object.keys(mk.list)));
  ok('ディックプルーフィング→ディック', !!mk.list['ディック']);
  ok('正式名は makerFull に残っている', /ルーフィング|プルーフィング|建材|工業/.test(mk.full||'')||mk.full===mk.short, mk.full);
  const chipTxt=await p.$$eval('#list .pcard .mkchip', el=>el.slice(0,6).map(x=>x.textContent.trim()));
  ok('一覧のチップも省略名', chipTxt.every(t=>t.length<=6), JSON.stringify(chipTxt));
  const fil=await p.evaluate(()=>{ lfCounts(); return lfVals.maker.map(v=>v[0]); });
  ok('絞り込みメニューも省略名', fil.every(v=>!/ルーフィング|プルーフィング|ポリマー建材|工業$/.test(v)), JSON.stringify(fil));

  /* ① 工法アイコンの枠 */
  const ki=await p.evaluate(()=>{
    const k=document.querySelector('#list .pcard .kicon'); if(!k)return null;
    const r=k.getBoundingClientRect(), Z=window.nnPZ||1;
    const img=k.querySelector('img');
    const st=getComputedStyle(k);
    return {w:+(r.width/Z).toFixed(1), h:+(r.height/Z).toFixed(1), border:st.borderStyle,
      src:(window.nnKiconFile?nnKiconFile(props[0]):null), cap:k.textContent.trim(),
      key:(window.nnKouKey?nnKouKey(props[0]).key:null), kou:props[0].kouhou,
      sameTorch:(window.nnKouKey?nnKouKey({kouhou:'改質アスファルト トーチ工法(AS-T2)'}).key===nnKouKey({kouhou:'改質アスファルトシート トーチ工法(AS-T1)'}).key:false),
      count:document.querySelectorAll('#list .pcard .kicon').length,
      inHead:!!k.closest('.rhead'), afterStatus:!!(k.previousElementSibling&&k.previousElementSibling.classList.contains('stsel'))};
  });
  console.log('① 工法アイコン', JSON.stringify(ki));
  ok('工法アイコンの枠がある', !!ki && ki.count>0, ki?ki.count+'個':'なし');
  ok('枠は現場名の行・ステータスの右', !!ki && ki.inHead && ki.afterStatus);
  ok('枠の大きさ', !!ki && ki.w>=36 && ki.h>=22, ki?ki.w+'x'+ki.h:'');
  /* ★2026-09-06i 絵が届いたので実線（無い工法は今までどおり点線）。§312 */
  ok('絵があれば実線・無ければ点線', !!ki && (ki.src? ki.border==='solid' : ki.border==='dashed'), ki&&(ki.border+' / '+ki.src));
  ok('ファイル名は工法のキー（記号ではない）', !!ki && /\/icons\/kou_[a-z_]+\.png(\?|$)/.test(ki.src||'') && !/AS-J1/.test(ki.src||''), ki&&ki.src);
  ok('常温粘着工法→kou_nenchaku.png', !!ki && ki.key==='nenchaku', ki&&ki.key+' / '+ki.kou);
  ok('記号が違っても同じ工法なら同じ絵（AS-T1とAS-T2）', !!ki && ki.sameTorch===true);
  ok('枠に出るのは工法名（記号ではない）', !!ki && ki.cap==='常温粘着', ki&&ki.cap);
  /* 絵を置いたら枠が絵に変わる（記号ごとに1回だけ確かめる仕組みを直に動かす） */
  const swap=await p.evaluate(async()=>{
    nnKiconState[nnKouKey(props[0]).key]='ok'; render();
    await new Promise(r=>setTimeout(r,400));
    const k=document.querySelector('#list .pcard .kicon');
    return {has:k.classList.contains('has'), img:!!k.querySelector('img')};
  });
  ok('絵があれば枠が絵に変わる（has）', swap.has===true&&swap.img===true, JSON.stringify(swap));
  const probes=await p.evaluate(()=>Object.keys(nnKiconState).length);
  ok('確かめるのは記号の数だけ（100件ぶん取りに行かない）', probes<=12, probes+'種');
  await p.evaluate(()=>{ nnKiconState[nnKouKey(props[0]).key]='ng'; render(); });
  await p.waitForTimeout(300);

  /* ③ 保管写真（PCのみ・10枚＋他） */
  const sh=await p.evaluate(()=>{
    const row=document.querySelector('#list .pcard .pshots');
    if(!row)return {none:true};
    const cells=row.querySelectorAll('.psh');
    return {n:cells.length, first:cells[0].textContent.trim(), last:cells[cells.length-1].textContent.trim(),
      more:!!row.querySelector('.pshmore'), moreTx:(row.querySelector('.pshmore')||{}).textContent,
      rows:document.querySelectorAll('#list .pcard .pshots').length};
  });
  console.log('③ 写真', JSON.stringify(sh));
  if(PH){
    /* ★2026-08-16j スマホにも出す仕様に変わった（本人の指示） */
    /* ★2026-08-16q スマホは5枚＋提出書類と同じ行（本人の指示） */
    ok('スマホは写真の一覧が5個', sh.n===5, JSON.stringify(sh));
  }else{
    ok('写真の枠が10個', sh.n===10, String(sh.n));
    ok('写真1〜写真10', sh.first==='写真1'&&sh.last==='写真10', sh.first+'…'+sh.last);
    /* ★帯ではなく「写真の形」になっているか */
    const size=await p.evaluate(()=>{
      const c=document.querySelector('#list .pcard .psh').getBoundingClientRect(), Z=window.nnPZ||1;
      const card=document.querySelector('#list .pcard').getBoundingClientRect();
      return {w:+(c.width/Z).toFixed(1), h:+(c.height/Z).toFixed(1), card:+(card.height/Z).toFixed(0)};
    });
    console.log('写真1枚の大きさ', JSON.stringify(size));
    /* ★2026-08-17a 10枚を1段に並べたので1枚は小さくなった。形（4:3）で見る */
  ok('写真は帯ではなく写真の形（4:3）', Math.abs(size.w/size.h-4/3)<0.12, size.w+'x'+size.h);
    ok('よこ:たて が 4:3 くらい', Math.abs(size.w/size.h-4/3)<0.15, (size.w/size.h).toFixed(2));
    ok('「他」ボタンがある', sh.more===true && (sh.moreTx||'').trim()==='他');
    ok('全カードに出る', sh.rows>=10, sh.rows+'枚');
    /* 写真を入れると1枚目が実写真になる */
    const put=await p.evaluate(async()=>{
      const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const pid=props[0].id; PH_TEST=1;
      const P0=props[0];
      /* 現場写真として1枚入れる（保存は使わず画面上だけ） */
      const key=P0.code;
      const store=(window.nnPhotoOf?null:null);
      try{ JSON.parse('1'); }catch(_){}
      /* 直接 PH に入れる（nn-photo の内部変数） */
      window.nnPhotoFile && 0;
      const inp=document.querySelector('#list .pcard .phinp');
      /* PH は閉じた変数なので、files 経由で確かめる */
      P0.files.push({cat:'photo', url:PX, name:'テスト写真', date:'2026/08/13', size:10});
      render();
      await new Promise(r=>setTimeout(r,300));
      const c=document.querySelector('#list .pcard .psh');
      return {has:c.classList.contains('has'), img:!!c.querySelector('img'), num:(c.querySelector('i')||{}).textContent};
    });
    ok('保管済みの写真が1枚目に出る', put.has===true && put.img===true, JSON.stringify(put));
    /* 空いている枠を押しても、物件は選ばれない・詳細へ飛ばない（写真を選ぶ窓が開く） */
    const noSel=await p.evaluate(async()=>{
      selectedId=null; showView('list'); render(); await new Promise(r=>setTimeout(r,250));
      let opened=false;
      const orig=HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click=function(){ if(this.type==='file')opened=true; };
      const cell=[...document.querySelectorAll('#list .pcard .psh')].find(c=>!c.classList.contains('has'));
      const r=cell.getBoundingClientRect();
      cell.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+5,clientY:r.top+5,bubbles:true,isPrimary:true,pointerId:1}));
      cell.dispatchEvent(new MouseEvent('click',{clientX:r.left+5,clientY:r.top+5,bubbles:true}));
      await new Promise(r2=>setTimeout(r2,250));
      HTMLInputElement.prototype.click=orig;
      return {sel:selectedId, detail:document.getElementById('mainview').classList.contains('show-detail'), opened};
    });
    ok('空き枠を押すと写真を選ぶ窓が開く', noSel.opened===true, JSON.stringify(noSel));
  /* ★2026-08-15f 着色（選ばれているカード）は「どこを押しても付く」に変えた（§112）。
     ここで見るべきは**詳細ページへ飛ばないこと**。 */
    ok('写真の枠を押しても詳細へ飛ばない', noSel.detail===false, JSON.stringify(noSel));
    ok('写真の枠から詳細ページへ飛ばない', noSel.detail===false, JSON.stringify(noSel));
    /* 「他」ボタンだけは「写真」タブへ行く */
    const more=await p.evaluate(async()=>{
      document.querySelector('#list .pcard .pshmore').click();
      await new Promise(r=>setTimeout(r,350)); return curTab;
    });
    ok('「他」で写真タブへ行く', more==='写真', String(more));
    await p.evaluate(()=>{ showView('list'); render(); });
    await p.waitForTimeout(400);
  }

  /* ★メインの現場写真が縦長になっていないか（横長で撮るもの） */
  const cov=await p.evaluate(()=>{
    const e=document.querySelector('#list .pcard .pph').getBoundingClientRect(), Z=window.nnPZ||1;
    return {w:+(e.width/Z).toFixed(1), h:+(e.height/Z).toFixed(1)};
  });
  console.log('メイン写真', JSON.stringify(cov));
  ok('メインの写真は横長（たてより よこが長い）', cov.w>cov.h, cov.w+'x'+cov.h);
  if(!PH) ok('メインの写真は 4:3', Math.abs(cov.w/cov.h-4/3)<0.08, (cov.w/cov.h).toFixed(2));

  /* ④ 提出書類 */
  const dc=await p.evaluate(()=>{
    const d=document.querySelector('#list .pcard .pdocs');
    return {n:d.querySelectorAll('.doc').length,
      names:[...d.querySelectorAll('.doc span')].map(x=>x.textContent.trim()),
      rows:d.querySelectorAll('.db').length};
  });
  console.log('④ 提出書類', JSON.stringify(dc));
  ok('提出書類が7つ', dc.n===7, String(dc.n));
  ok('図面・写真台帳・施工要領書がある',
     ['図面','写真台帳','施工要領書'].every(x=>dc.names.includes(x)), JSON.stringify(dc.names));
  const zu=await p.evaluate(async()=>{
    const btns=[...document.querySelectorAll('#list .pcard .pdocs .doc')];
    const t=btns.find(b=>b.textContent.includes('図面')); t.click();
    await new Promise(r=>setTimeout(r,350));
    return curTab;
  });
  ok('「図面」で作成図面タブが開く', zu==='作成図面', String(zu));
  await p.evaluate(()=>{ showView('list'); render(); });
  await p.waitForTimeout(400);

  /* 横はみ出し0 */
  const over=await p.evaluate(()=>{
    let n=0; document.querySelectorAll('#list .pcard').forEach(c=>{
      if(c.scrollWidth>c.clientWidth+2)n++; });
    return {n, body:document.body.scrollWidth-document.body.clientWidth};
  });
  ok('カードの横はみ出し0', over.n===0, JSON.stringify(over));

  /* ★押したときに「沈まない」（大きなカードの scale をやめた） */
  const press=await p.evaluate(async()=>{
    const c=document.querySelector('#list .pcard');
    const before=c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent('pointerdown',{clientX:before.left+400,clientY:before.top+8,bubbles:true,isPrimary:true,pointerId:1}));
    /* :active は実イベントでしか付かないので、計算値そのものを見る */
    const tr=getComputedStyle(c).transform;
    await new Promise(r=>setTimeout(r,120));
    const after=c.getBoundingClientRect();
    return {tr, dw:+(after.width-before.width).toFixed(1), dh:+(after.height-before.height).toFixed(1)};
  });
  console.log('押したとき', JSON.stringify(press));
  ok('押しても大きさが変わらない', Math.abs(press.dw)<1 && Math.abs(press.dh)<1, JSON.stringify(press));
  const css=await p.evaluate(()=>{
    let hit=null;
    for(const sh of document.styleSheets){
      let rs; try{ rs=sh.cssRules; }catch(_){ continue; }
      for(const r of rs){ if(r.selectorText && /#list \.pcard:active/.test(r.selectorText) && r.style.transform) hit=r.style.transform; }
    }
    return hit;
  });
  ok('押したときの transform は none', css==='none', String(css));

  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン 1600px】'));
  console.log(R.join('\n'));
  await b.close();
})();
