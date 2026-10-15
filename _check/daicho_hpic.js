/* ★2026-10-13zt 写真台帳：見出しの左の絵（本人の絵・§684）。スマホ縦・横・PC で：
   ① 「現場登録」「黒板設定」の絵が読める（icons/hpic_genba.png・hpic_kokuban.png）・見出しの左端に重なる・文字は絵より右（重ならない）
   ② 黒板の絵は「黒板の部分」（絵の上から 0〜67%）の真ん中が見出しの真ん中にそろう（±3px）。現場登録の絵は絵の真ん中が見出しの真ん中（±3px）
   ③ 黒板の絵の取っ手（絵の下の端）が次の行（黒板の選択欄・「黒板」の字）に重ならない
   ④ pageerror 0
   直す前の版では ①〜③ が★NG。  使い方: node _check/daicho_hpic.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,o] of [['スマホ縦',{viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true}],['スマホ横',{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true}],['PC',{viewport:{width:2000,height:1040}}]]){
  const p=await b.newPage(o); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(nm!=='PC') await p.addInitScript(([w,h])=>{ Object.defineProperty(screen,'width',{get:()=>w}); Object.defineProperty(screen,'height',{get:()=>h}); localStorage.setItem('nn_view_mode','mobile'); },[o.viewport.width,o.viewport.height]);
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ document.querySelector('#dbv .dbSide').classList.remove('closed'); document.activeElement.blur(); }); await p.waitForTimeout(500);
  const g=await p.evaluate(()=>{ const one=(hs)=>{ const h=document.querySelector(hs); if(!h) return null; const im=h.querySelector('img.hpic'), R=h.getBoundingClientRect(); const tn=[...h.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()); const rg=document.createRange(); if(tn.length){ rg.setStart(tn[0],0); rg.setEnd(tn[tn.length-1],tn[tn.length-1].length); } const T=rg.getBoundingClientRect();
      if(!im) return {img:false}; const I=im.getBoundingClientRect(); return {img:true, ok:im.complete&&im.naturalWidth>0, src:im.getAttribute('src').split('?')[0], hm:R.top+R.height/2, it:I.top, ih:I.height, ib:I.bottom, il:I.left, ir:I.right, hl:R.left, tl:T.left}; };
    const on=document.getElementById('dbBoardOn').getBoundingClientRect(), lab=document.getElementById('dbBoardOn').closest('label').getBoundingClientRect();
    return {g:one('#dbFold .httl'), k:one('.bh.bhk .httl')   /* ★§693 黒板設定は別の枠（#dbBoardIn）へ */, nextTop:Math.min(on.top,lab.top)}; });
  const a=g.g, k=g.k;
  ok(nm+' ① 絵が読める・見出しの左端に重なる・文字は絵より右', a&&k&&a.img&&k.img&&a.ok&&k.ok&&/hpic_genba\.png$/.test(a.src)&&/hpic_kokuban\.png$/.test(k.src)&&a.il-a.hl<=12&&k.il-k.hl<=12&&a.tl>=a.ir-1&&k.tl>=k.ir-1, {a,k});
  ok(nm+' ② 黒板の部分の真ん中（絵の上から 33.6%）と現場登録の絵の真ん中が見出しの真ん中（±3px）', !!(a&&k&&a.img&&k.img)&&Math.abs(k.it+k.ih*0.336-k.hm)<=3&&Math.abs(a.it+a.ih/2-a.hm)<=3, {kb:k&&+(k.it+k.ih*0.336-k.hm).toFixed(1), gb:a&&+(a.it+a.ih/2-a.hm).toFixed(1)});
  ok(nm+' ③ 取っ手が次の行（黒板の選択欄・「黒板」）に重ならない', !!(k&&k.img)&&k.ib<=g.nextTop+0.5, {ib:k&&Math.round(k.ib),next:Math.round(g.nextTop)});
  ok(nm+' ④ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
