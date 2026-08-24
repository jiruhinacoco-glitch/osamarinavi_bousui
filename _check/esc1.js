/* 打ち込んだ文字（現場名・住所・元請・メモ・屋根の名前など）を画面に出すとき、
   逃がさずにそのまま入れていないか。
   ★「A&B工務店」のような社名や、メモに < を書いただけで
     カードや吹き出しの後ろが丸ごと消える（実際に全ページで起きていた）。
   ★確かめ方：値を「絵を読み込めなかったら印を立てる」札に置き換え、
     画面に出したあとで印が立ったかを見る。立てば、逃がしそこねている。
   使い方： node _check/esc1.js                                              */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EVIL='<img src=x onerror=window.__pwn=1 class=NNPWN>';
let NG=0;
const say=(ok,label,extra)=>{ if(!ok)NG++; console.log((ok?'○   ':'★NG ')+label.padEnd(30)+(extra||'')); };
const where=()=>[...document.querySelectorAll('img.NNPWN')].slice(0,3).map(e=>{
  let u=e,pp=[]; for(let i=0;i<4&&u;i++){ pp.push(typeof u.className==='string'&&u.className?u.className:u.tagName); u=u.parentElement; }
  return pp.join(' < '); });

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

/* ── 現場記録帳：一覧・詳細・ダッシュボード・工程表・絞り込みメニュー ── */
for(const [label,fn] of [
  ['記録帳 一覧',      `()=>{ showView('list'); }`],
  ['記録帳 詳細',      `()=>{ selectedId=props[0].id; openDetailFull(); }`],
  ['記録帳 ダッシュ',  `()=>{ dashDirty=true; showView('dash'); }`],
  ['記録帳 工程表(全体)',`()=>{ showView('zentai'); }`],
  ['記録帳 工程表(自社)',`()=>{ showView('jisha'); }`],
  ['記録帳 絞り込み',  `()=>{ showView('list'); const c=document.querySelector('#chips .stchip'); if(c)c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); }`],
  ['記録帳 新規登録の窓', `()=>{ openModal(); }`],
  ['記録帳 編集の窓',   `()=>{ openModal(props[0].id); }`],
]){
  const p=await b.newPage({viewport:{width:1500,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,50)));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1400);
  await p.evaluate(EV=>{ props.forEach(x=>{
      ['name','addr','moto','tb','spec','maker','kind','tantou','shiire','ko','hou','kouhou','area','no','kizon','kouzou','kbn','un'].forEach(k=>{ if(k in x) x[k]=EV; });
      if(Array.isArray(x.roofs)) x.roofs.forEach(r=>{ r.n=EV; });
      if(Array.isArray(x.jinku)) x.jinku.forEach(r=>{ r.memo=EV; });
      if(Array.isArray(x.extras)) x.extras.forEach(r=>{ r.content=EV; r.tantou=EV; });
    }); }, EVIL);
  await p.evaluate(s=>{ try{ (0,eval)('('+s+')')(); }catch(e){ window.__err=e.message; } }, fn);
  await p.waitForTimeout(1100);
  const r=await p.evaluate(w=>({pwn:!!window.__pwn, err:window.__err||'', at:(0,eval)('('+w+')')()}), where.toString());
  say(!r.pwn && !r.err && !errs.length, label, r.pwn?('逃がしそこね '+JSON.stringify(r.at)):(r.err||errs[0]||''));
  await p.close();
}

/* ── 図面・積算：屋根の名前 ── */
{ const p=await b.newPage({viewport:{width:1500,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,50)));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500);
  await p.evaluate(()=>{try{nnZMenuClose(); loadSample();}catch(_){}});
  await p.evaluate(EV=>{ state.polys.forEach(x=>{x.name=EV;});
    saveState(); draw(); recalc(); renderPolyList();
    try{ nnRoofTbl(true); }catch(_){}
    try{ sel={p:0,r:-1,e:0}; renderEdgeEdit(); }catch(_){}
    try{ setTab('wari'); setTab('zu'); }catch(_){}
  }, EVIL);
  await p.waitForTimeout(1100);
  const r=await p.evaluate(w=>({pwn:!!window.__pwn, at:(0,eval)('('+w+')')()}), where.toString());
  say(!r.pwn && !errs.length, '図面 屋根の名前', r.pwn?('逃がしそこね '+JSON.stringify(r.at)):(errs[0]||''));
  await p.close(); }

