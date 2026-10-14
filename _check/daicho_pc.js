/* ★2026-10-13zn 写真台帳：PC 版の左の欄・戻るボタン・出力ボタン（本人の付箋・§679）
   画面 2000×1040 と 1440×900 で：
   ① 「現場登録」の見出しが左の欄の上にあり、「記録帳から引用」はその行（重ならない）
   ② 戻るボタンは他のページ（仕様・材料）の戻るボタンと同じ大きさ（±1px）
   ③ 現場名の入力欄は1行まるごと・28文字の現場名が全部見える（入力欄から離れたとき）
   ④ 黒板と色が同じ行・位置と日付の表記が同じ行・どちらの選択欄も欄の半分以下・「日付の表記」は1行
   ⑤ 「印刷・PDF／Excel／送る／確認」は上の緑の帯の右端（下の帯ではない）・手順の表示と重ならない・画面の中
   ⑥ 左の欄の部品が欄からはみ出さず、互いに重ならない（× と入力欄・見出しの行と引用の組は除く）
   ⑦ pageerror 0
   ⑧ 左下の見本・一覧の写真の絵は、画面に写る大きさ（拡大後×画素の細かさ）以上の細かさ（§681）
   直す前の版では ①〜⑤ が★NG。  使い方: node _check/daicho_pc.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const SITE='サン太平レジデンス 大規模修繕（屋上・バルコニー防水）';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [W,H] of [[2000,1040],[1440,900]]){ const nm=W+'×'+H;
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:W===2000?1.5:1});   /* 2000 幅は画素の細かい画面（1.5倍）も兼ねる */ const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} });
  await p.goto('http://localhost:8899/shiyo_toroku.html'); await p.waitForTimeout(1200);
  const ref=await p.evaluate(()=>{ const i=document.querySelector('header .nn-back img'), r=i.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)}; });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600);
  await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(400);
  const g=await p.evaluate(()=>{ const q=s=>document.querySelector(s), R=e=>{ if(!e) return null; const r=e.getBoundingClientRect(); return {l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height),m:Math.round(r.top+r.height/2)}; };
    const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
    const side=q('#dbSide'), sR=side.getBoundingClientRect(), cs=getComputedStyle(side), z=sR.width/side.offsetWidth;
    const inner={l:sR.left+(parseFloat(cs.paddingLeft)+parseFloat(cs.borderLeftWidth))*z, r:sR.right-(parseFloat(cs.paddingRight)+parseFloat(cs.borderRightWidth))*z};
    const els=[...side.querySelectorAll('input,select,button,.sw,.httl')].filter(vis);
    const out=els.filter(e=>{ const r=e.getBoundingClientRect(); return r.left<sR.left-1||r.right>sR.right+1; }).map(e=>e.id||e.className);
    const ov=[]; for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){ const a=els[i], c=els[j]; if(a.contains(c)||c.contains(a)) continue; const ids=[a.id,c.id].sort().join(); if(ids==='dbSite,dbSiteClr'||ids==='dbFold,dbFromBk') continue;
      const A=a.getBoundingClientRect(), C=c.getBoundingClientRect(), x=Math.min(A.right,C.right)-Math.max(A.left,C.left), y=Math.min(A.bottom,C.bottom)-Math.max(A.top,C.top); if(x>1&&y>1) ov.push((a.id||a.className)+'×'+(c.id||c.className)); }
    const hd=q('#dbv .dbh').getBoundingClientRect(), btns=['dbPrintBtn','dbXlsBtn','dbShare','dbSave'].map(id=>R(q('#'+id))), st=R(q('#dbSteps')), cw=document.documentElement.clientWidth;
    const site=q('#dbSite'), lab=q('#dbEra').closest('label'), lfs=parseFloat(getComputedStyle(lab).fontSize)*z;
    return {inner:{l:Math.round(inner.l),r:Math.round(inner.r)}, side:R(side), httl:R(q('#dbFold .httl')), httlVis:vis(q('#dbFold .httl')), bk:R(q('#dbFromBk')), back:R(q('#dbBack img')),
      site:R(site.closest('.sitein')||site), siteFit:site.scrollWidth<=site.clientWidth+1, on:R(q('#dbBoardOn')), col:R(q('#dbColor')), pos:R(q('#dbPos')), era:R(q('#dbEra')), eraLab:R(lab), lfs,
      eraTxt:(lab.innerText||'').replace(/\s/g,''), hd:{t:Math.round(hd.top),b:Math.round(hd.bottom)}, btns, st, cw, out, ov}; });
  const half=(g.inner.r-g.inner.l)/2;
  ok(nm+' ① 「現場登録」の見出しが欄の上・「記録帳から引用」はその行（重ならない）', g.httlVis&&g.httl.t-g.side.t<=20&&Math.abs(g.bk.m-g.httl.m)<=6&&g.bk.l>=g.httl.r, {httl:g.httl,bk:g.bk,side:g.side});
  ok(nm+' ② 戻るボタンは他のページと同じ大きさ（±1px）', Math.abs(g.back.h-ref.h)<=1&&Math.abs(g.back.w-ref.w)<=1, {back:g.back,ref});
  ok(nm+' ③ 現場名の入力欄は1行まるごと・28文字の現場名が全部見える', g.site.l-g.inner.l<=2&&g.inner.r-g.site.r<=2&&g.siteFit, {site:g.site,inner:g.inner,fit:g.siteFit});
  ok(nm+' ④ 黒板と色・位置と日付の表記が同じ行・選択欄は欄の半分以下・「日付の表記」は1行', Math.abs(g.on.m-g.col.m)<=3&&Math.abs(g.pos.m-g.era.m)<=3&&g.on.w<=half&&g.era.w<=half&&g.eraTxt.startsWith('日付の表記')&&g.eraLab.h<=g.lfs*1.6+20, {on:g.on,col:g.col,pos:g.pos,era:g.era,half,eraLab:g.eraLab});
  const bOk=g.btns.every(x=>x&&x.t>=g.hd.t&&x.b<=g.hd.b&&x.r<=g.cw)&&g.btns[3].r>=g.cw-40&&g.btns[0].l>=g.st.r-2;
  ok(nm+' ⑤ 出力ボタン4つは上の帯の右端（手順の表示と重ならない・画面の中）', bOk, {btns:g.btns,hd:g.hd,st:g.st,cw:g.cw});
  ok(nm+' ⑥ 左の欄の部品がはみ出さず、重ならない', g.out.length===0&&g.ov.length===0, {out:g.out,ov:g.ov});
  /* ⑧ ★§681 左下の見本・一覧の写真の絵は、画面に写る大きさ（拡大後×画素の細かさ）以上で描く（本人「左下の画像の画質が悪い」） */
  const c8=await p.evaluate(()=>document.getElementById('dbCv1').toDataURL('image/png'));
  await p.setInputFiles('#dbPickIn',[{name:'pc8.png',mimeType:'image/png',buffer:Buffer.from(c8.split(',')[1],'base64')}]); try{ await p.waitForFunction(()=>document.querySelector('#dbGrid .tile canvas'),null,{timeout:10000}); }catch(e){} await p.waitForTimeout(1500);
  const t8=await p.evaluate(()=>{ const f=c=>{ if(!c) return null; const r=c.getBoundingClientRect(); return {canvas:c.width, shown:Math.round(r.width*devicePixelRatio)}; }; return {sample:f(document.getElementById('dbCv1')), tile:f(document.querySelector('#dbGrid .tile canvas'))}; });
  ok(nm+' ⑧ 左下の見本・一覧の写真の絵は、画面に写る大きさ以上の細かさ', !!t8.sample&&!!t8.tile&&t8.sample.canvas>=t8.sample.shown-1&&t8.tile.canvas>=t8.tile.shown-1, t8);
  await p.evaluate(async(S)=>{ const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===S)); },SITE);
  ok(nm+' ⑦ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
