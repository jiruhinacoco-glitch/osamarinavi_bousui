/* ★2026-09-27a 付箋と上の帯（§533）
   使い方: node _check/tabopen.js [kirokucho_demo.html|hacchu.html]
   ○/★NG：①スマホ表示でダッシュボード・施工中に帯が出ない／一覧では出る ②開いている付箋の真下に濃い線が無い・閉じた付箋の下には線がある */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'kirokucho_demo.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for(const sp of [1,0]){
  const p=await (await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true})).newPage();
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(2500);
  if(!F.includes('hacchu')&&sp){ await p.evaluate(()=>nnToggleView()); await p.waitForTimeout(1200); }
  const views=!F.includes('hacchu')?['dash','list']:[null];   /* ★§543 施工中（工程表）の付箋は出さなくなった */
  for(const v of views){
    if(v) { await p.evaluate(v=>showView(v),v); await p.waitForTimeout(600); }
    if(v){ const tb=await p.evaluate(()=>{const t=document.getElementById('toolbar'); return t.getBoundingClientRect().height>0 && getComputedStyle(t).display!=='none';});
      ok(`${sp?'スマホ表示':'一覧表示'} ${v}：上の帯（カード・検索）が${v==='list'?'出る':'出ない'}`, tb===(v==='list'), tb); }
    const px=await p.evaluate(async()=>{ const bs=[...document.querySelectorAll('#viewtabs button')].filter(b=>b.offsetParent);
      return bs.map(b=>{const r=b.getBoundingClientRect(); return {on:b.classList.contains('on'),x:Math.round(r.left+r.width/2),y:Math.round(r.bottom)};}); });
    for(const t of px.filter(t=>t.x<392&&t.y<850&&t.x>0)){
      const img=await p.screenshot({clip:{x:t.x,y:t.y,width:1,height:2}});
      const col=await p.evaluate(async(u)=>{const i=new Image(); i.src=u; await i.decode(); const c=document.createElement('canvas'); c.width=1;c.height=2; const g=c.getContext('2d'); g.drawImage(i,0,0); return [...g.getImageData(0,0,1,2).data];}, 'data:image/png;base64,'+img.toString('base64'));
      const dark=[0,4].some(k=>col[k]<60&&col[k+1]<130&&col[k+2]<80);  // 濃い緑 #1c6b3c 付近
      if(t.on) ok(`${sp?'スマホ':'一覧'} ${v||''} 開いている付箋の下に濃い線が無い`, !dark, JSON.stringify(col));
      else if(!R.some(r=>r.includes('閉じた')&&r.includes(v||'-'))) ok(`${sp?'スマホ':'一覧'} ${v||'-'} 閉じた付箋の下には線がある`, dark, JSON.stringify(col));
    }
  }
  await p.context().close();
  if(!!F.includes('hacchu'))break;
 }
 await b.close(); console.log(R.join('\n'));
})();
