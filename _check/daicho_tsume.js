/* ★2026-10-13zk 写真台帳：スマホ縦の「現場登録」「黒板設定」を詰める（本人の付箋・§677）
   ① 現場名の入力欄だけで1行（欄の幅いっぱい）・「現場登録」のすぐ下（すき間 8px 以下）
   ② 「記録帳から引用」は「現場登録」の行（見出し・▲と重ならない・押すと引用が反応する）
   ③ 工種と撮影日が同じ行・「（新しい写真）」は出ない
   ④ 現場登録と黒板設定の間に境界線（撮影日の行と「黒板設定」の間）
   ⑤ 黒板と色が同じ行・位置と日付の表記が同じ行・「黒板」の選択欄は欄の半分以下
   ⑥ 「日付の表記」は1行（変な改行なし）
   ⑦ 緑の帯と「現場登録」の枠のすき間 4px 以下
   ⑧ どの部品も枠からはみ出さず、互いに重ならない（× と入力欄の組は除く）
   ⑨ 黒板「なし」で色・位置・サイズ・日付が隠れても崩れない（工種・撮影日は同じ行のまま）
   ⑩ pageerror 0
   直す前の版では ①〜⑦ が★NG。  使い方: node _check/daicho_tsume.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(500);
  await p.fill('#dbSite','つめ試験の現場'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.querySelector('#dbv .dbSide').classList.remove('closed'); document.activeElement.blur(); }); await p.waitForTimeout(300);
  const G=()=>p.evaluate(()=>{ const q=s=>document.querySelector(s), R=e=>{ if(!e) return null; const r=e.getBoundingClientRect(); return {l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height),m:Math.round(r.top+r.height/2)}; };
    const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
    const side=q('#dbSide'), cs=getComputedStyle(side), sR=side.getBoundingClientRect(), inner={l:sR.left+parseFloat(cs.paddingLeft)+parseFloat(cs.borderLeftWidth), r:sR.right-parseFloat(cs.paddingRight)-parseFloat(cs.borderRightWidth)};
    const lab=id=>q('#'+id).closest('label');
    const els=[...side.querySelectorAll('input,select,button,.sw,.httl')].filter(vis);
    const out=els.filter(e=>{ const r=e.getBoundingClientRect(); return r.left<sR.left-1||r.right>sR.right+1; }).map(e=>e.id||e.className);
    const ov=[]; for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){ const a=els[i], c=els[j]; if(a.contains(c)||c.contains(a)) continue; const ids=[a.id,c.id].sort().join(); if(ids==='dbSite,dbSiteClr'||ids==='dbFold,dbFromBk') continue;   /* 「現場登録」の行は全体が1つのボタン。引用はその上に載せる（押したときに引用が反応するかは②で測る） */
      const A=a.getBoundingClientRect(), C=c.getBoundingClientRect(), x=Math.min(A.right,C.right)-Math.max(A.left,C.left), y=Math.min(A.bottom,C.bottom)-Math.max(A.top,C.top); if(x>1&&y>1) ov.push((a.id||a.className)+'×'+(c.id||c.className)); }
    const newp=[...side.querySelectorAll('.lsHide')].filter(e=>/新しい写真/.test(e.textContent)&&vis(e)).length;
    return {inner:{l:Math.round(inner.l),r:Math.round(inner.r)}, hdr:R(q('#dbv .dbh')), side:R(side), fold:R(q('#dbFold')), httl:R(q('#dbFold .httl')), fv:R(q('#dbFold .fv')), bkTop:(()=>{ const r=q('#dbFromBk').getBoundingClientRect(), e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return !!e&&!!e.closest('#dbFromBk'); })(), site:R(q('#dbv .siterow .sitein')||q('#dbSite')), bk:R(q('#dbFromBk')),
      kind:R(q('#dbKind')), date:R(q('#dbDate')), bh:R(q('#dbSideIn > .bh')), bhBorder:parseFloat(getComputedStyle(q('#dbSideIn > .bh')).borderTopWidth)||0,
      on:R(q('#dbBoardOn')), col:R(q('#dbColor')), pos:R(q('#dbPos')), era:R(q('#dbEra')), eraLab:R(lab('dbEra')), eraTxt:(lab('dbEra').innerText||'').replace(/\s/g,''), eraFs:parseFloat(getComputedStyle(lab('dbEra')).fontSize),
      newp, out, ov, colVis:vis(q('#dbColor')), sizeVis:vis(q('#dbSize')), eraVis:vis(q('#dbEra')) }; });
  const g=await G();
  ok('① 現場名の入力欄だけで1行（欄の幅いっぱい）・「現場登録」のすぐ下', g.site.l-g.inner.l<=2&&g.inner.r-g.site.r<=2&&g.site.t-g.fold.b<=8&&g.site.t>=g.fold.b-1, {site:g.site,inner:g.inner,fold:g.fold});
  ok('② 「記録帳から引用」は「現場登録」の行（見出し・▲と重ならない・押すと引用が反応する）', Math.abs(g.bk.m-g.fold.m)<=6&&g.bk.l>=g.httl.r&&g.bk.r<=g.fv.l&&g.bkTop, {bkTop:g.bkTop,bk:g.bk,fold:g.fold,httl:g.httl,fv:g.fv});
  ok('③ 工種と撮影日が同じ行・「（新しい写真）」は出ない', Math.abs(g.kind.m-g.date.m)<=3&&g.newp===0, {kind:g.kind,date:g.date,newp:g.newp});
  ok('④ 現場登録と黒板設定の間に境界線', g.bhBorder>=1&&g.bh.t>=g.date.b, {bhBorder:g.bhBorder,bh:g.bh,date:g.date});
  ok('⑤ 黒板と色が同じ行・位置と日付の表記が同じ行・「黒板」の選択欄は欄の半分以下', Math.abs(g.on.m-g.col.m)<=3&&Math.abs(g.pos.m-g.era.m)<=3&&g.on.w<=(g.inner.r-g.inner.l)/2, {on:g.on,col:g.col,pos:g.pos,era:g.era});
  ok('⑥ 「日付の表記」は1行（変な改行なし）', g.eraTxt.startsWith('日付の表記')&&g.eraLab.h<=g.eraFs*1.6+16, {eraTxt:g.eraTxt,eraLab:g.eraLab,fs:g.eraFs});
  ok('⑦ 緑の帯と「現場登録」の枠のすき間 4px 以下', g.side.t-g.hdr.b<=4&&g.side.t>=g.hdr.b, {hdr:g.hdr,side:g.side});
  ok('⑧ どの部品も枠からはみ出さず、互いに重ならない', g.out.length===0&&g.ov.length===0, {out:g.out,ov:g.ov});
  await p.selectOption('#dbBoardOn','off'); await p.locator('#dbBoardOn').dispatchEvent('change'); await p.waitForTimeout(300);
  const g2=await G();
  await p.selectOption('#dbBoardOn','on'); await p.locator('#dbBoardOn').dispatchEvent('change'); await p.waitForTimeout(200);
  ok('⑨ 黒板「なし」で色・位置・サイズ・日付が隠れても崩れない', !g2.colVis&&!g2.sizeVis&&!g2.eraVis&&Math.abs(g2.kind.m-g2.date.m)<=3&&g2.out.length===0&&g2.ov.length===0, {colVis:g2.colVis,sizeVis:g2.sizeVis,eraVis:g2.eraVis,out:g2.out,ov:g2.ov});
  ok('⑩ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
