/* ★2026-08-15f 一覧カード：どこを押しても着色され、色が残る
   使い方: node selcolor.js [ph] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const RGB=s=>(s.match(/\d+/g)||[]).map(Number);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);

  /* ① カードの中のどこを押しても着色されるか（格子で全面をなめる） */
  const grid=await p.evaluate(()=>{
    const c=document.querySelectorAll('#list .pcard')[1];
    const rc=c.getBoundingClientRect();
    let yes=0,no=0; const bad={};
    for(let y=rc.top+5;y<rc.bottom-5;y+=10)for(let x=rc.left+5;x<rc.right-5;x+=20){
      document.querySelectorAll('#list .pcard.sel').forEach(z=>z.classList.remove('sel'));
      const el=document.elementFromPoint(x,y); if(!el||!c.contains(el))continue;
      el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y}));
      if(c.classList.contains('sel'))yes++; else{no++; const k=el.className||el.tagName; bad[k]=(bad[k]||0)+1;}
    }
    return {yes,no,bad};
  });
  console.log('①', JSON.stringify(grid).slice(0,200));
  ok('カードのどこを押しても着色される（無反応0）', grid.no===0, '反応'+grid.yes+'／無反応'+grid.no);

  /* ② 実クリックで色が変わる・その色が残る（2.6秒後も） */
  const spots=[['.ebox.ttl','物件名（編集の囲み）'],['.pdate','日付'],['.pshots .psh','写真の枠'],
               ['.pdocs .dh','提出書類の見出し'],['.pexist .ebox','既存の囲み']];
  for(const [sel,label] of spots){
    const pos=await p.evaluate(s=>{
      document.querySelectorAll('#list .pcard.sel,#list .pcard.armed').forEach(z=>z.classList.remove('sel','armed'));
      const c=document.querySelectorAll('#list .pcard')[1];
      const e=c.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect();
      return {x:r.left+Math.min(24,r.width/2), y:r.top+r.height/2, pid:c.dataset.pid,
        bg0:getComputedStyle(c).backgroundColor};
    },sel);
    /* ★保管写真10枚はパソコンだけの機能（§94）。スマホには無いので飛ばす */
    if(!pos){ if(!PH) ok(label+'：要素が見つからない', false); continue; }
    /* ★色は少しずつ変わる指定（transition）なので、変わりきるまで待つ。
       250msだと途中の色（白のまま）を拾って、ときどき★NGになっていた
       （sel は付いているので中身は正常。テスト側の待ち不足）。 */
    await p.mouse.click(pos.x,pos.y); await p.waitForTimeout(700);
    /* ★編集の囲みは、開いた直後に一覧が作り直されて色の変化が最初からやり直しになる
       ことがある（そのときだけ700msでも足りない）。白のままならもう0.6秒待つ。 */
    {const chk=await p.evaluate(pid=>{const c=document.querySelector('#list .pcard[data-pid="'+pid+'"]');
       return c&&getComputedStyle(c).backgroundColor;},pos.pid);
     if(chk==='rgb(255, 255, 255)') await p.waitForTimeout(600);}
    const r=await p.evaluate(pid=>{
      const c=document.querySelector('#list .pcard[data-pid="'+pid+'"]');
      return {sel:c.classList.contains('sel'), bg:getComputedStyle(c).backgroundColor,
        outline:getComputedStyle(c).outlineColor+' '+getComputedStyle(c).outlineWidth};
    },pos.pid);
    const c1=RGB(r.bg);
    ok(label+'を押すと着色される', r.sel && c1[0]>=250 && c1[2]<=245 && c1[2]<c1[0], r.bg+' / '+r.outline);
    /* プルダウンが開いていたら閉じる */
    await p.keyboard.press('Escape');
    await p.evaluate(()=>{ if(document.activeElement)document.activeElement.blur(); });
    await p.waitForTimeout(200);
  }

  /* ③ 色が消えない（armed の2.6秒より長く待つ） */
  const pos=await p.evaluate(()=>{
    const c=document.querySelectorAll('#list .pcard')[2];
    c.scrollIntoView({block:'center'});
    const e=c.querySelector('.pdate'); const r=e.getBoundingClientRect();
    return {x:r.left+20,y:r.top+r.height/2,pid:c.dataset.pid};
  });
  await p.mouse.click(pos.x,pos.y); await p.waitForTimeout(3200);
  const keep=await p.evaluate(pid=>{
    const c=document.querySelector('#list .pcard[data-pid="'+pid+'"]');
    return {sel:c.classList.contains('sel'), armed:c.classList.contains('armed'),
      bg:getComputedStyle(c).backgroundColor};
  },pos.pid);
  console.log('③', JSON.stringify(keep));
  ok('3秒たっても色が残る（選ばれたまま）', keep.sel && RGB(keep.bg)[2]<245, keep.bg);
  ok('2回目で詳細へ進む待機（armed）は時間で解ける', keep.armed===false, String(keep.armed));

  /* ④ 別のカードを押すと、そちらだけが着色される */
  const pos2=await p.evaluate(()=>{
    const c=document.querySelectorAll('#list .pcard')[4];
    c.scrollIntoView({block:'center'});
    const e=c.querySelector('.pdate'); const r=e.getBoundingClientRect();
    return {x:r.left+20,y:r.top+r.height/2,pid:c.dataset.pid};
  });
  await p.mouse.click(pos2.x,pos2.y); await p.waitForTimeout(300);
  const only=await p.evaluate(()=>document.querySelectorAll('#list .pcard.sel').length);
  ok('着色されるのは1枚だけ', only===1, only+'枚');

  /* ⑤ ★2026-08-17a 詳細へは「詳細」ボタンからだけ（2回タップは移動しない） */
  await p.mouse.click(pos2.x,pos2.y); await p.waitForTimeout(600);
  const still=await p.evaluate(()=>!document.getElementById('mainview').classList.contains('show-detail'));
  ok('同じ場所をもう一度押しても移動しない', still);
  await p.click('#list .pcard.sel .pgo'); await p.waitForTimeout(700);
  ok('「詳細」ボタンで詳細へ',
     await p.evaluate(()=>document.getElementById('mainview').classList.contains('show-detail')));

  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン 1600px】'));
  console.log(R.join('\n'));
  await b.close();
})();
