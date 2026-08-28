/* 物件詳細ヘッダー刷新（2026-08-18b） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
let h=fs.readFileSync('/home/user/osamarinavi_bousui/kirokucho_demo.html','utf8')
  .replace(/env\(safe-area-inset-(left|right)\)/g,'59px').replace(/env\(safe-area-inset-(top|bottom)\)/g,'0px');
fs.writeFileSync('/home/user/osamarinavi_bousui/__L_kirokucho.html',h);
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [w,hh,name,file] of [[852,393,'よこ','__L_kirokucho.html'],[393,852,'たて','kirokucho_demo.html']]){
    const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
    await p.goto('http://localhost:8899/'+file,{waitUntil:'load'}); await p.waitForTimeout(2500);
    /* タグ付きの物件（J002=八軒アパート・膨れ/下地起因）を開く */
    await p.evaluate(()=>{ showView('list'); const t=props.find(x=>x.code==='J002'); selectedId=t.id; openDetailFull(); });
    await p.waitForTimeout(600);
    const r=await p.evaluate(()=>{
      const Z=window.nnPZ||1;
      const dh=document.querySelector('.dhead.dh2');
      const green=document.querySelector('.nndefpanel');
      const tabsTop=document.querySelector('.dh2 .tabs').getBoundingClientRect().top;
      const chips=[...document.querySelectorAll('.dh2 .defrow .defchip')].length;
      const ibs=[...document.querySelectorAll('.dh2 .dib')].map(e=>e.querySelector('i').textContent);
      const nm=document.querySelector('.dh2 h2');
      return {has:!!dh, greenGone:!green, tabsTop:Math.round(tabsTop/1),
        chips, ibs, stTxt:document.querySelector('.dh2 .dst').textContent,
        sp:document.querySelector('.dh2 .dsp')&&document.querySelector('.dh2 .dsp').textContent,
        want:(props.find(x=>x.id===selectedId)||{}).defects ?
             (props.find(x=>x.id===selectedId)||{}).defects.length : -1,
        nameFull:nm.scrollWidth<=nm.clientWidth+1||getComputedStyle(nm).whiteSpace==='normal',
        ov:document.documentElement.scrollWidth-innerWidth};
    });
    ok(name+'：新ヘッダー・緑の枠は廃止', r.has&&r.greenGone);
    ok(name+'：情報の囲み（住所/契約日/元請/受注金額/利益予定額）', r.ibs.length===5, r.ibs);
    ok(name+'：ステータスと記号バッジ', r.stTxt==='完成済'&&r.sp==='AS-J1', {st:r.stTxt,sp:r.sp});
    /* ★件数は決め打ちにしない（見本のタグが増えると必ず落ちる）。
       その物件が持っているタグの数と、画面に出ているチップの数が合っているかを見る。 */
    ok(name+'：タグのチップが、その物件のタグの数だけ出る', r.chips===r.want, r.chips+'／持っている'+r.want);
    ok(name+'：タブの開始位置が浅い（本文が早く始まる）', r.tabsTop<(name==='よこ'?260:520), r.tabsTop);
    ok(name+'：物件名が隠れない', r.nameFull);
    ok(name+'：横はみ出し0', r.ov<=0, r.ov);
    ok(name+'：JSエラーなし', errs.length===0, errs);
    await p.screenshot({path:'out/chk_det_'+(name==='よこ'?'land':'port')+'.png'});
    await p.close();
  }
  fs.unlinkSync('/home/user/osamarinavi_bousui/__L_kirokucho.html');
  console.log(R.join('\n'));
  await b.close();
})();
