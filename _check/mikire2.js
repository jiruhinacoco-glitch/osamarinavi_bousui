/* ★2026-09-07 夜間巡回その2：画面を「開いた先」の見切れ
   mikire.js は最初の画面しか見ない。実際に困るのは、タブを切り替えたり
   窓を開いたりした先。ここでは主な画面を実際に開いてから同じ検査をする。
   使い方: node _check/mikire2.js  ／ node _check/mikire2.js <file> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const mkland=require('./mkland');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

/* 開き方：[名前, ページの中で走らせる処理] */
const STATES={
 'kirokucho_demo.html':[
   ['ダッシュボード', ()=>showView('dashboard')],
   ['現場一覧',       ()=>showView('list')],
   ['施工中（すべて）',()=>showView('zentai')],
   ['施工中（自社）', ()=>showView('jisha')],
   ['物件の詳細',     ()=>{ showView('list'); selectedId=props[0].id; openDetailFull(); }],
   ['新規物件の窓',   ()=>{ showView('list'); openModal(); }],
   ['タグの編集',     ()=>{ showView('list'); nnDefOpen(props[0].id); }],
 ],
 'zumen_sekisan.html':[
   ['入口メニュー',   ()=>{ try{nnZMenuOpen();}catch(_){ } }],
   ['平面図',         ()=>{ nnZMenuClose(); setTab('zu'); }],
   ['断面図',         ()=>{ nnZMenuClose(); setTab('sec'); }],
   ['3D投影',         ()=>{ nnZMenuClose(); setTab('d3'); }],
   ['積算・設定',     ()=>{ nnZMenuClose(); setTab('zu'); nnSidePanel&&nnSidePanel(true); }],
   ['操作方法',       ()=>{ nnZMenuClose(); nnHelpOpen&&nnHelpOpen(); }],
 ],
 'hacchu.html':[
   ['発注作成',       ()=>{ const b=document.getElementById('tab-new'); b&&b.click(); }],
   ['発注履歴',       ()=>{ const b=document.getElementById('tab-hist'); b&&b.click(); }],
 ],
 'kokkosho.html':[
   ['新築',           ()=>{ const b=document.getElementById('tab-shin'); b&&b.click(); }],
   ['改修',           ()=>{ const b=document.getElementById('tab-kai'); b&&b.click(); }],
 ],
 'library.html':[
   ['一覧',           ()=>{}],
   ['詳細',           ()=>{ const r=document.querySelector('#grid .lr2'); r&&r.click(); }],
 ],
 'shiyo_toroku.html':[
   ['一覧',           ()=>{}],
   ['詳細',           ()=>{ const r=document.querySelector('.sp-row,.slist .row,.list .row'); r&&r.click(); }],
 ],
 'zairyo_toroku.html':[
   ['一覧',           ()=>{}],
   ['詳細',           ()=>{ const r=document.querySelector('.m-row,.mlist .row,.list .row'); r&&r.click(); }],
 ],
 'yougo.html':[
   ['用語集',         ()=>{}],
   ['現場フレーズ',   ()=>{ const b=[...document.querySelectorAll('button')].find(x=>/現場フレーズ/.test(x.textContent||'')); b&&b.click(); }],
 ],
 'camera.html':[
   ['入口',           ()=>{}],
   ['納まり資料作成', ()=>{ try{ nnEntryPick('shiryo'); }catch(_){ const c=document.querySelector('.nnEnCard'); c&&c.click(); } }],
 ],
 'index.html':[
   ['ホーム',         ()=>{}],
   ['設定（保存）',   ()=>{ try{ nnDataOpen(); }catch(_){ } }],
   ['客先登録',       ()=>{ try{ nnTokuiOpen(); }catch(_){ } }],
 ],
};
const PAGES=process.argv[2]?[process.argv[2]]:Object.keys(STATES);

