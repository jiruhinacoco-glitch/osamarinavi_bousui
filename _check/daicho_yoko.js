/* ★2026-10-13zc 写真台帳：スマホの横画面（§669・本人「横画面がひどすぎる。帯も見切れている。二度とこうならないように」）
   iPhone の横画面の大きさ 3 つ（667×375／852×393／932×430）で、出来上がりの形を測る：
   ① 上の帯・下の帯が画面の左右の端まで（見切れない）・上の帯は細い（48px 以下）・下の帯は1行（40px 以下）
      ＋カメラの出っ張りをよける余白は帯の内側（#dbv の左右の余白 0・.dbh に safe-area-inset-left の余白の指定がある）
      ★Chromium の検査ブラウザには出っ張りの余白が無い（0）ので、見た目では差が出ない。指定があるかで見る
   ② 中身（.dbw）は画面の高さの 75% 以上・左＝設定｜右＝写真の2列（同じ高さから・左は 40〜50%）・★§670 左の列はスクロールなしで収まる・部品が重ならない・はみ出さない（最近の札がある状態）
   ③ 横にはみ出さない（#dbv の中の物の右端が画面の中）・右上の撮影／写真選択が見えている・「現場登録」の見出しが見える・たたむボタンは出ない
   ④ 写真が無いとき：右に見本の絵（§670）と大きな「撮影」「写真選択」（押すと写真選択が開く）
   ⑤ 写真があるとき：何も選んでいないと「全部選ぶ」の帯だけで1行（50px 以下・§690 でタグの枠から分けた）。**現場名を入れた直後に**写真の□を押しても選べる（1枚 選択）・
      選ぶと部位・作業内容の欄が出る（箱は右の列の上に貼り付く＝sticky）
   ⑥ 縦→横→縦に回すと形が切り替わる（縦は1列・横は2列）・見本はその画面の細かさで描き直される
   ⑦ pageerror 0
   直す前の版では ①〜⑥ が★NG。
   使い方: node _check/daicho_yoko.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,300):'')); if(!c)NG++;};
const SITE='横画面の検査';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [W,H] of [[667,375],[852,393],[932,430]]){ const nm=W+'×'+H;
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([W,H])=>{try{Object.defineProperty(screen,'width',{get:()=>W});Object.defineProperty(screen,'height',{get:()=>H});localStorage.setItem('nn_view_mode','mobile');localStorage.setItem('nn_daicho_pref_v1',JSON.stringify({sites:['以前の現場A','以前の現場B']}));}catch(e){} window.confirm=()=>true;},[W,H]);
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
  await p.evaluate(async(SITE)=>{ if(!window.nnPhotos) return; const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE||m[k].site==='')); },SITE);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(800);
  const geo=()=>p.evaluate(()=>{ const q=s=>document.querySelector(s), R=e=>{ if(!e) return null; const r=e.getBoundingClientRect(); return {l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),r:Math.round(r.right),b:Math.round(r.bottom)}; };
    const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
    const cw=document.documentElement.clientWidth, ch=document.documentElement.clientHeight;
    const over=[...document.querySelectorAll('#dbv *')].filter(e=>{ if(!vis(e)) return false; const r=e.getBoundingClientRect(); if(r.width===0) return false; let a=e.parentElement; while(a&&a.id!=='dbv'){ const o=getComputedStyle(a).overflowX; if(o==='auto'||o==='scroll'||o==='hidden') return false; a=a.parentElement; } return r.right>cw+1; }).map(e=>e.id||e.className).slice(0,5);
    const fb=[...document.querySelectorAll('#dbv .dbf button')].map(x=>Math.round(x.getBoundingClientRect().top));
    const safeCss=[...document.styleSheets].some(ss=>{ try{ return [...ss.cssRules].some(r=>/#dbv \.dbh/.test(r.selectorText||'')&&/safe-area-inset-left/.test(r.style.paddingLeft||'')); }catch(e){ return false; } });
    return {cw,ch, hdr:R(q('#dbv .dbh')), foot:R(q('#dbv .dbf')), dbw:R(q('#dbv .dbw')), side:R(q('#dbSide')), main:R(q('#dbMain')), prev:R(q('#dbv .prev')), over,
      fbRow:fb.length&&fb.every(t=>Math.abs(t-fb[0])<=2), cntHid:getComputedStyle(q('#dbCount')).display==='none',   /* ★§674 下の帯に現場名・枚数は出さない（上の「現場登録」に出す） */
      hb:['dbShootH','dbPickH'].map(id=>{ const e=q('#'+id); return vis(e)&&e.getBoundingClientRect().right<=cw; }),
      title:vis(q('#dbFold .httl')), fv:vis(q('#dbFold .fv'))||vis(q('#dbFoldB')),
      dbvPad:getComputedStyle(q('#dbv')).paddingLeft, safeCss,
      fit:(()=>{ const sd=q('#dbSide'); const els=[...sd.querySelectorAll('input,select,button,.sw,.req,label.f > span:first-child,.httl,#dbSizeV')].filter(e=>e.getBoundingClientRect().width>0); const sR=sd.getBoundingClientRect();
        const out=els.filter(e=>{ const r=e.getBoundingClientRect(); return r.right>sR.right-2||r.left<sR.left; }).map(e=>e.id||e.className); const ov=[]; for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){ if(els[i].contains(els[j])||els[j].contains(els[i])) continue; const a=els[i].getBoundingClientRect(), c=els[j].getBoundingClientRect(); const x=Math.min(a.right,c.right)-Math.max(a.left,c.left), y=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top); if(x>1&&y>1) ov.push((els[i].id||els[i].className)+'×'+(els[j].id||els[j].className)); }
        return {scroll:sd.scrollHeight, client:sd.clientHeight, out, ov, date:Math.round(q('#dbDate').getBoundingClientRect().width)}; })(),
      prevIn:(q('#dbv .prev')||{parentElement:{id:''}}).parentElement.id, prevVis:vis(q('#dbv .prev')),
      ls:vis(q('#dbLsEmpty')), lsBtns:q('#dbLsEmpty')?q('#dbLsEmpty').querySelectorAll('button').length:0, batch:R(q('#dbBatch')), batchVis:vis(q('#dbBatch')), sb:R(q('#dbSelBar')||q('#dbBatch')), sbVis:vis(q('#dbSelBar')||q('#dbBatch'))}; });   /* ★§690 選んでいないときは「全部選ぶ」の帯（#dbSelBar）だけ。タグの枠は隠れる（前の版は #dbBatch を測る） */
  /* ①〜④ 写真なし */
  const g=await geo();
  ok(nm+' ① 帯は左右の端まで・上の帯 48px 以下・下の帯は1行で 40px 以下・出っ張りの余白は帯の内側', g.hdr.l===0&&g.hdr.w===g.cw&&g.foot.l===0&&g.foot.w===g.cw&&g.hdr.h<=48&&g.foot.h<=40&&g.fbRow&&g.cntHid&&g.dbvPad==='0px'&&g.safeCss, {hdr:g.hdr,foot:g.foot,fbRow:g.fbRow,dbvPad:g.dbvPad,safeCss:g.safeCss});
  ok(nm+' ② 中身は高さの75%以上・左右2列（左 40〜50%）・左の列はスクロールなしで1画面に収まる（§670）・部品が重ならず列からはみ出さない・日付の欄は 110px 以上', g.dbw.h>=g.ch*0.75&&g.side.r<=g.main.l&&Math.abs(g.side.t-g.main.t)<=2&&g.side.w>=g.cw*0.4&&g.side.w<=g.cw*0.5&&g.fit.scroll<=g.fit.client+1&&g.fit.ov.length===0&&g.fit.out.length===0&&g.fit.date>=110, {dbw:g.dbw,side:g.side,main:g.main,fit:g.fit});
  ok(nm+' ③ 横にはみ出さない・撮影／写真選択が見える・「現場登録」の見出しが見える・たたむボタンは出ない', g.over.length===0&&g.hb.every(Boolean)&&g.title&&!g.fv, {over:g.over,hb:g.hb,title:g.title,fv:g.fv});
  let pk=0; await p.evaluate(()=>{ window._pk=0; document.getElementById('dbPickIn').addEventListener('click',()=>{ window._pk++; },{once:true}); const b=document.querySelector('#dbLsEmpty button.sub'); b&&b.click(); }); pk=await p.evaluate(()=>window._pk);
  ok(nm+' ④ 写真なし：右に見本の絵（§670）と大きなボタン2つ（写真選択で写真選択が開く）', g.ls&&g.lsBtns===2&&pk===1&&g.prevIn==='dbLsEmpty'&&g.prevVis, {ls:g.ls,lsBtns:g.lsBtns,pk,prevIn:g.prevIn,prevVis:g.prevVis});
  /* ⑤ 写真あり */
  const mk=async(col)=>{ const d=await p.evaluate((col)=>{const c=document.createElement('canvas');c.width=800;c.height=600;const x=c.getContext('2d');x.fillStyle=col;x.fillRect(0,0,800,600);return c.toDataURL('image/png');},col); return {name:'a.png',mimeType:'image/png',buffer:Buffer.from(d.split(',')[1],'base64')}; };
  await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(400);
  await p.setInputFiles('#dbPickIn',[await mk('#c84'),await mk('#48c'),await mk('#8a4')]);
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length>=3,null,{timeout:10000}); }catch(e){} await p.waitForTimeout(700);
  /* 現場名を入れた直後（欄に指が残ったまま）に□を押す */
  await p.focus('#dbSite'); await p.type('#dbSite','X'); await p.keyboard.press('Backspace');
  const g5a=await geo();
  await p.locator('#dbGrid .tile .ck').first().click(); await p.waitForTimeout(700);
  const g5b=await geo(); const sel=await p.evaluate(()=>({n:document.getElementById('dbSelN').textContent, part:getComputedStyle(document.getElementById('dbBPart')).display, pos:getComputedStyle(document.getElementById('dbBatch')).position}));
  ok(nm+' ⑤ 選んでいないと「まとめて付ける」は1行（50px 以下）・現場名を入れた直後に□を押しても選べる・選ぶと部位の欄が出て上に貼り付く', g5a.sbVis&&g5a.sb.h<=50&&/^1枚/.test(sel.n)&&sel.part!=='none'&&sel.pos==='sticky', {sb:g5a.sb,sel});
  /* ⑥ 回す */
  await p.setViewportSize({width:H,height:W}); await p.evaluate(()=>window.dispatchEvent(new Event('resize'))); await p.waitForTimeout(900);
  const gp=await geo(); const prevP=gp.prevIn; const dirP=await p.evaluate(()=>getComputedStyle(document.querySelector('#dbv .dbw')).display);
  await p.setViewportSize({width:W,height:H}); await p.evaluate(()=>window.dispatchEvent(new Event('resize'))); await p.waitForTimeout(900);
  const gl=await geo(); const cv=await p.evaluate(()=>{ const c=document.getElementById('dbCv1'); return [c.width, Math.round(c.clientWidth*Math.min(3,Math.max(1,devicePixelRatio||1)))]; });
  ok(nm+' ⑥ 縦→横に回すと形が切り替わる（縦は1列・見本は左の設定の中／横は2列・見本は右の列）・見本はその画面の細かさで描き直す', dirP!=='flex'&&prevP==='dbSideIn'&&gl.side.r<=gl.main.l&&gl.prevIn==='dbLsEmpty'&&cv[0]>=cv[1]*0.95, {dirP,prevP,prevL:gl.prevIn,side:gl.side,main:gl.main,cv});
  ok(nm+' ⑦ pageerror 0', errs.length===0, errs);
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  await p.close(); } }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,200)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
