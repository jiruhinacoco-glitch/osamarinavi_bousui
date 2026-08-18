/* カード作り直し：写真の横長化・上段/境界線・既存名が見切れない・写真の取り込み2通り */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [mode,vp] of [['pc',{width:1600,height:900}],['phone',{width:393,height:852}]]){
  console.log('\n===== '+mode+' =====');
  const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>{ /* 既存防水を一番長い名前にして見切れを確かめる */
    props[0].kizon='露出アスファルト防水'; render(); });
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);
  await p.evaluate(()=>{ props[0].kizon='露出アスファルト防水'; render(); }); await p.waitForTimeout(600);
  const r=await p.evaluate(()=>{
    const Z=window.nnPZ||1;
    const c=document.querySelector('#list .pcard');
    const ph=c.querySelector('.pph').getBoundingClientRect();
    const head=c.querySelector('.rhead');
    const hb=head.getBoundingClientRect();
    const ttl=head.querySelector('.ttl').getBoundingClientRect();
    const st=head.querySelector('.status').getBoundingClientRect();
    const r1=c.querySelector('.prow.r1').getBoundingClientRect();
    const kz=c.querySelector('.ebox[data-f="kizon"]');
    const memo=c.querySelector('.pmemo').getBoundingClientRect();
    const cs=getComputedStyle(c.querySelector('.pph'));
    return {phW:Math.round(ph.width/Z), phH:Math.round(ph.height/Z),
      sameRow: Math.abs(ttl.top-st.top)<14,
      headAbove: hb.bottom<=r1.top+1,
      border: getComputedStyle(head).borderBottomWidth,
      kzFits: kz.scrollWidth<=kz.clientWidth+1, kzTxt:kz.textContent.trim(),
      memoW:Math.round(memo.width/Z), memoH:Math.round(memo.height/Z),
      bodyW:Math.round(c.querySelector('.pbd').getBoundingClientRect().width/Z),
      hintPE: getComputedStyle(c.querySelector('.phhint')).pointerEvents,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  });
  ok(r.phW>r.phH,'写真が横長になった', r.phW+'x'+r.phH);
  ok(r.sameRow,'現場名とステータスが同じ行');
  ok(r.headAbove && parseFloat(r.border)>=1,'上段の下に境界線がある', '線'+r.border);
  ok(r.kzFits,'既存防水の名前が見切れない', r.kzTxt+' ('+r.phW+'px幅)');
  /* ★メモは「幅を抑える」のが目的。スマホはカード自体が狭いので幅いっぱいでよく、
     背が高くならないこと（高さ）で確かめる。 */
  /* ★2026-08-13i メモは不具合タグの右へ移動し、上限を460pxにした */
  if(mode==='pc') ok(r.memoW<=470,'メモが長すぎない（PCは460px上限）', r.memoW+'px');
  else ok(r.memoH<=34 && r.memoW<=r.bodyW+2,'メモが背高になっていない（スマホ）', r.memoW+'x'+r.memoH+'px');
  ok(r.overflow<=0,'横はみ出しなし', r.overflow);

  /* 写真の取り込み：①下の帯を1回タップ ②真ん中を長押し */
  /* ★2026-08-13h 下の帯は <label for>。ブラウザ自身が選択窓を開くので JS の click() は通らない
     （iOSで確実に開くための作り）。label と input の結び付きで確かめる。 */
  const tap=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const lb=c.querySelector('.pph label.phfull'), inp=c.querySelector('.pph input.phinp');
    return lb&&inp? {ok:lb.htmlFor===inp.id, type:inp.type, accept:inp.accept} : null;
  });
  ok(tap && tap.ok && tap.type==='file' && /image/.test(tap.accept||''),
     '下の帯が label で、押すと写真の選択が開く', JSON.stringify(tap));
  const lp=await p.evaluate(()=>new Promise(res=>{
    let opened=null; const orig=HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click=function(){ if(this.type==='file')opened={accept:this.accept}; };
    const el=document.querySelector('#list .pcard .pph'); const r=el.getBoundingClientRect();
    const o={clientX:r.left+r.width/2, clientY:r.top+20, bubbles:true, pointerId:2};
    el.dispatchEvent(new PointerEvent('pointerdown',o));
    setTimeout(()=>{ el.dispatchEvent(new PointerEvent('pointerup',o));
      HTMLInputElement.prototype.click=orig; res(opened); },700);
  }));
  ok(lp && /image/.test(lp.accept||''),'写真の長押しでも選べる', JSON.stringify(lp));
  /* ★`-webkit-touch-callout` はヘッドレスの getComputedStyle に出てこない（§29）。
     CSSに書いてあるかで確かめる。 */
  const css=await p.evaluate(()=>{const st=document.getElementById('nn-pwcard'); return st?st.textContent:'';});
  ok(/\.pph\{[^}]*-webkit-touch-callout:none/s.test(css) || /-webkit-touch-callout:none/.test(css),
     'iPhoneの長押しメニューを止める指定がある');
  ok(errs.length===0,'JSエラーなし', errs.join('|').slice(0,180));
  await p.screenshot({path:'card4_'+mode+'.png'});
  await ctx.close();
}
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