/* ── 現場マップ：現場名・住所・工法 ── */
{ const p=await b.newPage({viewport:{width:1500,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,50)));
  await p.goto('http://localhost:8899/genba_map_v36.html'); await p.waitForTimeout(1600);
  await p.evaluate(EV=>{ try{ document.getElementById('setup').style.display='none'; }catch(_){}
    if(typeof SITES!=='undefined') SITES.forEach(s=>{ s.name=EV; s.addr=EV; s.method=EV; });
    try{ renderList(); selId=SITES[0].id; renderList(); }catch(e){ window.__err=e.message; } }, EVIL);
  await p.waitForTimeout(1000);
  const r=await p.evaluate(w=>({pwn:!!window.__pwn, err:window.__err||'', at:(0,eval)('('+w+')')()}), where.toString());
  say(!r.pwn && !r.err, '現場マップ 現場名', r.pwn?('逃がしそこね '+JSON.stringify(r.at)):(r.err||''));
  await p.close(); }

/* ── 発注・ライブラリ・材料・仕様・用語・ホーム ── */
for(const [f,label,fn] of [
 ['hacchu.html','発注 現場名', `EV=>{ if(typeof GENBA!=='undefined')GENBA.forEach(g=>{g.name=EV;g.moto=EV;g.spec=EV;g.un=EV;});
    if(typeof VENDORS!=='undefined')VENDORS.forEach(v=>{v.name=EV;});
    if(typeof render==='function')render(); }`],
 ['zairyo_toroku.html','材料登録', `EV=>{ if(typeof items!=='undefined')items.push({id:'x',name:EV,maker:EV,memo:EV,price:100,unit:EV});
    if(typeof render==='function')render(); }`],
 ['shiyo_toroku.html','仕様登録', `EV=>{ if(typeof mySpecs!=='undefined')mySpecs.push({id:'x',code:EV,name:EV,cat:EV,memo:EV,layers:[]});
    if(typeof render==='function')render(); }`],
 ['library.html','ライブラリ', `EV=>{ if(typeof userItems!=='undefined')userItems.push({id:'x',title:EV,note:EV,tags:[EV],bui:[EV],cat:EV,ko:EV,part:EV,
      kou:EV,kbn:EV,share:EV,caution:[EV],date:'2026-08-24',reuse:0});
    const c=document.querySelector('#grid,#list,main'); if(typeof renderGrid==='function')renderGrid(c); }`],
 ['index.html','客先登録', `EV=>{ try{ localStorage.setItem('nn_tokui_v1', JSON.stringify(
    {moto:[{id:'a',co:EV,tanto:EV,tel:EV,memo:EV}],shiire:[{id:'b',co:EV,tanto:EV,memo:EV}]})); }catch(_){}
    if(typeof load==='function'&&typeof DB!=='undefined'){ DB=load(); }
    if(typeof nnTokuiOpen==='function')nnTokuiOpen(); }`],
]){
  const p=await b.newPage({viewport:{width:1500,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,50)));
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/'+f); await p.waitForTimeout(1500);
  await p.evaluate(([s,EV])=>{ try{ (0,eval)('('+s+')')(EV); }catch(e){ window.__err=e.message; } },[fn,EVIL]);
  await p.waitForTimeout(900);
  const r=await p.evaluate(w=>({pwn:!!window.__pwn, err:window.__err||'', at:(0,eval)('('+w+')')()}), where.toString());
  say(!r.pwn && !r.err && !errs.length, label, r.pwn?('逃がしそこね '+JSON.stringify(r.at)):(r.err||errs[0]||''));
  await p.close();
}
await b.close(); console.log('★NG'+NG);
})();
