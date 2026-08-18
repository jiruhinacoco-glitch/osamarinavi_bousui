/* ★2026-08-14b スマホ：写真の誤タップで「写真の選択画面」が出ないか
   使い方: node phtap.js       （スマホたて）
           node phtap.js pc    （パソコン＝今までどおり写真ぜんぶで開く） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PC=process.argv[2]==='pc';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(PC?{viewport:{width:1600,height:900}}
    :{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  if(!PC) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  /* 1枚目に写真を入れておく */
  await p.evaluate(async()=>{
    const cv=document.createElement('canvas'); cv.width=160; cv.height=120;
    const x=cv.getContext('2d'); x.fillStyle='#6aa'; x.fillRect(0,0,160,120);
    window.nnPhotoFile && await new Promise(r=>{
      fetch(cv.toDataURL()).then(b2=>b2.blob()).then(bl=>{ nnPhotoFile(props[0].id, new File([bl],'a.png',{type:'image/png'})); setTimeout(r,700); });
    });
  });
  await p.waitForTimeout(900);
  const tap=async(where)=>p.evaluate(async(w)=>{
    let opened=false;
    const orig=HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click=function(){ if(this.type==='file')opened=true; };
    const ph=document.querySelector('#list .pcard .pph');
    const r=ph.getBoundingClientRect();
    const y = w==='band' ? r.bottom-8 : r.top+r.height*0.4;
    const el=document.elementFromPoint(r.left+r.width/2, y);
    el.dispatchEvent(new MouseEvent('click',{clientX:r.left+r.width/2, clientY:y, bubbles:true}));
    await new Promise(z=>setTimeout(z,300));
    HTMLInputElement.prototype.click=orig;
    /* label は既定の動きでブラウザが開くので、for が指す input を見て判定する */
    const zoom=!!document.getElementById('nnPhotoBig');
    if(zoom){ document.getElementById('nnPhotoBig').remove(); }
    return {tag:el.tagName+'.'+(el.className||''), opened, zoom, isLabel:el.classList.contains('phfull')};
  }, where);

  const mid=await tap('mid');
  const band=await tap('band');
  console.log('写真の真ん中', JSON.stringify(mid));
  console.log('下の帯      ', JSON.stringify(band));
  if(PC){
    ok('パソコン：写真の真ん中も選択窓（label）', mid.isLabel===true, mid.tag);
  }else{
    ok('スマホ：写真の真ん中は選択窓を開かない', mid.isLabel===false, mid.tag);
    ok('スマホ：写真の真ん中は拡大表示になる', mid.zoom===true, JSON.stringify(mid));
  }
  ok('下の帯は選択窓を開く場所（label）', band.isLabel===true, band.tag);
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PC?'【パソコン】':'【スマホたて】')); console.log(R.join('\n'));
  await b.close();
})();