const PROBE=()=>{
  const R={over:[], clip:[]};
  const de=document.documentElement, VW=de.clientWidth, VH=de.clientHeight;
  const vis=el=>{ const s=getComputedStyle(el);
    return s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>0.05; };
  const name=el=>(el.id?'#'+el.id:'')+(typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'')+'<'+el.tagName.toLowerCase()+'>';
  const skip=el=>{ let p=el.parentElement;
    while(p&&p!==document.body){ const s=getComputedStyle(p), pr=p.getBoundingClientRect();
      const r=el.getBoundingClientRect();
      if(/hidden|auto|scroll/.test(s.overflowX+s.overflowY)&&
         (r.right<pr.left-1||r.left>pr.right+1||r.bottom<pr.top-1||r.top>pr.bottom+1)) return true;
      if(/auto|scroll/.test(s.overflowX)&&p.scrollWidth>p.clientWidth+2) return true;
      if(/auto|scroll/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+2) return true;
      const m=s.transform;
      if(m&&m!=='none'){ const v=m.match(/matrix\(([^)]+)\)/);
        if(v){ const a=v[1].split(',').map(Number); if(Math.abs(a[4])>20||Math.abs(a[5])>20) return true; } }
      p=p.parentElement; }
    return false; };
  [...document.querySelectorAll('button,a[href],select,input,summary,[role="button"],[onclick]')].forEach(el=>{
    if(!vis(el)) return; const r=el.getBoundingClientRect();
    if(r.width<4||r.height<4) return; if(skip(el)) return;
    const oR=r.right-VW, oL=-r.left;
    if(oR>2||oL>2) R.over.push({el:name(el), right:+oR.toFixed(1), left:+oL.toFixed(1), txt:(el.textContent||'').trim().slice(0,14)});
  });
  [...document.querySelectorAll('button,label,th,td,li,b,span,div')].forEach(el=>{
    if(el.children.length) return; const t=(el.textContent||'').trim(); if(t.length<2) return;
    if(!vis(el)) return;
    const rr=el.getBoundingClientRect();
    /* ★画面に映っていないものは見切れではない（後回しのカードはまだ字を詰めていない） */
    if(rr.bottom<0||rr.top>VH||rr.right<0||rr.left>VW) return;
    const s=getComputedStyle(el);
    if(s.overflow==='visible'||/auto|scroll/.test(s.overflowX)||s.textOverflow==='ellipsis') return;
    if(el.scrollWidth>el.clientWidth+2&&el.clientWidth>8)
      R.clip.push({el:name(el), txt:t.slice(0,18), need:el.scrollWidth, has:el.clientWidth});
  });
  return R;
};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of PAGES){
  console.log('== '+f);
  const land=await mkland(f);
  for(const [tag,vp,file] of [['たて ',{width:393,height:852},f],['よこ ',{width:852,height:393},land]]){
    const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{ Object.defineProperty(window.screen,'width',{get:()=>393});
      Object.defineProperty(window.screen,'height',{get:()=>852}); });
    await p.goto('http://127.0.0.1:8899/'+file);
    await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    await p.waitForTimeout(2400);
    for(const [nm,fn] of STATES[f]){
      await p.evaluate('(()=>{try{('+fn.toString()+')();}catch(e){}})()');
      await p.waitForTimeout(900);
      /* ★2回測って、両方に出たものだけ数える（§320）。
         後回しのカードは「出てから字を詰める」ので、出た直後の一瞬だけ
         はみ出して見える。それは自分で直るので見切れではない。 */
      let R=await p.evaluate(PROBE);
      await p.waitForTimeout(800);
      const R2=await p.evaluate(PROBE);
      const key=x=>x.el+'|'+x.txt;
      const set=new Set(R2.over.map(key).concat(R2.clip.map(key)));
      R={over:R.over.filter(x=>set.has(key(x))), clip:R.clip.filter(x=>set.has(key(x)))};
      const bad=R.over.length+R.clip.length;
      ok(bad===0, tag+nm, bad?{over:R.over.slice(0,3), clip:R.clip.slice(0,3)}:undefined);
    }
    ok(errs.length===0, tag+'JSエラーなし', errs.slice(0,2));
    await ctx.close();
  }
}
console.log(ng?('--- ★NG '+ng+' 件 ---'):'全部○');
await b.close();})();
