/* 仕様・材料／材料登録：上の帯の絞り込みメニュー（分類別など）の選択肢が、一覧・詳細の裏に隠れずに押せるか（スマホたて・よこ・PC × 一覧・登録画面）。§580
   使い方: node _check/chipmenu.js [ファイル]（直す前の shiyo_toroku では全部★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]; let NG=0;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const page of ['shiyo_toroku','zairyo_toroku']) for(const [w,h,ph,n] of [[393,852,1,'たて'],[852,393,1,'よこ'],[1440,900,0,'PC']]) for(const mode of ['list','detail']){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph}); p.on('dialog',d=>d.dismiss());
 await p.goto('http://localhost:8899/'+(F&&F.startsWith(page)?F:page+'.html')); await p.waitForTimeout(1400);
 if(mode==='detail'){ const nb=await p.$('button:has-text("新規仕様登録"), button:has-text("新規材料登録")'); if(nb){await nb.click(); await p.waitForTimeout(900);} }
 const chips=await p.$$('.toolbar .chip'); const res=[];
 for(let i=0;i<chips.length;i++){
  const c=chips[i]; if(!(await c.isVisible())) continue;
  await c.click().catch(()=>{}); await p.waitForTimeout(350);
  const r=await p.evaluate(()=>{const m=document.querySelector('.chip .menu.open'); if(!m) return null; const its=[...m.children].filter(e=>e.offsetParent).slice(0,4);
    const vh=document.documentElement.clientHeight; let hid=0,n=0;
    its.forEach(it=>{const r=it.getBoundingClientRect(); const y=r.top+r.height/2; if(y>vh) return; n++; const t=document.elementFromPoint(r.left+r.width/2,y); if(!t||!m.contains(t)) hid++;});
    return {lbl:m.parentElement.textContent.trim().slice(0,5),n,hid};});
  if(r) res.push(r);
  await p.mouse.click(5,5).catch(()=>{}); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
 }
 const bad=res.filter(r=>r.hid>0); if(bad.length||!res.length) NG++;
 console.log((bad.length||!res.length?'★NG ':'○ ')+page+' '+n+' '+mode+' メニュー'+res.length+'個'+(bad.length?' 隠れた:'+bad.map(r=>r.lbl+r.hid+'/'+r.n).join(','):''));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
