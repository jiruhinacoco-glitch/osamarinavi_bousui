/* 標準納まり詳細図（2026-08-19e）
   ★版d・eの失敗＝「要素が在るか」しか見ていなかった。
     ここでは「読めるか」を数値で見る：図の大きさ・文字の大きさ・
     引出線が図を横断していないか・図枠からはみ出していないか。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

ok(await p.evaluate(()=>!!document.getElementById('nnDetBtn')),'積算・設定に「標準納まり詳細図」のボタンがある');
ok(await p.evaluate(()=>!!(window.nnSheetKit&&nnSheetKit.mk&&nnSheetKit.openSheet)),'図面の部品（用紙・図枠）が共有されている');
/* 入口：いま描いている図面から初期値を拾う */
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();}); await p.waitForTimeout(800);
await p.evaluate(()=>nnDetailOpen()); await p.waitForTimeout(400);
const pre=await p.evaluate(()=>({sp:document.getElementById('nd_sp').options.length,
  spv:document.getElementById('nd_sp').value, h:+document.getElementById('nd_h').value}));
ok(pre.sp>=4&&!!pre.spv,'工法を選べる（層構成が自動で入る）',pre);
ok(pre.h>=150&&pre.h<=2000,'立上りHの初期値が図面から入る（mm）',pre.h);
await p.evaluate(()=>{const b=document.getElementById('nd_cl'); if(b)b.click();});

for(const [kind,name] of [['osae','押え金物'],['kasagi','アルミ笠木'],['sheet','シート端末']]){
  const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(k=>nnDetailPDF(k,{}),kind)]);
  await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(600);
  const r=await pop.evaluate(()=>{
    const svg=document.querySelector('svg');
    const PW=420, PH=297;
    /* ★<defs> の中（ハッチの型）は図ではないので数えない（版fで誤検知した） */
    const els=[...svg.querySelectorAll('path,line,rect,circle,text')].filter(e=>!e.closest('defs'));
    /* 図の本体＝ハッチで塗った path の bbox */
    let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
    svg.querySelectorAll('path[fill^="url(#h"]').forEach(e=>{
      const b=e.getBBox(); bx0=Math.min(bx0,b.x); by0=Math.min(by0,b.y);
      bx1=Math.max(bx1,b.x+b.width); by1=Math.max(by1,b.y+b.height);
    });
    /* 引出線（#333 の細線）が「材料の中」を通る長さ。
       ★bbox ではなく実際の形（isPointInFill）で見る。図の上辺に沿って走る線まで
         数えてしまうと、見た目に問題の無い引出線を落としてしまう。 */
    const solids=[...svg.querySelectorAll('path[fill^="url(#h"]')];
    const pt=svg.createSVGPoint();
    const inside=(x,y)=>{ pt.x=x; pt.y=y;
      for(const s of solids){ try{ if(s.isPointInFill(pt)) return true; }catch(_){} }
      return false; };
    let worst=0, leads=0;
    [...svg.querySelectorAll('line[stroke="#333"]')].filter(e=>!e.closest('defs')).forEach(e=>{
      const x1=+e.getAttribute('x1'),y1=+e.getAttribute('y1'),x2=+e.getAttribute('x2'),y2=+e.getAttribute('y2');
      leads++;
      const N=40; let cnt=0;
      for(let i=0;i<N;i++){ const t=(i+0.5)/N; if(inside(x1+(x2-x1)*t, y1+(y2-y1)*t)) cnt++; }
      worst=Math.max(worst, Math.hypot(x2-x1,y2-y1)*cnt/N);
    });
    /* 図枠からのはみ出し */
    let over=0;
    els.forEach(e=>{ let b; try{ b=e.getBBox(); }catch(_){ return; }
      if(b.width>PW*0.98) return;
      over=Math.max(over, 8-b.x, 8-b.y, b.x+b.width-(PW-8), b.y+b.height-(PH-8));
    });
    const txt=[...svg.querySelectorAll('text')];
    const sizes=txt.map(e=>+e.getAttribute('font-size'));
    const T=txt.map(e=>e.textContent).join('|');
    const scM=(T.match(/S=1\/(\d+)/)||[])[1];
    return {bw:bx1-bx0, bh:by1-by0, worst:worst, leads:leads, over:over,
      minSz:Math.min.apply(null,sizes), dimSz:Math.max.apply(null,sizes.filter((v,i)=>/^\(?\d+\)?$/.test(txt[i].textContent))||[0]),
      sc:+scM, T:T, dots:svg.querySelectorAll('circle[r="0.7"]').length,
      pat:[...new Set([...svg.querySelectorAll('[fill^="url(#h"]')].map(e=>e.getAttribute('fill')))].length};
  });
  const area=100*(r.bw*r.bh)/(420*297);
  ok(r.sc<=2, name+'：縮尺が 1/2 以上（納まりが読める大きさ）', '1/'+r.sc);
  ok(area>=25, name+'：図が紙の主役（面積 '+area.toFixed(0)+'%）', {w:Math.round(r.bw),h:Math.round(r.bh)});
  ok(r.over<=0.6, name+'：図枠からのはみ出しなし', r.over.toFixed(2));
  ok(r.worst<=70, name+'：引出線が図を長く横断しない（最長 '+r.worst.toFixed(0)+'mm）', {本数:r.leads});
  ok(r.minSz>=2.5, name+'：いちばん小さい文字が 2.5mm 以上', r.minSz);
  ok(r.dimSz>=4.0, name+'：寸法の数値が 4.0mm 以上', r.dimSz);
  ok(r.pat>=4, name+'：材料ごとにハッチを使い分けている', r.pat);
  ok(r.dots>=14, name+'：寸法の端が●', r.dots);
  ok(/凡　例/.test(r.T)&&/層構成/.test(r.T)&&/注　記/.test(r.T), name+'：凡例・層構成・注記が入る');
  ok(/水上300以上/.test(r.T), name+'：記号寸法 H（水上300以上）');
  await pop.close();
}
/* 寸法が実物のmmであること */
const [pop2]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>nnDetailPDF('osae',{H:500,tw:200,cant:70,ins:50}))]);
await pop2.waitForLoadState('domcontentloaded'); await pop2.waitForTimeout(600);
const T2=await pop2.evaluate(()=>[...document.querySelectorAll('svg text')].map(e=>e.textContent).join('|'));
ok(/(^|\|)500(\||$)/.test(T2),'H=500 が実物の mm で出る');
ok(/\(200\)/.test(T2)&&/\(70\)/.test(T2)&&/\(50\)/.test(T2),'躯体200・キャント70・断熱50 が出る');
await pop2.close();
ok(errs.length===0,'JSエラーなし',errs);
await b.close(); process.exit(ng?1:0);
})();
