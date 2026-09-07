/* ★2026-09-07 夜間巡回：見切れ（画面から出る・箱から出る・上に何かが乗って押せない）
   本人の指示「今日の夜間巡回は、見切れや誤作動をメインに実施してください」

   ① ページが横にずれる（隠した引き出しなどで幅が広がっていないか）
   ② 画面の外に出ている「押せる部品」が無いか（左右・下）
   ③ 文字が箱に入りきらず切れていないか（…でも送りでもない、ただ切れているもの）
   ④ ボタンの真ん中を指したとき、本当にそのボタンが取れるか（上に何かが乗っていないか）

   使い方: node _check/mikire.js            （全11ページ×PC/たて/よこ）
           node _check/mikire.js <file>     （1ページだけ）            */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const mkland=require('./mkland');
const ALL=['index.html','kirokucho_demo.html','zumen_sekisan.html','camera.html','genba_map_v36.html',
  'hacchu.html','kokkosho.html','library.html','shiyo_toroku.html','yougo.html','zairyo_toroku.html'];
const PAGES=process.argv[2]?[process.argv[2]]:ALL;
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

const PROBE=()=>{
  const R={over:[], clip:[], covered:[], float:[]};
  const de=document.documentElement;
  const VW=de.clientWidth, VH=de.clientHeight;
  const vis=el=>{ const s=getComputedStyle(el);
    return s.display!=='none' && s.visibility!=='hidden' && +s.opacity>0.05; };
  const name=el=>(el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'')+'<'+el.tagName.toLowerCase()+'>';
  /* ② 押せる部品が画面の外に出ていないか */
  const HIT='button,a[href],select,input,summary,[role="button"],[onclick]';
  [...document.querySelectorAll(HIT)].forEach(el=>{
    if(!vis(el)) return;
    const r=el.getBoundingClientRect();
    if(r.width<4||r.height<4) return;
    /* 除くもの：①画面の外へ隠した引き出し ②横に送れる帯の中（送れば見える＝見切れではない） */
    let p=el.parentElement, hidden=false;
    while(p&&p!==document.body){ const s=getComputedStyle(p); const pr=p.getBoundingClientRect();
      if(/hidden|auto|scroll/.test(s.overflowX+s.overflowY)){
        if(r.right<pr.left-1||r.left>pr.right+1||r.bottom<pr.top-1||r.top>pr.bottom+1) hidden=true; }
      /* 横に送れる帯（中身が箱より広い）＝指で送れば見えるので数えない */
      if(/auto|scroll/.test(s.overflowX) && p.scrollWidth>p.clientWidth+2) hidden=true;
      if(/auto|scroll/.test(s.overflowY) && p.scrollHeight>p.clientHeight+2) hidden=true;
      if(s.transform!=='none' && pr.width<2) hidden=true;
      p=p.parentElement; }
    if(hidden) return;
    const outR=r.right-VW, outL=-r.left, outB=r.bottom-VH;
    if(outR>2||outL>2) R.over.push({el:name(el), right:+outR.toFixed(1), left:+outL.toFixed(1), txt:(el.textContent||'').trim().slice(0,14)});
  });
  /* ③ 文字が箱から切れている（送りでも … でもない） */
  [...document.querySelectorAll('button,label,th,td,li,b,span,div')].forEach(el=>{
    if(el.children.length) return;
    const t=(el.textContent||'').trim(); if(t.length<2) return;
    if(!vis(el)) return;
    const rr=el.getBoundingClientRect();
    /* ★画面に映っていないものは見切れではない（後回しのカードはまだ字を詰めていない） */
    if(rr.bottom<0||rr.top>VH||rr.right<0||rr.left>VW) return;
    const s=getComputedStyle(el);
    if(s.overflow==='visible') return;                 /* はみ出して見えるなら切れていない */
    if(/auto|scroll/.test(s.overflowX)) return;        /* 横に送れる */
    if(s.textOverflow==='ellipsis') return;            /* … で切るのは意図 */
    if(el.scrollWidth>el.clientWidth+2 && el.clientWidth>8)
      R.clip.push({el:name(el), txt:t.slice(0,18), need:el.scrollWidth, has:el.clientWidth});
  });
  /* ④ ボタンの真ん中を指したとき、そのボタン（かその中身）が取れるか
     ・上に乗っているのが「浮かせた部品（position:fixed）」なら参考どまり
       （下部ナビ・案内など。5秒で隠れるものもある）
     ・そうでない重なりは、ほぼ確実に不具合 */
  const fixedUp=el=>{ let q=el; while(q&&q!==document.body){ if(getComputedStyle(q).position==='fixed') return q; q=q.parentElement; } return null; };
  [...document.querySelectorAll(HIT)].forEach(el=>{
    if(!vis(el)) return;
    const r=el.getBoundingClientRect();
    if(r.width<10||r.height<10) return;
    const x=r.left+r.width/2, y=r.top+r.height/2;
    if(x<0||y<0||x>VW||y>VH) return;
    /* 数えないもの：①送れる箱の中で見えていない位置　②画面の外へ寄せてある引き出しの中 */
    let q=el.parentElement, out=false;
    while(q&&q!==document.body){ const s=getComputedStyle(q);
      if(/auto|scroll|hidden/.test(s.overflowX+s.overflowY)){ const qr=q.getBoundingClientRect();
        if(x<qr.left-1||x>qr.right+1||y<qr.top-1||y>qr.bottom+1) out=true; }
      const m=s.transform;
      if(m&&m!=='none'){ const v=m.match(/matrix\(([^)]+)\)/);
        if(v){ const a2=v[1].split(',').map(Number);
          if(Math.abs(a2[4])>20||Math.abs(a2[5])>20) out=true; } }
      q=q.parentElement; }
    if(out) return;
    const t=document.elementFromPoint(x,y);
    if(!t) return;
    if(t===el||el.contains(t)||t.contains(el)) return;
    if(t.closest&&t.closest(HIT)===el) return;
    const rec={el:name(el), by:name(t), txt:(el.textContent||'').trim().slice(0,14)};
    if(fixedUp(t) && !fixedUp(el)) R.float.push(rec); else R.covered.push(rec);
  });
  return R;
};

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const f of PAGES){
    console.log('== '+f);
    const land=await mkland(f);                          /* よこ向き＝ノッチ59pxを入れたコピー */
    for(const [tag,vp,file,phone] of [
        ['PC   ',{width:1600,height:900}, f, false],
        ['たて ',{width:393,height:852},  f, true],
        ['よこ ',{width:852,height:393},  land, true]]){
      const ctx=await b.newContext({viewport:vp, deviceScaleFactor:phone?2:1, isMobile:phone, hasTouch:phone});
      const p=await ctx.newPage();
      const errs=[]; p.on('pageerror',e=>errs.push(e.message));
      if(phone) await p.addInitScript(()=>{ Object.defineProperty(window.screen,'width',{get:()=>393});
        Object.defineProperty(window.screen,'height',{get:()=>852}); });
      await p.goto('http://127.0.0.1:8899/'+file);
      await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
      await p.waitForTimeout(2600);
      /* ① ページが横にずれないか（本当に動かせるか＋幅そのもの） */
      const sx=await p.evaluate(()=>{ const x0=scrollX; scrollTo(9999,0); const x=scrollX; scrollTo(x0,0);
        const de=document.documentElement; return {moved:x, extra:de.scrollWidth-de.clientWidth}; });
      ok(sx.moved<=1 && sx.extra<=2, tag+'① 横にずれない・ページの幅が広がらない', sx);
      let R=await p.evaluate(PROBE);
      await p.waitForTimeout(800);
      const R2=await p.evaluate(PROBE);          /* ★2回とも出たものだけ数える（§320） */
      const key=x=>x.el+'|'+(x.txt||'');
      const set=new Set(R2.over.map(key).concat(R2.clip.map(key)).concat(R2.covered.map(key)));
      R={over:R.over.filter(x=>set.has(key(x))), clip:R.clip.filter(x=>set.has(key(x))),
         covered:R.covered.filter(x=>set.has(key(x))), float:R.float};
      ok(R.over.length===0, tag+'② 画面の外に出ている押せる部品なし', R.over.slice(0,4));
      ok(R.clip.length===0, tag+'③ 文字が箱から切れていない', R.clip.slice(0,4));
      ok(R.covered.length===0, tag+'④ ボタンの真ん中を指すとそのボタンが取れる', R.covered.slice(0,4));
      if(R.float.length) console.log('     （参考）浮かせた部品が上にある：'+JSON.stringify(R.float.slice(0,3)));
      ok(errs.length===0, tag+'JSエラーなし', errs.slice(0,2));
      await ctx.close();
    }
  }
  console.log(ng?('--- ★NG '+ng+' 件 ---'):'全部○');
  await b.close();
})();
